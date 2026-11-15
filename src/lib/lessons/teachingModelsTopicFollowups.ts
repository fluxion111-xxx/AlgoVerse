import { pagePolicies, pageReplacementEngine } from "@/lib/experiments/pageReplacement";
import type { Model } from "./teachingModels";

const workingSetTraces = [[1, 2, 1, 2, 3, 4, 3, 4], [1, 2, 3, 4, 1, 2, 3, 4]];
const captureInterfaces = ["主机 lo", "主机 eth0", "主机 veth0", "容器 eth0"] as const;
const capturePaths = [
  [{ device: 0, source: "127.0.0.1", target: "127.0.0.1:8080" }],
  [{ device: 1, source: "192.0.2.10", target: "203.0.113.20:443" }],
  [{ device: 3, source: "172.18.0.2", target: "203.0.113.20:443" },
    { device: 2, source: "172.18.0.2", target: "203.0.113.20:443" },
    { device: 1, source: "192.0.2.10", target: "203.0.113.20:443" }],
] as const;
const orders = [["东", 60, true], ["东", 50, true], ["东", 30, false],
  ["西", 80, true], ["西", 20, true], ["西", 200, false]] as const;
const choosePair = (n: number) => n * (n - 1) / 2;
const residue = (value: number, modulus: number) => ((value % modulus) + modulus) % modulus;

export const topicFollowupModels = {
  "radix-stable-passes": {
    title: "逐位排序，观察同桶次序",
    fields: [
      { label: "A 的键", initial: 21, min: 0, max: 99 },
      { label: "B 的键", initial: 13, min: 0, max: 99 },
      { label: "C 的键", initial: 12, min: 0, max: 99 },
      { label: "D 的键", initial: 11, min: 0, max: 99 },
      { label: "十位桶内顺序", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "保持顺序" }, { value: 1, label: "反转顺序" },
      ] },
    ],
    evaluate: ([a, b, c, d, reverse]) => {
      const input = [a, b, c, d].map((key, i) => ({ key, name: "ABCD"[i] }));
      const pass = (records: typeof input, divisor: number, flip: boolean) => {
        const buckets = Array.from({ length: 10 }, (): typeof input => []);
        for (const record of records) buckets[Math.floor(record.key / divisor) % 10].push(record);
        return buckets.flatMap((bucket) => flip ? bucket.reverse() : bucket);
      };
      const units = pass(input, 1, false);
      const tens = pass(units, 10, reverse === 1);
      const show = (records: typeof input) => records.map(({ key, name }) => `${name}(${key})`).join(" → ");
      const sorted = tens.every(({ key }, index) => index === 0 || tens[index - 1].key <= key);
      return { caption: `十位收桶后${sorted ? "数值有序" : "数值仍乱序"}。`, columns: ["阶段", "记录顺序"],
        rows: [["输入", show(input)], ["个位收桶", show(units)], ["十位收桶", show(tens)]] };
    },
  },
  "lru-working-set": {
    title: "对照窗口页数与真实缺页",
    fields: [
      { label: "访问模式", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "分两个阶段" }, { value: 1, label: "循环四个页" },
      ] },
      { label: "窗口引用数", initial: 4, min: 1, max: 8 },
      { label: "页框数", initial: 2, min: 1, max: 4 },
    ],
    evaluate: ([pattern, window, frames]) => {
      const references = workingSetTraces[pattern];
      const results = pageReplacementEngine.run({ goalLabel: "比较活跃页与缺页。", frameCount: frames, references });
      const lru = results.policies[pagePolicies.indexOf("LRU")];
      return {
        caption: `LRU 缺页 ${lru.faults} 次，共 ${references.length} 次引用。`,
        columns: ["第几次", "访问页", "窗口内不同页", "页数", "LRU"],
        rows: lru.steps.map(({ page, hit }, i) => {
          const active = new Set(references.slice(Math.max(0, i - window + 1), i + 1));
          return [i + 1, page, [...active].join("、"), active.size, hit ? "命中" : "缺页"];
        }),
      };
    },
  },
  "capture-interface-path": {
    title: "沿路径选择观察接口",
    fields: [
      { label: "通信场景", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "主机访问回环" }, { value: 1, label: "主机访问外部" }, { value: 2, label: "容器经主机做 NAT" },
      ] },
      { label: "抓包接口", initial: 1, min: 0, max: 3,
        choices: captureInterfaces.map((label, value) => ({ value, label })) },
    ],
    evaluate: ([scenario, observed]) => {
      const path = capturePaths[scenario];
      const captured = path.filter(({ device }) => device === observed);
      return {
        caption: `${captureInterfaces[observed]} 可见 ${captured.length} 条 SYN 记录。`,
        columns: ["捕获接口", "源 IP", "目标地址", "标志"],
        rows: captured.map(({ device, source, target }) => [captureInterfaces[device], source, target, "SYN"]),
      };
    },
  },
  "unsigned-result-modulus": {
    title: "比较数学结果和无符号余数",
    fields: [
      { label: "目标位宽", initial: 8, min: 8, max: 32,
        choices: [8, 16, 32].map((value) => ({ value, label: `${value} 位` })) },
      { label: "左操作数", initial: 250, min: 0, max: 4294967295 },
      { label: "右操作数", initial: 10, min: 0, max: 4294967295 },
      { label: "运算方式", initial: 0, min: 0, max: 1,
        choices: [{ value: 0, label: "加法" }, { value: 1, label: "减法" }] },
    ],
    evaluate: ([bits, left, right, subtract]) => {
      const modulus = 2 ** bits;
      const math = subtract ? left - right : left + right;
      const target = residue(math, modulus);
      return {
        caption: `数学结果 ${math}。转成 ${bits} 位无符号值，得到 ${target}。`,
        columns: ["检查项", "结果"],
        rows: [["目标范围", `0–${modulus - 1}`], ["模数", modulus], ["数学结果", math], ["目标余数", target]],
      };
    },
  },
  "sql-row-group-filter": {
    title: "逐步观察筛行和筛组",
    fields: [
      { label: "单笔最低金额", initial: 50, min: 0, max: 250 },
      { label: "组总额门槛", initial: 100, min: 0, max: 500 },
    ],
    evaluate: ([minimum, threshold]) => {
      const kept = orders.filter(([, amount, paid]) => paid && amount >= minimum);
      const groups = new Map<string, number>();
      for (const [area, amount] of kept) groups.set(area, (groups.get(area) ?? 0) + amount);
      const rows = [...groups].map(([area, total]) => [area, total, total >= threshold ? "保留" : "排除"]);
      return {
        caption: `WHERE 留 ${kept.length} 笔。HAVING 留 ${rows.filter((row) => row[2] === "保留").length} 组。`,
        columns: ["地区", "入组金额之和", "HAVING"], rows,
      };
    },
  },
  "adjusted-rand-pairs": {
    title: "从列联表算同簇样本对",
    fields: [
      { label: "样本 1 的预测簇", initial: 1, min: 0, max: 1 },
      { label: "样本 2 的预测簇", initial: 1, min: 0, max: 1 },
      { label: "样本 3 的预测簇", initial: 0, min: 0, max: 1 },
      { label: "样本 4 的预测簇", initial: 0, min: 0, max: 1 },
    ],
    evaluate: (labels) => {
      const table = [[0, 0], [0, 0]];
      labels.forEach((label, i) => table[Math.floor(i / 2)][label]++);
      const observed = table.flat().reduce((sum, count) => sum + choosePair(count), 0);
      const referencePairs = table.reduce((sum, row) => sum + choosePair(row[0] + row[1]), 0);
      const totals = [table[0][0] + table[1][0], table[0][1] + table[1][1]];
      const predictionPairs = totals.reduce((sum, count) => sum + choosePair(count), 0);
      const total = choosePair(labels.length);
      const product = referencePairs * predictionPairs;
      const score = 2 * (observed * total - product) / ((referencePairs + predictionPairs) * total - 2 * product);
      return {
        caption: `共同同簇 ${observed} 对。ARI = ${Number(score.toFixed(3))}。`,
        columns: ["参考簇", "预测簇 0", "预测簇 1", "合计"],
        rows: [["参考 0", ...table[0], 2], ["参考 1", ...table[1], 2], ["合计", ...totals, 4]],
      };
    },
  },
  "conditional-mean-weights": {
    title: "先算组内均值，再按占比加权",
    fields: [
      { label: "轻任务笔数", initial: 2, min: 0, max: 20 },
      { label: "重任务笔数", initial: 6, min: 0, max: 20 },
      { label: "轻任务均值（分钟）", initial: 2, min: 0, max: 60 },
      { label: "重任务均值（分钟）", initial: 10, min: 0, max: 60 },
    ],
    evaluate: ([light, heavy, lightMean, heavyMean]) => {
      const total = light + heavy;
      const totalDuration = light * lightMean + heavy * heavyMean;
      const rounded = (value: number) => Number(value.toFixed(2));
      return {
        caption: total ? `总用时 ${totalDuration} 分钟。总体均值 ${rounded(totalDuration / total)} 分钟。` : "没有任务。总体均值未定义。",
        columns: ["类别", "笔数", "占比", "组内均值", "总用时"],
        rows: [["轻任务", light, total ? `${rounded(light / total * 100)}%` : "—", light ? lightMean : "—", light * lightMean],
          ["重任务", heavy, total ? `${rounded(heavy / total * 100)}%` : "—", heavy ? heavyMean : "—", heavy * heavyMean]],
      };
    },
  },
} satisfies Record<string, Model>;
