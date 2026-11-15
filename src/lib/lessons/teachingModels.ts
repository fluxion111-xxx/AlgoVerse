import { teachingModelsDbAi } from "./teachingModelsDbAi";
import { netProgrammingTeachingModels } from "./teachingModelsNetProgramming";
import { coreContinuationModels } from "./teachingModelsCoreContinuations";
import { topicFollowupModels } from "./teachingModelsTopicFollowups";
import { workedCaseModels } from "./teachingModelsWorkedCases";
import { comparisonModels } from "./teachingModelsComparisons";
import { analysisCaseModels } from "./teachingModelsAnalysisCases";
import { traceComparisonModels } from "./teachingModelsTraceComparisons";

type Field = { label: string; initial: number; min: number; max: number;
  choices?: readonly { value: number; label: string }[] };
type Result = { caption: string; columns: readonly string[]; rows: readonly (readonly (number | string)[])[] };
export type Model = { title: string; fields: readonly Field[]; evaluate: (values: readonly number[]) => Result };

const binary = (value: number) => value.toString(2).padStart(8, "0");
const percent = (numerator: number, denominator: number) => denominator === 0
  ? "未定义" : new Intl.NumberFormat("zh-CN", { style: "percent", maximumFractionDigits: 2 }).format(numerator / denominator);
const rounded = (number: number) => Number(number.toFixed(4));
const scores = [
  { name: "阿岑", course: "OS", score: 88 }, { name: "阿禾", course: "OS", score: 76 },
  { name: "小周", course: "DB", score: 91 }, { name: "小林", course: "DB", score: 60 },
];

export const teachingModels = {
  ...netProgrammingTeachingModels,
  ...teachingModelsDbAi,
  ...coreContinuationModels,
  ...topicFollowupModels,
  ...workedCaseModels,
  ...comparisonModels,
  ...analysisCaseModels,
  ...traceComparisonModels,
  "array-address": {
    title: "把下标换成地址",
    fields: [
      { label: "访问下标", initial: 2, min: 0, max: 7 },
      { label: "元素宽度（字节）", initial: 4, min: 1, max: 8, choices: [1, 2, 4, 8].map((value) => ({ value, label: String(value) })) },
      { label: "元素个数", initial: 4, min: 1, max: 8 },
    ],
    evaluate: ([index, width, length]) => ({
      caption: index < length ? `下标 ${index} 的首地址是 ${1000 + index * width}。` : `下标 ${index} 越界，合法范围为 0–${length - 1}。`,
      columns: ["下标", "字节偏移", "地址区间", "状态"],
      rows: Array.from({ length }, (_, i) => [i, i * width, `[${1000 + i * width}, ${1000 + (i + 1) * width})`, index === i ? "本次读取" : ""] as const),
    }),
  },
  "page-address": {
    title: "拆地址，再查页表",
    fields: [
      { label: "虚拟字节地址", initial: 4101, min: 0, max: 32767 },
      { label: "页大小（字节）", initial: 4096, min: 256, max: 4096,
        choices: [256, 1024, 4096].map((value) => ({ value, label: String(value) })) },
    ],
    evaluate: ([address, size]) => {
      const page = Math.floor(address / size);
      const offset = address % size;
      const frame = [2, 3, 1, 0][page];
      return {
        caption: frame === undefined ? "页表没有这个页的映射。" : `物理地址为 ${frame * size + offset}。`,
        columns: ["阶段", "结果"], rows: [["拆虚拟页号", page], ["保留页内偏移", offset],
          ["按页号查页框", frame ?? "无映射"], ["拼物理地址", frame === undefined ? "停止翻译" : frame * size + offset]],
      };
    },
  },
  "ipv4-prefix": {
    title: "检查末段的前缀位",
    fields: [
      { label: "目标末段", initial: 200, min: 0, max: 255 },
      { label: "启用 /26 路由", initial: 1, min: 0, max: 1, choices: [{ value: 1, label: "启用" }, { value: 0, label: "撤去" }] },
    ],
    evaluate: ([host, enabled]) => {
      const prefixes = [
        { base: 192, size: 64, bits: 26, hop: "C", available: enabled === 1 },
        { base: 128, size: 128, bits: 25, hop: "B", available: true },
        { base: 0, size: 256, bits: 24, hop: "A", available: true },
      ];
      const matches = ({ base, size }: typeof prefixes[number]) => Math.floor(host / size) * size === base;
      const chosen = prefixes.find((prefix) => prefix.available && matches(prefix));
      return { caption: `203.0.113.${host}（末段 ${binary(host)}）走 ${chosen?.hop ?? "默认路由"}。`,
        columns: ["候选前缀", "末段覆盖", "下一跳", "判定"],
        rows: prefixes.map((prefix) => [`203.0.113.${prefix.base}/${prefix.bits}`, `${prefix.base}–${prefix.base + prefix.size - 1}`,
          prefix.hop, !prefix.available ? "已撤去" : prefix === chosen ? "最长匹配" : matches(prefix) ? "匹配" : "未匹配"]) };
    },
  },
  "pointer-life": {
    title: "跟着对象走到函数外",
    fields: [
      { label: "指针指向", initial: 0, min: 0, max: 1,
        choices: [{ value: 0, label: "被调用函数的局部对象" }, { value: 1, label: "调用者的对象" }] },
      { label: "观察时机", initial: 1, min: 0, max: 2,
        choices: [{ value: 0, label: "函数内" }, { value: 1, label: "被调用函数退出后" }, { value: 2, label: "调用者也退出后" }] },
    ],
    evaluate: ([target, phase]) => {
      const alive = phase < (target === 0 ? 1 : 2);
      return { caption: alive ? "对象仍存活，此情境下可读取。" : "对象寿命已结束，停止访问。",
        columns: ["检查项", "结果"],
        rows: [["地址来源", target === 0 ? "被调用函数" : "调用者"], ["对象是否存活", alive ? "是" : "否"],
          ["指针访问", alive ? "可读" : "无有效对象"], ["本模型", "只判定寿命，不执行 C 代码"]] };
    },
  },
  "relation-project": {
    title: "筛行、取列，再比较去重",
    fields: [
      { label: "最低分", initial: 70, min: 0, max: 100 },
      { label: "DISTINCT", initial: 0, min: 0, max: 1,
        choices: [{ value: 0, label: "保留重复行" }, { value: 1, label: "移除重复行" }] },
    ],
    evaluate: ([threshold, distinct]) => {
      const kept = scores.filter(({ score }) => score >= threshold);
      const courses = kept.map(({ course }) => course);
      const result = distinct ? [...new Set(courses)] : courses;
      return { caption: `结果 ${result.length} 行：${result.join("、") || "无"}。`,
        columns: ["编号", "学生", "课程", "分数", "WHERE"],
        rows: scores.map(({ name, course, score }, index) => [index + 1, name, course, score, score >= threshold ? "保留" : "排除"]) };
    },
  },
  "classification-metrics": {
    title: "分别替换分母",
    fields: [
      { label: "真正例 TP", initial: 18, min: 0, max: 1000 },
      { label: "假正例 FP", initial: 6, min: 0, max: 1000 },
      { label: "假负例 FN", initial: 12, min: 0, max: 1000 },
    ],
    evaluate: ([tp, fp, fn]) => ({
      caption: `精确率 ${percent(tp, tp + fp)}，召回率 ${percent(tp, tp + fn)}。`,
      columns: ["指标", "分子", "分母", "结果"],
      rows: [["精确率", tp, tp + fp, percent(tp, tp + fp)], ["召回率", tp, tp + fn, percent(tp, tp + fn)],
        ["F1", 2 * tp, 2 * tp + fp + fn, percent(2 * tp, 2 * tp + fp + fn)]],
    }),
  },
  "bayes-counts": {
    title: "用两组人数算后验",
    fields: [
      { label: "1000 人中的事件人数", initial: 10, min: 0, max: 1000 },
      { label: "事件组判阳率（%）", initial: 90, min: 0, max: 100 },
      { label: "对照组判阳率（%）", initial: 10, min: 0, max: 100 },
    ],
    evaluate: ([count, sensitivity, falsePositive]) => {
      const positive = count * sensitivity / 100;
      const falseAlarm = (1000 - count) * falsePositive / 100;
      return { caption: `判阳后的事件概率为 ${percent(positive, positive + falseAlarm)}。`,
        columns: ["分组", "组内人数", "期望判阳", "期望判阴"],
        rows: [["事件组", count, rounded(positive), rounded(count - positive)],
          ["对照组", 1000 - count, rounded(falseAlarm), rounded(1000 - count - falseAlarm)],
          ["合计", 1000, rounded(positive + falseAlarm), rounded(1000 - positive - falseAlarm)]] };
    },
  },
  "array-growth-cost": {
    title: "逐次累计扩容搬移",
    fields: [
      { label: "追加次数", initial: 9, min: 1, max: 32 },
      { label: "增长规则", initial: 2, min: 1, max: 2,
        choices: [{ value: 2, label: "容量翻倍" }, { value: 1, label: "容量加一" }] },
    ],
    evaluate: ([count, growth]) => {
      let capacity = 1;
      let total = 0;
      const rows = Array.from({ length: count }, (_, size) => {
        const moves = size === capacity ? size : 0;
        if (moves) capacity = growth === 2 ? capacity * 2 : capacity + 1;
        total += moves;
        return [size + 1, capacity, moves, total];
      });
      return { caption: `共搬移 ${total} 项，另写入 ${count} 个新元素。`, columns: ["第几次追加", "容量", "本次搬移", "累计搬移"], rows };
    },
  },
  "tlb-trace": {
    title: "逐次查转换缓存",
    fields: [
      { label: "TLB 条目数", initial: 2, min: 1, max: 3 },
      { label: "访问序列", initial: 0, min: 0, max: 1,
        choices: [{ value: 0, label: "1, 1, 2, 1, 3, 1" }, { value: 1, label: "1, 2, 3, 1, 2, 3" }] },
    ],
    evaluate: ([capacity, pattern]) => {
      const cache = new Set<number>();
      let hits = 0;
      const pages = pattern === 0 ? [1, 1, 2, 1, 3, 1] : [1, 2, 3, 1, 2, 3];
      const rows = pages.map((page, index) => {
        const hit = cache.delete(page);
        if (hit) hits++;
        const removed = !hit && cache.size === capacity ? cache.values().next().value : undefined;
        if (removed !== undefined) cache.delete(removed);
        cache.add(page);
        return [index + 1, page, hit ? "命中" : "查页表", removed ?? "—", [...cache].join(" → ")];
      });
      return { caption: `命中 ${hits} 次，查页表 ${rows.length - hits} 次。`,
        columns: ["第几次", "页号", "结果", "淘汰页", "缓存（旧 → 新）"], rows };
    },
  },
  "heap-ownership": {
    title: "看分配、借用与释放",
    fields: [
      { label: "分配结果", initial: 1, min: 0, max: 1, choices: [{ value: 1, label: "成功" }, { value: 0, label: "失败" }] },
      { label: "运行到", initial: 1, min: 0, max: 2, choices: [
        { value: 0, label: "刚分配" }, { value: 1, label: "借用期间" }, { value: 2, label: "所有者清理后" },
      ] },
    ],
    evaluate: ([success, phase]) => {
      const alive = success === 1 && phase < 2;
      return { caption: !success ? "分配失败，走错误分支。" : alive ? "对象还活着，所有者负责清理。" : "对象已释放，两条指针都不可访问。",
        columns: ["观察项", "状态"], rows: [["存储", !success ? "未分配" : alive ? "有效" : "已释放"],
          ["所有者", alive ? "承担释放义务" : "无待释放对象"],
          ["借用者", alive && phase === 1 ? "可读，不能释放" : "无可用借用"],
          ["再次释放", !success || alive ? "未触发" : "禁止重复释放"]] };
    },
  },
  "sql-join": {
    title: "对照匹配对与补空行",
    fields: [
      { label: "连接模式", initial: 1, min: 0, max: 1,
        choices: [{ value: 0, label: "INNER JOIN" }, { value: 1, label: "LEFT JOIN" }] },
      { label: "最低订单金额", initial: 0, min: 0, max: 100 },
    ],
    evaluate: ([outer, minimum]) => {
      const orders = [{ customer: 1, order: 40 }, { customer: 1, order: 80 }, { customer: 2, order: 60 }];
      const rows = [1, 2, 3].flatMap((customer) => {
        const matches = orders.filter((row) => row.customer === customer && row.order >= minimum);
        return matches.length ? matches.map(({ order }) => [customer, order, "匹配"]) : outer ? [[customer, "NULL", "补空"]] : [];
      });
      return { caption: `结果 ${rows.length} 行，其中 ${rows.filter((row) => row[1] === "NULL").length} 行补空。`,
        columns: ["客户", "订单金额", "来源"], rows };
    },
  },
  "confusion-counts": {
    title: "把预测分数放进四格",
    fields: [{ label: "报警阈值（分）", initial: 60, min: 0, max: 100 }],
    evaluate: ([threshold]) => {
      const actualPositive = [90, 70, 50];
      const actualNegative = [85, 30, 10];
      const tp = actualPositive.filter((score) => score >= threshold).length;
      const fp = actualNegative.filter((score) => score >= threshold).length;
      const fn = actualPositive.length - tp;
      const tn = actualNegative.length - fp;
      return { caption: `误报 ${fp} 次，漏报 ${fn} 次。`, columns: ["真实标签", "预测正", "预测负", "合计"],
        rows: [["真实正", `TP ${tp}`, `FN ${fn}`, actualPositive.length],
          ["真实负", `FP ${fp}`, `TN ${tn}`, actualNegative.length],
          ["合计", tp + fp, fn + tn, actualPositive.length + actualNegative.length]] };
    },
  },
  "weighted-groups": {
    title: "改份额，算总体延迟",
    fields: [
      { label: "A 组订单占比（%）", initial: 80, min: 0, max: 100 },
      { label: "A 组组内延迟率（%）", initial: 1, min: 0, max: 100 },
      { label: "B 组组内延迟率（%）", initial: 6, min: 0, max: 100 },
    ],
    evaluate: ([weight, a, b]) => {
      const first = weight * a;
      const second = (100 - weight) * b;
      return { caption: `总体延迟率为 ${percent(first + second, 10000)}。`, columns: ["分组", "订单占比", "组内延迟率", "总体贡献"],
        rows: [["A", `${weight}%`, `${a}%`, percent(first, 10000)], ["B", `${100 - weight}%`, `${b}%`, percent(second, 10000)]] };
    },
  },
  "conditional-group-mixture": {
    title: "对照混合前后的告警率",
    fields: [
      { label: "旧设备占比（%）", initial: 50, min: 0, max: 100 },
      { label: "旧设备 A 告警率（%）", initial: 80, min: 0, max: 100 },
      { label: "旧设备 B 告警率（%）", initial: 80, min: 0, max: 100 },
      { label: "新设备 A 告警率（%）", initial: 20, min: 0, max: 100 },
      { label: "新设备 B 告警率（%）", initial: 20, min: 0, max: 100 },
    ],
    evaluate: ([oldShare, oldA, oldB, newA, newB]) => {
      const newShare = 100 - oldShare;
      const marginalA = oldShare * oldA + newShare * newA;
      const marginalB = oldShare * oldB + newShare * newB;
      const joint = oldShare * oldA * oldB + newShare * newA * newB;
      const jointScaled = joint * 100;
      const marginalProduct = marginalA * marginalB;
      const verdict = jointScaled === marginalProduct ? "总体独立" : jointScaled > marginalProduct ? "总体正关联" : "总体负关联";
      return {
        caption: `非空组内独立。混合后${verdict}。`,
        columns: ["范围", "A 告警", "B 告警", "同时告警", "两率相乘"],
        rows: [
          ["旧设备", oldShare ? percent(oldA, 100) : "—", oldShare ? percent(oldB, 100) : "—",
            oldShare ? percent(oldA * oldB, 10000) : "—", oldShare ? percent(oldA * oldB, 10000) : "—"],
          ["新设备", newShare ? percent(newA, 100) : "—", newShare ? percent(newB, 100) : "—",
            newShare ? percent(newA * newB, 10000) : "—", newShare ? percent(newA * newB, 10000) : "—"],
          ["全部", percent(marginalA, 10000), percent(marginalB, 10000), percent(joint, 1000000), percent(marginalProduct, 100000000)],
        ],
      };
    },
  },
} satisfies Record<string, Model>;

export type TeachingModelId = keyof typeof teachingModels;

export function isTeachingModel(id: string): id is TeachingModelId {
  return Object.hasOwn(teachingModels, id);
}

export function evaluateTeachingModel(id: TeachingModelId, values: readonly number[]) {
  const model: Model = teachingModels[id];
  if (values.length !== model.fields.length || model.fields.some(({ min, max, choices }, i) =>
    !Number.isInteger(values[i]) || values[i] < min || values[i] > max || (choices && !choices.some(({ value }) => value === values[i])))) return null;
  return model.evaluate(values);
}
