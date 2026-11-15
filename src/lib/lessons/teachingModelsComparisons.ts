import { pagePolicies, pageReplacementEngine } from "@/lib/experiments/pageReplacement";
import type { Model } from "./teachingModels";

const signedMin = -(2 ** 31);
const signedMax = 2 ** 31 - 1;
const unsignedModulus = 2 ** 32;
const unsignedMax = unsignedModulus - 1;
const fixed = (value: number) => Number(value.toFixed(3));

export const comparisonModels = {
  "merge-record-halves": {
    title: "逐步收取两个有序段",
    fields: [
      { label: "左半首键", initial: 2, min: 0, max: 9 },
      { label: "左半末键", initial: 4, min: 0, max: 9 },
      { label: "右半首键", initial: 2, min: 0, max: 9 },
      { label: "右半末键", initial: 3, min: 0, max: 9 },
      { label: "同键时先取", initial: 0, min: 0, max: 1, choices: [{ value: 0, label: "左半" }, { value: 1, label: "右半" }] },
    ],
    evaluate: ([a, b, c, d, preferRight]) => {
      const columns = ["位置", "取出记录", "来源", "已合并"];
      if (a > b || c > d) return { caption: "每一半须先按键排好。", columns, rows: [] };
      const left = [{ id: "A", key: a }, { id: "B", key: b }];
      const right = [{ id: "C", key: c }, { id: "D", key: d }];
      let i = 0;
      let j = 0;
      const output: string[] = [];
      const rows = Array.from({ length: left.length + right.length }, (_, step) => {
        const takeLeft = j === right.length ||
          (i < left.length && (left[i].key < right[j].key || (left[i].key === right[j].key && preferRight === 0)));
        const record = takeLeft ? left[i++] : right[j++];
        output.push(record.id);
        return [step + 1, `${record.id}(${record.key})`, takeLeft ? "左" : "右", output.join(" → ")];
      });
      return { caption: `合并顺序 ${output.join(" → ")}。`, columns, rows };
    },
  },
  "mglru-age-generations": {
    title: "观察哪些页被提到年轻代",
    fields: [
      { label: "扫描发现最近访问", initial: 1, min: 0, max: 2, choices: [
        { value: 0, label: "都未发现" }, { value: 1, label: "发现 A" }, { value: 2, label: "发现 A、B" },
      ] },
    ],
    evaluate: ([touched]) => {
      const initial = [3, 4, 5];
      const ages = initial.map((generation, i) => i < touched ? 5 : generation);
      const oldest = Math.min(...ages);
      const names = ["A", "B", "C"];
      const observed = [1, 2].slice(0, touched);
      const lru = pageReplacementEngine.run({
        goalLabel: "用固定引用顺序对照多代分组。", frameCount: 3, references: [1, 2, 3, ...observed, 4, 5],
      }).policies[pagePolicies.indexOf("LRU")];
      const evicted = lru.steps.slice(-2).map(({ evicted: page }) => page === null ? "—" : names[page - 1]);
      return {
        caption: `扫描后最老的有页代为 ${oldest}。下一轮序号推进到 6。精确 LRU 对照换出 ${evicted.join("、")}。`,
        columns: ["页", "原代", "扫描后代", "回收候选"],
        rows: ages.map((age, i) => [names[i], initial[i], age, age === oldest ? "同类最老" : "较年轻"]),
      };
    },
  },
  "snaplen-frame-budget": {
    title: "算出写入长度和可见负载",
    fields: [
      { label: "报告帧长（字节）", initial: 96, min: 54, max: 160 },
      { label: "快照上限（字节）", initial: 64, min: 1, max: 160 },
    ],
    evaluate: ([original, snaplen]) => {
      const captured = Math.min(original, snaplen);
      const headerBytes = 54;
      return {
        caption: `保存 ${captured} 字节。缺 ${original - captured} 字节。TCP 头${captured < headerBytes ? "不完整" : "完整"}。`,
        columns: ["字段", "字节数"],
        rows: [["报告帧长", original], ["文件中长度", captured], ["固定头部合计", headerBytes],
          ["可见 TCP 负载", Math.max(0, captured - headerBytes)], ["未保存尾部", original - captured]],
      };
    },
  },
  "constant-folding-integer": {
    title: "按目标语义试算常量",
    fields: [
      { label: "表达式规则", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "32 位有符号加法" }, { value: 1, label: "32 位无符号加法" }, { value: 2, label: "32 位有符号除法" },
      ] },
      { label: "左侧常量", initial: 2147483647, min: signedMin, max: unsignedMax },
      { label: "右侧常量", initial: 1, min: signedMin, max: unsignedMax },
    ],
    evaluate: ([operation, left, right]) => {
      const min = operation === 1 ? 0 : signedMin;
      const max = operation === 1 ? unsignedMax : signedMax;
      const valid = left >= min && left <= max && right >= min && right <= max;
      const columns = ["检查", "结果"];
      if (!valid) return { caption: "先改成目标范围内的操作数。", columns, rows: [["目标区间", `${min} 到 ${max}`]] };
      const arithmetic = operation === 2
        ? right === 0 ? null : Math.trunc(left / right) + 0
        : left + right;
      const outcome = arithmetic === null ? "除数为零"
        : operation === 1 ? arithmetic % unsignedModulus
          : arithmetic < min || arithmetic > max ? "有符号结果不可表示" : arithmetic;
      return {
        caption: typeof outcome === "number" ? `定义明确，可折为 ${outcome}。` : `${outcome}。本面板不给出数值。`,
        columns,
        rows: [["目标区间", `${min} 到 ${max}`], ["宽精度候选", arithmetic === null ? "无" : arithmetic], ["目标语义", outcome]],
      };
    },
  },
  "ratio-of-aggregates": {
    title: "比较等权与按分母加权",
    fields: [
      { label: "甲组请求数", initial: 10, min: 0, max: 1000 },
      { label: "甲组失败数", initial: 5, min: 0, max: 1000 },
      { label: "乙组请求数", initial: 90, min: 0, max: 1000 },
      { label: "乙组失败数", initial: 9, min: 0, max: 1000 },
    ],
    evaluate: ([totalA, failA, totalB, failB]) => {
      const columns = ["范围", "失败数", "请求数", "失败率"];
      if (failA > totalA || failB > totalB) return { caption: "失败数不能超过该组请求数。", columns, rows: [] };
      const percentage = (part: number, whole: number) => whole ? `${fixed(100 * part / whole)}%` : "未定义";
      const total = totalA + totalB;
      const pooled = percentage(failA + failB, total);
      const present = [[failA, totalA], [failB, totalB]].filter(([, whole]) => whole > 0);
      const groupMean = present.length ? percentage(present.reduce((sum, [part, whole]) => sum + part / whole, 0), present.length) : "未定义";
      return {
        caption: `按请求合并 ${pooled}。非空组等权平均 ${groupMean}。`,
        columns,
        rows: [["甲", failA, totalA, percentage(failA, totalA)], ["乙", failB, totalB, percentage(failB, totalB)],
          ["整体", failA + failB, total, pooled]],
      };
    },
  },
  "hierarchical-merge-trace": {
    title: "换连接规则，查看合并顺序",
    fields: [
      { label: "连接规则", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "单连接" }, { value: 1, label: "全连接" }, { value: 2, label: "平均连接" },
      ] },
      { label: "D 的坐标", initial: 9, min: 6, max: 12 },
    ],
    evaluate: ([method, end]) => {
      const clusters = [0, 2, 5, end].map((x, i) => ({ name: "ABCD"[i], points: [x] }));
      const rows: (number | string)[][] = [];
      while (clusters.length > 1) {
        let best = { left: 0, right: 1, distance: Infinity };
        for (let left = 0; left < clusters.length - 1; left++) {
          for (let right = left + 1; right < clusters.length; right++) {
            const distances = clusters[left].points.flatMap((a) => clusters[right].points.map((b) => Math.abs(a - b)));
            const distance = method === 0 ? Math.min(...distances) : method === 1 ? Math.max(...distances)
              : distances.reduce((sum, value) => sum + value, 0) / distances.length;
            if (distance < best.distance) best = { left, right, distance };
          }
        }
        const a = clusters[best.left];
        const b = clusters[best.right];
        const merged = { name: a.name + b.name, points: [...a.points, ...b.points] };
        rows.push([rows.length + 1, a.name, b.name, fixed(best.distance), merged.name]);
        clusters[best.left] = merged;
        clusters.splice(best.right, 1);
      }
      return {
        caption: `第二步合并 ${rows[1][1]} 与 ${rows[1][2]}，距离 ${rows[1][3]}。`,
        columns: ["轮次", "簇一", "簇二", "连接距离", "合并后"], rows,
      };
    },
  },
  "sample-mean-uncertainty": {
    title: "调整样本量与独立性",
    fields: [
      { label: "总体标准差", initial: 12, min: 0, max: 100 },
      { label: "样本量", initial: 9, min: 1, max: 1000 },
      { label: "取样模式", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "独立同分布" }, { value: 1, label: "重复同一次抽取" },
      ] },
    ],
    evaluate: ([sigma, size, shared]) => {
      const standardError = shared ? sigma : sigma / Math.sqrt(size);
      return {
        caption: `单次标准差 ${sigma}。样本均值的标准误 ${fixed(standardError)}。`,
        columns: ["统计量", "数值"],
        rows: [["样本量", size], ["单次方差", sigma ** 2], ["样本均值方差", fixed(standardError ** 2)],
          ["样本均值标准误", fixed(standardError)]],
      };
    },
  },
} satisfies Record<string, Model>;
