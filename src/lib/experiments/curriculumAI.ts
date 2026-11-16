import { defineCurriculumLab } from "./curriculumLab";

const percent = (numerator: number, denominator: number) => denominator === 0 ? "无定义" : `${(100 * numerator / denominator).toFixed(1)}%`;

export const classificationThresholdLab = defineCurriculumLab({
  id: "classification-threshold", domain: "ai", title: "分类阈值与误报漏报",
  description: "用同一批分数对比两个阈值，统计混淆矩阵、精确率和召回率。",
  comparison: "相同分数和标签下的两个分类阈值",
  topics: ["precision-recall", "confusion-matrix-miss-types", "anomaly-score-threshold"],
  input: {
    scoredLabels: { kind: "rows", columns: [[0, 100], [0, 1]], minItems: 1, maxItems: 32, label: "样本（分数, 真值）", hint: "1–32 行，每行 [分数, 真实标签]。分数 0–100，标签 0 或 1。" },
    thresholdBefore: { kind: "integer", min: 0, max: 100, label: "阈值 A", hint: "0–100。分数达到阈值就判正。" },
    thresholdAfter: { kind: "integer", min: 0, max: 100, label: "阈值 B", hint: "0–100。分数达到阈值就判正。" },
  },
  defaults: { goalLabel: "看看提高阈值后漏掉几项。", scoredLabels: [[95, 1], [80, 1], [72, 0], [66, 1], [55, 0], [42, 1], [20, 0], [15, 0]],
    thresholdBefore: 50, thresholdAfter: 75 },
  columns: ["样本", "分数", "真值", "阈值 A 结果", "阈值 B 结果"],
  metricLabels: { falseAlarmA: "阈值 A 误报", falseAlarmB: "阈值 B 误报", missesA: "阈值 A 漏报", missesB: "阈值 B 漏报",
    precisionA: "阈值 A 精确率", precisionB: "阈值 B 精确率", recallA: "阈值 A 召回率", recallB: "阈值 B 召回率" },
  focusMetric: "missesB",
  alternateTrial: "把两个阈值设为一样。检查计数能否对齐。",
  run({ scoredLabels, thresholdBefore, thresholdAfter }) {
    const totalsA = { tp: 0, fp: 0, tn: 0, fn: 0 };
    const totalsB = { tp: 0, fp: 0, tn: 0, fn: 0 };
    const names = { tp: "判正正确", fp: "误报", tn: "判负正确", fn: "漏报" };
    const steps = scoredLabels.map(([score, label], index) => {
      const classify = (threshold: number, totals: typeof totalsA) => {
        const outcome = score >= threshold ? label === 1 ? "tp" : "fp" : label === 1 ? "fn" : "tn";
        totals[outcome]++;
        return names[outcome];
      };
      return [index + 1, score, label, classify(thresholdBefore, totalsA), classify(thresholdAfter, totalsB)] as const;
    });
    const precisionA = percent(totalsA.tp, totalsA.tp + totalsA.fp);
    const precisionB = percent(totalsB.tp, totalsB.tp + totalsB.fp);
    const recallA = percent(totalsA.tp, totalsA.tp + totalsA.fn);
    const recallB = percent(totalsB.tp, totalsB.tp + totalsB.fn);
    const change = (a: number, b: number, name: string) => a === b ? `${name}次数相同。` : `B 的${name}${b < a ? "少" : "多"} ${Math.abs(b - a)} 次。`;
    return { steps, metrics: { falseAlarmA: totalsA.fp, falseAlarmB: totalsB.fp, missesA: totalsA.fn, missesB: totalsB.fn, precisionA, precisionB, recallA, recallB }, report: {
      conclusion: change(totalsA.fp, totalsB.fp, "误报") + change(totalsA.fn, totalsB.fn, "漏报"),
      detail: `各判断 ${scoredLabels.length} 个样本。A 阈值 ${thresholdBefore}。B 阈值 ${thresholdAfter}。` +
        `A 判对正例 ${totalsA.tp} 个。B 判对正例 ${totalsB.tp} 个。A 判对负例 ${totalsA.tn} 个。B 判对负例 ${totalsB.tn} 个。`,
      explanation: "误报是把负例判成正。漏报是没找出真实正例。精确率看判正者。召回率看真实正例。" +
        `A 的召回率为 ${recallA}。B 的召回率为 ${recallB}。` + ([precisionA, precisionB, recallA, recallB].includes("无定义") ? "分母为零时标无定义。" : ""),
      suggestion: "固定分数和真值。只改阈值 B。再比误报和漏报。",
    } };
  },
});

function randomSource(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

export const epsilonGreedyLab = defineCurriculumLab({
  id: "epsilon-greedy", domain: "ai", title: "ε-贪心与探索",
  description: "对比纯贪心和 ε-贪心。两种方法共用按动作编号预生成的奖励序列。",
  comparison: "同一奖励环境下的纯贪心与 ε-贪心",
  topics: ["epsilon-greedy-action", "bandit-ucb-count-bonus"],
  input: {
    armChanceA: { kind: "integer", min: 0, max: 100, label: "动作 A 奖励率", hint: "0–100 的百分数。" },
    armChanceB: { kind: "integer", min: 0, max: 100, label: "动作 B 奖励率", hint: "0–100 的百分数。" },
    explorationRate: { kind: "integer", min: 0, max: 100, label: "随机探索比例", hint: "0–100 的百分数。探索时随机选 A 或 B。" },
    banditTurns: { kind: "integer", min: 1, max: 60, label: "尝试步数", hint: "1–60 步，每步只选一个动作。" },
    banditSeed: { kind: "integer", min: 0, max: 2147483647, label: "随机种子", hint: "0–2147483647。固定种子可复现。" },
  },
  defaults: { goalLabel: "观察探索能否发现高奖励动作。", armChanceA: 35, armChanceB: 80, explorationRate: 25, banditTurns: 24, banditSeed: 2026 },
  columns: ["步次", "纯贪心选择", "本步奖励", "ε-贪心选择", "选择原因", "本步奖励"],
  metricLabels: { greedyReward: "纯贪心总奖励", epsilonReward: "ε-贪心总奖励", greedyBChoices: "纯贪心选 B 次数",
    epsilonBChoices: "ε-贪心选 B 次数", randomChoices: "随机探索次数" },
  focusMetric: "epsilonReward",
  alternateTrial: "只把探索比例改为 0。检查两种策略能否对齐。",
  run({ armChanceA, armChanceB, explorationRate, banditTurns, banditSeed }) {
    const rewardRandom = randomSource(banditSeed);
    const explorationRandom = randomSource(banditSeed ^ 0x9e3779b9);
    const rewards = [[], []] as [number[], number[]];
    for (let i = 0; i < banditTurns; i++) {
      rewards[0].push(Number(rewardRandom() * 100 < armChanceA));
      rewards[1].push(Number(rewardRandom() * 100 < armChanceB));
    }
    const greedy = [{ count: 0, reward: 0 }, { count: 0, reward: 0 }];
    const epsilon = structuredClone(greedy);
    const pick = (state: typeof greedy, randomArm?: number) => {
      const average = (index: number) => state[index].count ? state[index].reward / state[index].count : 0;
      const arm = randomArm ?? (average(1) > average(0) ? 1 : 0);
      const reward = rewards[arm][state[arm].count++];
      state[arm].reward += reward;
      return { arm: arm ? "B" : "A", reward };
    };
    let randomChoices = 0;
    const steps = Array.from({ length: banditTurns }, (_, i) => {
      const explore = explorationRandom() * 100 < explorationRate;
      const randomArm = Math.floor(explorationRandom() * 2);
      if (explore) randomChoices++;
      const baseline = pick(greedy);
      const trial = pick(epsilon, explore ? randomArm : undefined);
      return [i + 1, baseline.arm, baseline.reward, trial.arm, explore ? "探索" : "用已知均值", trial.reward] as const;
    });
    const greedyReward = greedy[0].reward + greedy[1].reward;
    const epsilonReward = epsilon[0].reward + epsilon[1].reward;
    const gap = epsilonReward - greedyReward;
    return { steps, metrics: { greedyReward, epsilonReward, greedyBChoices: greedy[1].count, epsilonBChoices: epsilon[1].count, randomChoices }, report: {
      conclusion: gap === 0 ? "两种策略总奖励打平。" : `ε-贪心${gap > 0 ? "多" : "少"}拿 ${Math.abs(gap)} 分。`,
      detail: `各试了 ${banditTurns} 步。纯贪心得 ${greedyReward} 分。ε-贪心得 ${epsilonReward} 分。` +
        `纯贪心选 B ${greedy[1].count} 次。ε-贪心选 B ${epsilon[1].count} 次。`,
      explanation: `实际随机探索 ${randomChoices} 次。` + "其余步骤选均值更大的。均值相同时选 A。两种策略共用奖励序列。单个种子只代表本次。",
      suggestion: "固定种子与尝试步数。只改探索比例。再比总奖励。",
    } };
  },
});
