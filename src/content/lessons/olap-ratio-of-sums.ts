import type { DeepLesson } from "./types";

export const ratioOfSumsLesson: DeepLesson = {
  title: "汇总比率的分子分母",
  intro: "甲组失败率 50%，乙组 10%。若要回答全站每次请求的失败率，仪表盘该显示多少？",
  goals: ["确定比率的统计对象。", "从分子和分母推导整体比率。", "区分零失败和零请求。"],
  blocks: [
    { id: "weights", kind: "explain", title: "先问每次请求还是每个组", paragraphs: [
      "全站请求等权时，每次请求贡献一个计数单位。应该汇总失败数和请求数，再相除。",
      "若每个地区等权，才先算地区失败率，再对非空地区取平均。两个数各自回答不同问题。",
      "对非空组，把分子写成组率乘组请求数。除以总请求数，就得到按分母加权的平均。",
    ], formula: "全站失败率 = Σ fᵢ / Σ nᵢ = Σ(nᵢ / Σ nⱼ)·(fᵢ / nᵢ)，加权项只取 nᵢ>0 的组" },
    { id: "trace", kind: "steps", title: "用两个请求表算一遍", steps: [
      { label: "列出计数", text: "甲组 10 个请求，失败 5 个。乙组 90 个请求，失败 9 个。组率分别为 50% 与 10%。" },
      { label: "让每个组等权", text: "算 (50%+10%)/2，得到 30%。这个数让甲、乙两组各占一半。" },
      { label: "让每个请求等权", text: "失败共 14 个，请求共 100 个，所以全站是 14%。也可用 10%×50%+90%×10% 得到同样结果。" },
      { label: "将一组置空", text: "若甲组请求和失败都为零，只剩乙组。甲组失败率未定义。整体仍可按 9/90 计算，不必把一个假零值算进去。" },
    ] },
    { id: "query", kind: "code", title: "在 SQL 保留两个计数", language: "SQL",
      source: `WITH request_counts(name, failures, attempts) AS (
  VALUES ('A', 5, 10), ('B', 9, 90)
)
SELECT SUM(failures) AS failed,
       SUM(attempts) AS total,
       1.0 * SUM(failures) / NULLIF(SUM(attempts), 0) AS pooled_rate,
       AVG(1.0 * failures / NULLIF(attempts, 0)) AS group_mean
FROM request_counts;`,
      notes: [{ lines: "1–5", text: "保存原计数，分别对分子和分母求和。" },
        { lines: "6–7", text: "用 1.0 避免整数除法。分母为零时置空。两列比率为 0.14 和 0.30。" }] },
    { id: "boundary", kind: "explain", title: "先对齐统计口径", paragraphs: [
      "相加前要核对单位、时间窗口和分组是否重叠。若同一请求出现在两组，整体计数可能重复。",
      "零失败且有请求时，失败率为零。零请求时，失败率未定义。两种结果应该分开显示。",
      "只保存四舍五入后的百分比，会丢失分母和精度。数据表最好保留可再次聚合的计数。",
    ] },
  ],
  demo: "ratio-of-aggregates",
  exercises: [
    { id: "deep-ratio-request", level: "基础", kind: "single", prompt: "每次请求等权，应使用哪种算法？", options: ["分子分母分别求和后相除", "各组百分比简单平均", "挑失败率最高的一组"],
      answer: 0, explanation: "每次请求只计一次，失败数和请求数用相同统计范围。", wrong: "先找全站请求的分母。", review: "weights" },
    { id: "deep-ratio-failure", level: "应用", kind: "integer", prompt: "默认案例的全站失败率是百分之几？", answer: 14,
      explanation: "总失败数为 14，总请求数为 100，因此是 14%。", wrong: "总比率不是把两个百分比等权相加。", review: "trace" },
    { id: "deep-ratio-boundaries", level: "挑战", kind: "multiple", prompt: "哪些判断成立？",
      options: ["全站比率按组请求数加权", "零请求组的比率一定为零", "组出现重叠时先检查重复计数", "保留原计数便于再次汇总"],
      answer: [0, 2, 3], explanation: "全站按请求计数。空分母不能求比率。按范围保存两种计数可以精确重算。", wrong: "对齐分组、分母与边界。", review: "boundary" },
  ],
  recap: ["先定谁等权。", "汇总计数后再求比。", "空分母需要明确显示。"],
  extension: "拉近两组请求数，使两种平均接近。再了解分析查询如何按列读取计数。",
  next: "columnar-analytical-scan",
  sources: [
    { title: "PostgreSQL · Aggregate Functions", href: "https://www.postgresql.org/docs/current/functions-aggregate.html" },
    { title: "PostgreSQL · NULLIF", href: "https://www.postgresql.org/docs/current/functions-conditional.html#FUNCTIONS-NULLIF" },
  ],
};
