import type { Model } from "./teachingModels";

const percent = (count: number, total: number) =>
  total ? `${Number((100 * count / total).toFixed(2))}%` : "未定义";

const captureScenarios = [
  [{ time: 1020, side: 1, event: "收到 Seq=1000" }, { time: 1020, side: 1, event: "发出 ACK=1100" }],
  [{ time: 20, side: 1, event: "收到 Seq=1000" }, { time: 20, side: 1, event: "发出 ACK=1100" },
    { time: 1020, side: 1, event: "收到 Seq=1000" }, { time: 1020, side: 1, event: "发出 ACK=1100" }],
] as const;
const senderCapture = [
  { time: 0, side: 0, event: "发出 Seq=1000" },
  { time: 1000, side: 0, event: "重发 Seq=1000" },
  { time: 1040, side: 0, event: "收到 ACK=1100" },
] as const;

export const coreContinuationModels = {
  "counting-sort-stability": {
    title: "从频数排出同键记录",
    fields: [
      { label: "A 的键", initial: 2, min: -5, max: 5 },
      { label: "B 的键", initial: 0, min: -5, max: 5 },
      { label: "C 的键", initial: 2, min: -5, max: 5 },
      { label: "D 的键", initial: 1, min: -5, max: 5 },
    ],
    evaluate: (keys) => {
      const low = Math.min(...keys);
      const high = Math.max(...keys);
      const counts = Array<number>(high - low + 1).fill(0);
      for (const key of keys) counts[key - low]++;
      let offset = 0;
      const starts = counts.map((count) => {
        const start = offset;
        offset += count;
        return start;
      });
      const cursors = starts.slice();
      const order = Array<string>(keys.length);
      keys.forEach((key, index) => {
        order[cursors[key - low]++] = "ABCD"[index];
      });
      return {
        caption: `输出 ${order.join(" → ")}。计数表有 ${counts.length} 格。`,
        columns: ["键", "频数", "输出位置（从 0 起）", "记录"],
        rows: counts.map((count, i) => {
          const start = starts[i];
          return [low + i, count, count ? `[${start}, ${start + count})` : "—", order.slice(start, start + count).join("、") || "—"];
        }),
      };
    },
  },
  "capture-vantage": {
    title: "切换观察点，比较两条记录",
    fields: [
      { label: "教学场景", initial: 0, min: 0, max: 1, choices: [{ value: 0, label: "首次数据段未到达" }, { value: 1, label: "首次 ACK 未返回" }] },
      { label: "抓包位置", initial: 0, min: 0, max: 2, choices: [{ value: 0, label: "发送端" }, { value: 1, label: "接收端" }, { value: 2, label: "对照两端" }] },
      { label: "开始记录（毫秒）", initial: 0, min: 0, max: 1100 },
    ],
    evaluate: ([scenario, side, start]) => {
      const observed = [...senderCapture, ...captureScenarios[scenario]]
        .filter((entry) => entry.time >= start && (side === 2 || side === entry.side))
        .sort((a, b) => a.time - b.time);
      return {
        caption: `预设事件中可见 ${observed.length} 条记录。`,
        columns: ["时刻（毫秒）", "观察点", "可见事件"],
        rows: observed.map(({ time, side, event }) => [time, side === 0 ? "发送端" : "接收端", event]),
      };
    },
  },
  "checked-allocation-size": {
    title: "先检查，再计算字节数",
    fields: [
      { label: "大小上限", initial: 16, min: 16, max: 32, choices: [{ value: 16, label: "16 位教学上限" }, { value: 32, label: "32 位教学上限" }] },
      { label: "元素个数", initial: 3000, min: 0, max: 4294967295 },
      { label: "每项字节数", initial: 24, min: 1, max: 4294967295 },
    ],
    evaluate: ([bits, count, width]) => {
      const limit = 2 ** bits - 1;
      const maximumCount = Math.floor(limit / width);
      const result = count === 0 ? "本例拒绝空请求" : count <= maximumCount ? count * width : "拒绝乘法";
      return {
        caption: typeof result === "number" ? `大小检查通过，请求 ${result} 字节。` : `${result}。`,
        columns: ["检查", "结果"],
        rows: [["字节数上限", limit], ["最多能容纳几项", maximumCount], ["本次请求项数", count], ["交给分配器的大小", result]],
      };
    },
  },
  "join-aggregate-fanout": {
    title: "计算连接前后的聚合值",
    fields: [
      { label: "付款笔数", initial: 2, min: 0, max: 5 },
      { label: "工单笔数", initial: 3, min: 0, max: 5 },
      { label: "每笔付款金额", initial: 30, min: 1, max: 100 },
    ],
    evaluate: ([payments, tickets, amount]) => {
      const copies = Math.max(1, tickets);
      const joinedRows = Math.max(1, payments) * copies;
      return {
        caption: `左连接输出 ${joinedRows} 行。正确付款总额 ${payments * amount} 元。`,
        columns: ["测量", "直接聚合", "分别预聚合"],
        rows: [["付款笔数", payments * copies, payments], ["付款总额（元）", payments ? payments * amount * copies : "NULL", payments * amount],
          ["工单笔数", tickets * Math.max(1, payments), tickets], ["只保留不同金额求和（元）", payments ? amount : "NULL", "—"]],
      };
    },
  },
  "silhouette-point": {
    title: "改位置或标签，重算轮廓",
    fields: [
      { label: "边界点坐标", initial: 6, min: 3, max: 9 },
      { label: "边界点归属", initial: 0, min: 0, max: 1, choices: [{ value: 0, label: "左簇" }, { value: 1, label: "右簇" }] },
    ],
    evaluate: ([x, group]) => {
      const points = [0, 2, x, 8, 10];
      const labels = [0, 0, group, 1, 1];
      const formatted = (value: number) => Number(value.toFixed(3));
      let total = 0;
      const rows = points.map((point, i) => {
        const distances = points.map((other) => Math.abs(other - point));
        const same = distances.filter((_, j) => j !== i && labels[i] === labels[j]);
        const other = distances.filter((_, j) => labels[i] !== labels[j]);
        const average = (items: number[]) => items.reduce((sum, distance) => sum + distance, 0) / items.length;
        const a = average(same);
        const b = average(other);
        const score = (b - a) / Math.max(a, b);
        total += score;
        return [i === 2 ? `边界点 ${point}` : point, labels[i] ? "右" : "左", formatted(a), formatted(b), formatted(score)];
      });
      return {
        caption: `边界点轮廓 ${rows[2][4]}。全体均值 ${formatted(total / points.length)}。`,
        columns: ["样本", "所在簇", "簇内均距", "对侧均距", "轮廓系数"],
        rows,
      };
    },
  },
  "marginal-count-table": {
    title: "按行列合计，切换分母",
    fields: [
      { label: "普通且准时", initial: 15, min: 0, max: 100 },
      { label: "普通且超时", initial: 5, min: 0, max: 100 },
      { label: "高峰且准时", initial: 10, min: 0, max: 100 },
      { label: "高峰且超时", initial: 20, min: 0, max: 100 },
    ],
    evaluate: ([regularOnTime, regularLate, peakOnTime, peakLate]) => {
      const regular = regularOnTime + regularLate;
      const peak = peakOnTime + peakLate;
      const onTime = regularOnTime + peakOnTime;
      const late = regularLate + peakLate;
      const total = regular + peak;
      return {
        caption: `总体超时率 ${percent(late, total)}。高峰组内超时率 ${percent(peakLate, peak)}。`,
        columns: ["时段", "准时（条）", "超时（条）", "行合计", "占全量"],
        rows: [["普通", regularOnTime, regularLate, regular, percent(regular, total)],
          ["高峰", peakOnTime, peakLate, peak, percent(peak, total)], ["列合计", onTime, late, total, percent(total, total)]],
      };
    },
  },
} satisfies Record<string, Model>;
