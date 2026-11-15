import { pagePolicies, pageReplacementEngine } from "@/lib/experiments/pageReplacement";
import type { Model } from "./teachingModels";

const references = [1, 2, 1, 3, 4, 1, 2, 1];
const packets = [
  { name: "DNS 查询", transport: "UDP", port: 53, dns: true },
  { name: "HTTPS 连接 SYN", transport: "TCP", port: 443, dns: false },
  { name: "DNS 的 TCP 回复", transport: "TCP", port: 53, dns: true },
  { name: "HTTPS 连接 SYN-ACK", transport: "TCP", port: 443, dns: false },
] as const;
const samplePoints = [0, 1, 2, 3, 8];

export const workedCaseModels = {
  "record-sort-ties": {
    title: "改变比较符，观察同键记录",
    fields: [
      { label: "A 的等级", initial: 2, min: 0, max: 9 },
      { label: "B 的等级", initial: 1, min: 0, max: 9 },
      { label: "C 的等级", initial: 2, min: 0, max: 9 },
      { label: "移动前项的条件", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "前项等级 > 当前等级" }, { value: 1, label: "前项等级 ≥ 当前等级" },
      ] },
    ],
    evaluate: ([a, b, c, moveEqual]) => {
      const records = [a, b, c].map((rank, i) => ({ rank, id: "ABC"[i] }));
      const format = () => records.map(({ rank, id }) => `${id}(${rank})`).join(" → ");
      const rows = [["输入", format()]];
      for (let i = 1; i < records.length; i++) {
        const current = records[i];
        let pos = i;
        while (pos > 0 && (records[pos - 1].rank > current.rank || (moveEqual === 1 && records[pos - 1].rank === current.rank))) {
          records[pos] = records[pos - 1];
          pos--;
        }
        records[pos] = current;
        rows.push([`插入 ${current.id}`, format()]);
      }
      const movedEqual = records.some((record, index) => index > 0 &&
        records[index - 1].rank === record.rank && records[index - 1].id > record.id);
      return { caption: movedEqual ? "本轮同键记录换了顺序。" : "本轮同键记录保留原顺序。", columns: ["阶段", "记录顺序"], rows };
    },
  },
  "lru-refault-trace": {
    title: "分开数冷缺页和复访缺页",
    fields: [{ label: "页框数", initial: 2, min: 1, max: 4 }],
    evaluate: ([frames]) => {
      const result = pageReplacementEngine.run({ goalLabel: "观察回收后的复访。", frameCount: frames, references });
      const lru = result.policies[pagePolicies.indexOf("LRU")];
      const seen = new Set<number>();
      let repeatedMisses = 0;
      const rows = lru.steps.map(({ page, hit, evicted }, i) => {
        const repeated = !hit && seen.has(page);
        if (repeated) repeatedMisses++;
        seen.add(page);
        return [i + 1, page, hit ? "命中" : repeated ? "复访缺页" : "冷缺页", evicted ?? "—", repeatedMisses];
      });
      return {
        caption: `LRU 缺页 ${lru.faults} 次。其中复访缺页 ${repeatedMisses} 次。`,
        columns: ["第几次", "访问页", "结果", "换出页", "累计复访缺页"], rows,
      };
    },
  },
  "capture-display-stages": {
    title: "对照写入和显示两道筛选",
    fields: [
      { label: "采集过滤", initial: 1, min: 0, max: 2, choices: [
        { value: 0, label: "无过滤" }, { value: 1, label: "tcp port 443" }, { value: 2, label: "tcp" },
      ] },
      { label: "显示过滤", initial: 1, min: 0, max: 2, choices: [
        { value: 0, label: "无过滤" }, { value: 1, label: "dns" }, { value: 2, label: "tcp.port == 443" },
      ] },
    ],
    evaluate: ([capture, display]) => {
      const rows = packets.map(({ name, transport, port, dns }) => {
        const keep = capture === 0 || (transport === "TCP" && (capture === 2 || port === 443));
        const show = keep && (display === 0 || (display === 1 ? dns : transport === "TCP" && port === 443));
        return [name, transport, port, keep ? "写入" : "未写入", show ? "显示" : "不显示"];
      });
      return { caption: `写入 ${rows.filter((row) => row[3] === "写入").length} 条。显示 ${rows.filter((row) => row[4] === "显示").length} 条。`,
        columns: ["报文", "传输协议", "服务端口", "采集阶段", "显示阶段"], rows };
    },
  },
  "c-conversion-stages": {
    title: "跟踪表达式与赋值类型",
    fields: [
      { label: "源表达式", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "unsigned char + 10" }, { value: 1, label: "int + 10.5" }, { value: 2, label: "int * 指针" },
      ] },
      { label: "输入值", initial: 250, min: 0, max: 255 },
      { label: "赋值目标", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "unsigned char" }, { value: 1, label: "int" }, { value: 2, label: "double" },
      ] },
    ],
    evaluate: ([source, value, target]) => {
      const type = ["int", "double", "int *"][source];
      const destination = ["unsigned char", "int", "double"][target];
      const expression = source === 2 ? "指针值" : value + (source === 0 ? 10 : 10.5);
      let stored: number | string = expression;
      if (source === 2) stored = "赋值违反类型约束";
      else if (typeof expression === "number" && target === 0) {
        const integer = Math.trunc(expression);
        stored = source === 1 && integer > 255 ? "运行时越界" : integer % 256;
      } else if (typeof expression === "number" && target === 1) stored = Math.trunc(expression);
      return {
        caption: typeof stored === "number" ? `赋值后为 ${stored}。` : `${stored}。`,
        columns: ["阶段", "类型", "值或诊断"],
        rows: [["表达式", type, expression], ["赋值", destination, stored]],
      };
    },
  },
  "rollup-group-levels": {
    title: "区分原始空值和小计标记",
    fields: [
      { label: "北区 A 的金额", initial: 10, min: 0, max: 100 },
      { label: "北区未知产品金额", initial: 20, min: 0, max: 100 },
      { label: "南区 A 的金额", initial: 30, min: 0, max: 100 },
      { label: "汇总方式", initial: 1, min: 0, max: 1, choices: [
        { value: 0, label: "仅明细分组" }, { value: 1, label: "按地区、产品 ROLLUP" },
      ] },
    ],
    evaluate: ([north, unknown, south, rollup]) => {
      const rows: (number | string)[][] = [
        ["北", "A", 0, 0, north], ["北", "NULL", 0, 0, unknown], ["南", "A", 0, 0, south],
      ];
      if (rollup) rows.push(["北", "NULL", 0, 1, north + unknown], ["南", "NULL", 0, 1, south],
        ["NULL", "NULL", 1, 1, north + unknown + south]);
      return { caption: `共 ${rows.length} 行。${rollup ? `总计 ${north + unknown + south}。` : "仅按原列分组。"}`,
        columns: ["地区", "产品", "地区标记", "产品标记", "金额"], rows };
    },
  },
  "dbscan-neighborhood": {
    title: "按邻域重算核心、边界和噪声",
    fields: [
      { label: "邻域半径", initial: 1, min: 1, max: 8 },
      { label: "核心点所需邻居数", initial: 3, min: 1, max: 5 },
    ],
    evaluate: ([radius, minSamples]) => {
      const neighbors = samplePoints.map((point) => samplePoints.filter((other) => Math.abs(point - other) <= radius));
      const cores = new Set(samplePoints.filter((_, i) => neighbors[i].length >= minSamples));
      const rows = samplePoints.map((point, i) => [point, neighbors[i].join("、"), neighbors[i].length,
        cores.has(point) ? "核心" : neighbors[i].some((other) => cores.has(other)) ? "边界" : "噪声"]);
      return { caption: `核心 ${cores.size} 个，边界 ${rows.filter((row) => row[3] === "边界").length} 个，噪声 ${rows.filter((row) => row[3] === "噪声").length} 个。`,
        columns: ["点", "邻居（含自身）", "个数", "分类"], rows };
    },
  },
  "stratified-population-mean": {
    title: "把样本份额与总体份额分开",
    fields: [
      { label: "常规用户总体占比（%）", initial: 90, min: 0, max: 100 },
      { label: "常规用户抽样数", initial: 10, min: 0, max: 50 },
      { label: "高负载用户抽样数", initial: 10, min: 0, max: 50 },
      { label: "常规样本均值（毫秒）", initial: 10, min: 0, max: 100 },
      { label: "高负载样本均值（毫秒）", initial: 40, min: 0, max: 100 },
    ],
    evaluate: ([share, regularCount, highCount, regularMean, highMean]) => {
      const strata = [["常规", share, regularCount, regularMean], ["高负载", 100 - share, highCount, highMean]] as const;
      const missing = strata.some(([, weight, count]) => weight > 0 && count === 0);
      const pooled = regularCount + highCount ? (regularCount * regularMean + highCount * highMean) / (regularCount + highCount) : null;
      const weighted = (share * regularMean + (100 - share) * highMean) / 100;
      return {
        caption: `样本直接平均 ${pooled === null ? "未定义" : Number(pooled.toFixed(2))}。总体加权估计 ${missing ? "缺层，无法计算" : Number(weighted.toFixed(2))}。`,
        columns: ["层", "总体占比", "已抽样数", "样本均值", "加权贡献"],
        rows: strata.map(([label, weight, count, mean]) =>
          [label, `${weight}%`, count, count ? mean : "—", weight === 0 ? 0 : count ? weight * mean / 100 : "缺样本"]),
      };
    },
  },
} satisfies Record<string, Model>;
