import { kMeansEngine } from "@/lib/experiments/kMeans";
import type { Model } from "./teachingModels";

const payments = [
  { id: 101, member: 1, status: "paid" },
  { id: 102, member: 1, status: "pending" },
  { id: 201, member: 2, status: "pending" },
  { id: 401, member: 4, status: null },
  { id: 501, member: 5, status: "paid" },
  { id: 502, member: 5, status: "paid" },
];
const members = [1, 2, 3, 4, 5];
const samples = [0, 2, 6, 8];
const seededCenters = [[0], [0, 8], [2, 6]];

export const teachingModelsDbAi = {
  "outer-join-predicate": {
    title: "把状态条件挪一挪",
    fields: [
      { label: "筛选写法", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "ON 加状态条件" }, { value: 1, label: "WHERE 筛状态" },
        { value: 2, label: "WHERE 加空主键判断" },
      ] },
      { label: "目标状态", initial: 0, min: 0, max: 1, choices: [
        { value: 0, label: "paid" }, { value: 1, label: "pending" },
      ] },
    ],
    evaluate: ([mode, status]) => {
      const desired = status === 0 ? "paid" : "pending";
      const rows = members.flatMap((member) => {
        const matched = payments.filter((payment) => payment.member === member && (mode !== 0 || payment.status === desired));
        if (matched.length === 0) return mode === 1 ? [] : [[member, "NULL", "NULL", "补空"]];
        return matched.filter((payment) => payment.status === desired)
          .map((payment) => [member, payment.id, payment.status ?? "NULL", "配对"]);
      });
      return {
        caption: `共 ${rows.length} 行，保留 ${new Set(rows.map(([member]) => member)).size} 位会员。`,
        columns: ["会员", "缴费号", "状态", "来源"], rows,
      };
    },
  },
  "kmeans-plus-plus-seeding": {
    title: "沿权重区间抽取中心",
    fields: [
      { label: "已有中心", initial: 0, min: 0, max: 2, choices: [
        { value: 0, label: "0" }, { value: 1, label: "0 与 8" }, { value: 2, label: "2 与 6" },
      ] },
      { label: "抽签位置（%）", initial: 60, min: 0, max: 99 },
    ],
    evaluate: ([seed, position]) => {
      const centers = seededCenters[seed];
      const weights = samples.map((x) => Math.min(...centers.map((center) => (x - center) ** 2)));
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      const ticket = total * position / 100;
      let upper = 0;
      const intervals = weights.map((weight) => {
        const bounds = { lower: upper, upper: upper + weight };
        upper = bounds.upper;
        return bounds;
      });
      const selected = intervals.findIndex(({ lower, upper }) => lower <= ticket && ticket < upper);
      const center = samples[selected];
      const point = (x: number) => ({ x, y: 0 });
      const { final } = kMeansEngine.run({
        goalLabel: "用抽到的中心跑一轮。", points: samples.map(point),
        initialCenters: [...centers, center].map(point), maxIterations: 1,
      });
      return {
        caption: `总权重 ${total}。抽签落在 ${Number(ticket.toFixed(2))}，选中 ${center}。一轮更新后损失 ${Number(final.loss.toFixed(2))}。`,
        columns: ["样本", "D²", "累计区间", "本次入选"],
        rows: samples.map((x, i) => [x, weights[i], weights[i] ? `[${intervals[i].lower}, ${intervals[i].upper})` : "—",
          i === selected ? "选中" : ""]),
      };
    },
  },
} satisfies Record<string, Model>;
