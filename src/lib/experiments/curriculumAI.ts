import { defineCurriculumLab } from "./curriculumLab";

const percent = (numerator: number, denominator: number) => denominator === 0 ? "无定义" : `${(100 * numerator / denominator).toFixed(1)}%`;
const decimal = (value: number) => Number(value.toFixed(4));

export const ridgeRegressionLab = defineCurriculumLab({
  id: "ridge-regression", domain: "ai", title: "岭回归与惩罚强度",
  description: "固定训练和留出点。观察惩罚的代价。",
  comparison: "最小二乘 / 单特征岭回归",
  topics: ["ridge-lasso-penalties"],
  input: {
    ridgeTraining: { kind: "rows", columns: [[-40, 40], [-99, 99]], minItems: 2, maxItems: 16, label: "训练 X、Y", hint: "2–16 行，X 在 -40–40，Y 在 -99–99" },
    ridgeHoldout: { kind: "rows", columns: [[-40, 40], [-99, 99]], minItems: 1, maxItems: 16, label: "留出 X、Y", hint: "1–16 行，范围同训练数据" },
    ridgePenalty: { kind: "integer", min: 0, max: 100, label: "惩罚强度 λ", hint: "0–100，乘在斜率平方上" },
  },
  defaults: { goalLabel: "比较参数收缩对两组误差的影响", ridgeTraining: [[-1, -3], [1, 3]], ridgeHoldout: [[-2, -2], [2, 2]], ridgePenalty: 4 },
  columns: ["样本组", "X", "实际 Y", "普通预测", "岭回归预测", "普通误差平方", "岭回归误差平方"],
  metricLabels: { ordinaryRidgeSlope: "普通斜率", penalizedRidgeSlope: "岭回归斜率", ordinaryTrainingMse: "普通训练误差",
    ridgeTrainingMse: "岭回归训练误差", ordinaryHoldoutMse: "普通留出误差", ridgeHoldoutMse: "岭回归留出误差" },
  focusMetric: "ridgeHoldoutMse", alternateTrial: "只把 λ 从 4 改为 2。",
  run({ ridgeTraining, ridgeHoldout, ridgePenalty }) {
    const meanX = ridgeTraining.reduce((sum, [x]) => sum + x, 0) / ridgeTraining.length;
    const meanY = ridgeTraining.reduce((sum, [, y]) => sum + y, 0) / ridgeTraining.length;
    const spread = ridgeTraining.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
    const cross = ridgeTraining.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
    const ordinarySlope = spread === 0 ? 0 : cross / spread;
    const penalizedSlope = spread === 0 ? 0 : cross / (spread + ridgePenalty);
    const evaluate = (points: number[][], group: string) => {
      let ordinaryError = 0;
      let penalizedError = 0;
      const steps = points.map(([x, y]) => {
        const ordinary = meanY + ordinarySlope * (x - meanX);
        const penalized = meanY + penalizedSlope * (x - meanX);
        const oldSquaredError = (y - ordinary) ** 2;
        const newSquaredError = (y - penalized) ** 2;
        ordinaryError += oldSquaredError;
        penalizedError += newSquaredError;
        return [group, x, y, decimal(ordinary), decimal(penalized), decimal(oldSquaredError), decimal(newSquaredError)] as const;
      });
      return { steps, ordinary: decimal(ordinaryError / points.length), penalized: decimal(penalizedError / points.length) };
    };
    const train = evaluate(ridgeTraining, "训练");
    const holdout = evaluate(ridgeHoldout, "留出");
    const lead = holdout.penalized < holdout.ordinary ? "本轮岭回归留出误差更小。" :
      holdout.penalized > holdout.ordinary ? "本轮普通回归留出误差更小。" : "本轮留出误差显示值相同。";
    return { steps: [...train.steps, ...holdout.steps],
      metrics: { ordinaryRidgeSlope: decimal(ordinarySlope), penalizedRidgeSlope: decimal(penalizedSlope),
        ordinaryTrainingMse: train.ordinary, ridgeTrainingMse: train.penalized, ordinaryHoldoutMse: holdout.ordinary, ridgeHoldoutMse: holdout.penalized },
      report: {
        conclusion: lead + `两者数值为 ${holdout.ordinary} 和 ${holdout.penalized}。`,
        detail: `训练点有 ${ridgeTraining.length} 个。留出点有 ${ridgeHoldout.length} 个。普通斜率是 ${decimal(ordinarySlope)}。岭回归斜率是 ${decimal(penalizedSlope)}。训练误差为 ${train.ordinary} 和 ${train.penalized}。回放给出逐点误差。`,
        explanation: `岭回归用误差平方和。再加 λ 乘斜率平方。本轮 λ 是 ${ridgePenalty}。截距免惩罚。留出点只参与评分。两组都用均方误差报告。${spread === 0 ? "训练 X 都相同。本轮取斜率 0。" : "惩罚越大，斜率越靠近零。"}`,
        suggestion: "保持两组数据。依次试 λ 为 0、2、4。对照斜率和两组误差。",
      } };
  },
});

export const stratifiedValidationLab = defineCurriculumLab({
  id: "stratified-validation", domain: "ai", title: "分层交叉验证",
  description: "同一批样本换拆法。比较每折标签。",
  comparison: "按原顺序分块 / 按标签分层",
  topics: ["stratified-cross-validation"],
  input: {
    validationSamples: { kind: "rows", columns: [[-40, 40], [0, 1]], minItems: 2, maxItems: 30, label: "特征、标签", hint: "每行填特征 -40–40 和标签 0 或 1" },
    validationFolds: { kind: "integer", min: 2, max: 8, label: "分成几折", hint: "2–8 折，不超过样本数" },
  },
  defaults: { goalLabel: "检查分层是否减少验证折缺类", validationFolds: 3,
    validationSamples: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1]] },
  check: ({ validationSamples, validationFolds }) => validationFolds <= validationSamples.length,
  columns: ["拆法", "验证折", "验证集行号", "验证标签 0 / 1", "训练标签 0 / 1", "预测正确 / 验证数"],
  metricLabels: { plainMissingFolds: "顺序分块缺类折数", stratifiedMissingFolds: "分层缺类折数", plainValidationAccuracy: "顺序分块准确率",
    stratifiedValidationAccuracy: "分层准确率", minorityLabels: "样本中较少类别的数量" },
  focusMetric: "plainValidationAccuracy", alternateTrial: "只把折数从 3 改为 2。",
  run({ validationSamples, validationFolds }) {
    const samples = validationSamples.map(([x, label], id) => ({ x, label, id }));
    const copyFolds = () => Array.from({ length: validationFolds }, () => [] as number[]);
    const plain = copyFolds();
    const stratified = copyFolds();
    samples.forEach(({ id }) => plain[Math.floor(id * validationFolds / samples.length)].push(id));
    const zeros = samples.filter(({ label }) => label === 0);
    const ones = samples.filter(({ label }) => label === 1);
    [...zeros, ...ones].forEach(({ id }, index) => stratified[index % validationFolds].push(id));
    const minority = Math.min(zeros.length, ones.length);
    const score = (folds: number[][], method: string) => {
      let missing = 0;
      let correct = 0;
      const steps = folds.map((heldOut, index) => {
        const test = new Set(heldOut);
        const train = samples.filter(({ id }) => !test.has(id));
        const testZero = heldOut.filter((id) => samples[id].label === 0).length;
        const trainZero = zeros.length - testZero;
        if (!testZero || testZero === heldOut.length) missing++;
        let foldCorrect = 0;
        for (const id of heldOut) {
          const sample = samples[id];
          const closest = train.reduce((best, item) => Math.abs(item.x - sample.x) < Math.abs(best.x - sample.x) ? item : best);
          if (sample.label === closest.label) foldCorrect++;
        }
        correct += foldCorrect;
        return [method, index + 1, heldOut.map((id) => id + 1).join("、"), `${testZero} / ${heldOut.length - testZero}`,
          `${trainZero} / ${train.length - trainZero}`, `${foldCorrect} / ${heldOut.length}`] as const;
      });
      return { steps, missing, accuracy: percent(correct, samples.length), correct };
    };
    const blocks = score(plain, "顺序分块");
    const balanced = score(stratified, "按标签分层");
    return { steps: [...blocks.steps, ...balanced.steps],
      metrics: { plainMissingFolds: blocks.missing, stratifiedMissingFolds: balanced.missing, plainValidationAccuracy: blocks.accuracy,
        stratifiedValidationAccuracy: balanced.accuracy, minorityLabels: minority }, report: {
        conclusion: `顺序分块有 ${blocks.missing} 折缺类。分层后有 ${balanced.missing} 折缺类。`,
        detail: `两种方式各跑 ${validationFolds} 折。共 ${samples.length} 个样本。较少的类别有 ${minority} 个。分块预测对 ${blocks.correct} 个。分层预测对 ${balanced.correct} 个。回放可查每折标签数。`,
        explanation: `分层把同类样本轮流分配。每次留一折验证。只用其他折找最近邻。同距离取原行号较小者。准确率汇总逐样本结果。${minority < validationFolds ?
          "少数类样本不够每折一份。" : "分层能覆盖两类。分数仍由预测决定。"}`,
        suggestion: "先只改折数。观察缺类折数。再调换样本顺序。检查顺序分块的分数。",
      } };
  },
});

export const linearRegressionLab = defineCurriculumLab({
  id: "linear-regression", domain: "ai", title: "线性回归与残差",
  description: "拟合直线。逐点核对预测值和残差。",
  comparison: "均值预测 / 最小二乘直线",
  topics: ["linear-regression-residual-mse"],
  input: {
    regressionPoints: { kind: "rows", columns: [[-99, 99], [-99, 99]], minItems: 2, maxItems: 20, label: "训练点 X、Y", hint: "2–20 行，每行两个 -99–99 的整数" },
    regressionQuery: { kind: "integer", min: -99, max: 99, label: "待预测 X", hint: "-99–99 的整数" },
  },
  defaults: { goalLabel: "比较均值和直线的预测误差", regressionPoints: [[0, 1], [1, 3], [2, 5], [3, 7]], regressionQuery: 4 },
  columns: ["样本", "X", "实际 Y", "均值预测", "直线预测", "直线残差", "残差平方"],
  metricLabels: { regSlope: "选用斜率", regIntercept: "截距", regMse: "直线均方误差", regBaselineMse: "均值预测误差", regPrediction: "待测点预测值" },
  focusMetric: "regPrediction", alternateTrial: "保持训练点。把待预测 X 改为 5。",
  run({ regressionPoints, regressionQuery }) {
    const count = regressionPoints.length;
    const meanX = regressionPoints.reduce((sum, [x]) => sum + x, 0) / count;
    const meanY = regressionPoints.reduce((sum, [, y]) => sum + y, 0) / count;
    const xSpread = regressionPoints.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0);
    const xySpread = regressionPoints.reduce((sum, [x, y]) => sum + (x - meanX) * (y - meanY), 0);
    const slope = xSpread === 0 ? 0 : xySpread / xSpread;
    const intercept = meanY - slope * meanX;
    const predict = (x: number) => intercept + slope * x;
    let fitLoss = 0;
    let baselineLoss = 0;
    const steps = regressionPoints.map(([x, y], index) => {
      const fitted = predict(x);
      const residual = y - fitted;
      fitLoss += residual ** 2;
      baselineLoss += (y - meanY) ** 2;
      return [index + 1, x, y, decimal(meanY), decimal(fitted), decimal(residual), decimal(residual ** 2)] as const;
    });
    const regMse = decimal(fitLoss / count);
    const regBaselineMse = decimal(baselineLoss / count);
    const regPrediction = decimal(predict(regressionQuery));
    return { steps: [...steps, ["待测点", regressionQuery, "—", decimal(meanY), regPrediction, "—", "—"]],
      metrics: { regSlope: decimal(slope), regIntercept: decimal(intercept), regMse, regBaselineMse, regPrediction },
      report: {
        conclusion: `${regMse < regBaselineMse ? "直线的训练误差更小" : "两种训练误差在显示精度内相同"}。待测点预测为 ${regPrediction}。`,
        detail: `用 ${count} 个点训练。均值预测总给 ${decimal(meanY)}。直线斜率为 ${decimal(slope)}。截距为 ${decimal(intercept)}。两者均方误差为 ${regBaselineMse} 和 ${regMse}。待测 X 为 ${regressionQuery}。`,
        explanation: `残差等于实际值减预测值。把残差平方后求均值。${xSpread === 0 ?
          "所有 X 相同，斜率不唯一。本轮选斜率 0。" : "最小二乘用 X、Y 的共同变化定斜率。再让直线经过样本均值点。"}只换待测点不影响拟合。`,
        suggestion: "先只改待测 X。核对误差是否相同。再改一个训练点的 Y。观察斜率和残差。",
      } };
  },
});

export const pcaProjectionLab = defineCurriculumLab({
  id: "pca-projection", domain: "ai", title: "PCA 主方向与投影",
  description: "把二维点投到直线上。对照保留方差。",
  comparison: "手选方向 / 第一主方向",
  topics: ["pca-variance"],
  input: {
    pcaSamples: { kind: "rows", columns: [[-99, 99], [-99, 99]], minItems: 2, maxItems: 20, label: "二维点 X、Y", hint: "2–20 行，每行两个 -99–99 的整数" },
    pcaAngle: { kind: "integer", min: 0, max: 179, label: "手选角度", hint: "0–179 度，从 X 轴逆时针量" },
  },
  defaults: { goalLabel: "比较手选方向与主方向保留的方差", pcaSamples: [[0, 0], [1, 1], [2, 2], [3, 3]], pcaAngle: 0 },
  columns: ["样本", "中心化 X", "中心化 Y", "手选投影", "主轴投影"],
  metricLabels: { manualVariance: "手选轴方差", principalVariance: "主轴方差", principalAngle: "主轴角度", principalRetained: "主轴保留比例", manualRetained: "手选轴保留比例" },
  focusMetric: "manualVariance", alternateTrial: "保留同一批点。手选角度改为 45 度。",
  run({ pcaSamples, pcaAngle }) {
    const count = pcaSamples.length;
    const meanX = pcaSamples.reduce((sum, [x]) => sum + x, 0) / count;
    const meanY = pcaSamples.reduce((sum, [, y]) => sum + y, 0) / count;
    const centered = pcaSamples.map(([x, y]) => [x - meanX, y - meanY]);
    const varX = centered.reduce((sum, [x]) => sum + x ** 2, 0) / count;
    const varY = centered.reduce((sum, [, y]) => sum + y ** 2, 0) / count;
    const covariance = centered.reduce((sum, [x, y]) => sum + x * y, 0) / count;
    const totalVariance = varX + varY;
    const equalAxes = Math.hypot(varX - varY, 2 * covariance) < 1e-10;
    const hand = pcaAngle * Math.PI / 180;
    const principal = equalAxes ? hand : (0.5 * Math.atan2(2 * covariance, varX - varY) + Math.PI) % Math.PI;
    const project = (x: number, y: number, angle: number) => x * Math.cos(angle) + y * Math.sin(angle);
    let handSquares = 0;
    let principalSquares = 0;
    const steps = centered.map(([x, y], index) => {
      const handScore = project(x, y, hand);
      const principalScore = project(x, y, principal);
      handSquares += handScore ** 2;
      principalSquares += principalScore ** 2;
      return [index + 1, decimal(x), decimal(y), decimal(handScore), decimal(principalScore)] as const;
    });
    const manualVariance = decimal(handSquares / count);
    const principalVariance = decimal(principalSquares / count);
    const principalAngle = equalAxes ? "任意方向" : `${decimal(principal * 180 / Math.PI)}°`;
    const principalRetained = percent(principalSquares / count, totalVariance);
    const manualRetained = percent(handSquares / count, totalVariance);
    return { steps, metrics: { manualVariance, principalVariance, principalAngle, principalRetained, manualRetained }, report: {
      conclusion: totalVariance === 0 ? "所有点重合。两轴方差均为 0。保留比例无定义。" :
        equalAxes ? "各方向的一维方差都相同。" : principalVariance === manualVariance ?
          "手选轴与主轴的方差在显示精度内相同。" : `主轴保留更多方差。手选轴 ${manualRetained}，主轴 ${principalRetained}。`,
      detail: `共投影 ${count} 个点。手选角度为 ${pcaAngle}°。主轴为 ${principalAngle}。总方差为 ${decimal(totalVariance)}。手选轴方差 ${manualVariance}。主轴方差 ${principalVariance}。`,
      explanation: "先减去两列各自的均值。再向每条轴做投影。方差用投影平方的均值。主轴使这个值最大。用它除以总方差，就得到保留比例。",
      suggestion: "保留样本，只转动手选轴。观察靠近主轴时的保留比例。再把点改成同一个位置。",
    } };
  },
});

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

function gini(positives: number, total: number) {
  if (!total) return 0;
  const share = positives / total;
  return 2 * share * (1 - share);
}

export const treeSplitLab = defineCurriculumLab({
  id: "tree-split", domain: "ai", title: "决策树切分与基尼下降",
  description: "对比两个切分点。按子节点样本数加权，计算基尼不纯度下降。",
  comparison: "相同样本下的两种决策树阈值",
  topics: ["decision-tree-impurity"],
  input: {
    splitSamples: { kind: "rows", columns: [[-99, 99], [0, 1]], minItems: 2, maxItems: 24, label: "样本（特征, 标签）", hint: "每行 [特征, 标签]。特征 −99 至 99，标签 0 或 1。" },
    giniCutA: { kind: "integer", min: -99, max: 99, label: "切分点 A", hint: "特征小于或等于它的样本进左侧。" },
    giniCutB: { kind: "integer", min: -99, max: 99, label: "切分点 B", hint: "用相同规则测试另一个阈值。" },
  },
  defaults: { goalLabel: "找出能把两类分开的阈值。", splitSamples: [[0, 0], [2, 0], [4, 0], [6, 1], [8, 1], [10, 1]], giniCutA: 4, giniCutB: 7 },
  columns: ["样本", "特征", "标签", "A 分到", "B 分到"],
  metricLabels: { parentGini: "切分前基尼值", weightedGiniA: "A 加权基尼值", weightedGiniB: "B 加权基尼值", giniDropA: "A 基尼下降量", giniDropB: "B 基尼下降量", giniWinner: "按基尼选择" },
  focusMetric: "giniDropB",
  alternateTrial: "把两个切分点设为一样。核对基尼是否打平。",
  run({ splitSamples, giniCutA, giniCutB }) {
    const total = splitSamples.length;
    const positives = splitSamples.filter(([, label]) => label === 1).length;
    const parent = gini(positives, total);
    const split = (cut: number) => {
      const left = splitSamples.filter(([value]) => value <= cut);
      const leftPositives = left.filter(([, label]) => label === 1).length;
      const rightCount = total - left.length;
      const weighted = (left.length * gini(leftPositives, left.length) + rightCount * gini(positives - leftPositives, rightCount)) / total;
      return { left: left.length, right: rightCount, weighted, gain: Math.max(0, parent - weighted) };
    };
    const a = split(giniCutA);
    const b = split(giniCutB);
    const validA = a.left > 0 && a.right > 0;
    const validB = b.left > 0 && b.right > 0;
    const winner = !validA && !validB ? "均无有效切分" : validA && validB && Math.abs(a.gain - b.gain) < 1e-12 ? "打平" :
      (validA && (!validB || a.gain > b.gain) ? "A" : "B");
    return { steps: splitSamples.map(([value, label], i) => [i + 1, value, label, value <= giniCutA ? "左" : "右", value <= giniCutB ? "左" : "右"]),
      metrics: { parentGini: parent.toFixed(4), weightedGiniA: a.weighted.toFixed(4), weightedGiniB: b.weighted.toFixed(4),
        giniDropA: a.gain.toFixed(4), giniDropB: b.gain.toFixed(4), giniWinner: winner }, report: {
        conclusion: winner === "A" || winner === "B" ? `按基尼下降量选 ${winner}。` : `本轮${winner}。`,
        detail: `共有 ${total} 个样本。正例有 ${positives} 个。A 左侧 ${a.left} 个。B 左侧 ${b.left} 个。A 下降 ${a.gain.toFixed(4)}。B 下降 ${b.gain.toFixed(4)}。`,
        explanation: "每边先算标记混杂程度。再按样本数加权。用原值减去加权值。" +
          (validA && validB ? "本轮两种切分都分成两组。" : "有空分支的切分作废。"),
        suggestion: "固定样本和 A。只移动 B。看哪一边先变纯。",
      } };
  },
});

export const knnScalingLab = defineCurriculumLab({
  id: "knn-scaling", domain: "ai", title: "KNN 特征缩放",
  description: "比较原值距离和按训练集范围缩放的距离。观察近邻和分类结果。",
  comparison: "相同训练样本下的原值 KNN 与范围缩放 KNN",
  topics: ["knn-feature-scaling"],
  input: {
    scaleSamples: { kind: "rows", columns: [[0, 1000], [0, 1000], [0, 1]], minItems: 2, maxItems: 16, label: "训练点（X, Y, 类别）", hint: "每行 [X, Y, 类别]。坐标 0–1000，0 为 A，1 为 B。" },
    scaleQueryX: { kind: "integer", min: 0, max: 1000, label: "待分类点 X", hint: "0–1000。" },
    scaleQueryY: { kind: "integer", min: 0, max: 1000, label: "待分类点 Y", hint: "0–1000。" },
    scaleK: { kind: "integer", min: 1, max: 16, label: "邻居数 K", hint: "至少 1。不得超过训练点数。" },
  },
  defaults: { goalLabel: "观察量纲变化如何影响最近邻。", scaleSamples: [[390, 0, 0], [420, 9, 1], [0, 0, 0], [1000, 10, 1]], scaleQueryX: 400, scaleQueryY: 9, scaleK: 1 },
  check: ({ scaleSamples, scaleK }) => scaleK <= scaleSamples.length,
  columns: ["训练点", "类别", "原值距离", "缩放距离", "入选方式"],
  metricLabels: { unscaledClass: "原值分类", scaledClass: "缩放后分类", unscaledNeighbors: "原值近邻编号", scaledNeighbors: "缩放后近邻编号", changedScaleNeighbors: "替换邻居数" },
  focusMetric: "changedScaleNeighbors",
  alternateTrial: "让某一维所有训练值相同。观察距离变化。",
  run({ scaleSamples, scaleQueryX, scaleQueryY, scaleK }) {
    const xs = scaleSamples.map(([x]) => x);
    const ys = scaleSamples.map(([, y]) => y);
    const xRange = Math.max(...xs) - Math.min(...xs);
    const yRange = Math.max(...ys) - Math.min(...ys);
    const samples = scaleSamples.map(([x, y, category], index) => ({ id: index + 1, category,
      original: Math.hypot(x - scaleQueryX, y - scaleQueryY),
      scaled: Math.hypot(xRange ? (x - scaleQueryX) / xRange : 0, yRange ? (y - scaleQueryY) / yRange : 0) }));
    const neighbors = (metric: "original" | "scaled") => [...samples].sort((a, b) => a[metric] - b[metric] || a.id - b.id).slice(0, scaleK);
    const original = neighbors("original");
    const scaled = neighbors("scaled");
    const labels = ["A", "B"];
    const prediction = (nearest: typeof original) => {
      const countB = nearest.reduce((sum, sample) => sum + sample.category, 0);
      return labels[2 * countB === scaleK ? nearest[0].category : Number(2 * countB > scaleK)];
    };
    const before = new Set(original.map(({ id }) => id));
    const after = new Set(scaled.map(({ id }) => id));
    const changedScaleNeighbors = [...after].filter((id) => !before.has(id)).length;
    const unscaledClass = prediction(original);
    const scaledClass = prediction(scaled);
    return { steps: samples.map(({ id, category, original, scaled }) => [id, labels[category], original.toFixed(4), scaled.toFixed(4),
      before.has(id) && after.has(id) ? "两种都入选" : before.has(id) ? "原值入选" : after.has(id) ? "缩放入选" : "未入选"]),
      metrics: { unscaledClass, scaledClass, unscaledNeighbors: original.map(({ id }) => id).join("、"), scaledNeighbors: scaled.map(({ id }) => id).join("、"), changedScaleNeighbors }, report: {
        conclusion: `原值判为 ${unscaledClass}。缩放后判为 ${scaledClass}。`,
        detail: `训练点有 ${scaleSamples.length} 个。各选 ${scaleK} 个邻居。原值最近是 ${original[0].id} 号。缩放最近是 ${scaled[0].id} 号。`,
        explanation: `训练集 X 跨度 ${xRange}。Y 跨度 ${yRange}。` + "各维距离按训练跨度缩放。平票取最近邻类别。" +
          (xRange && yRange ? `本轮替换 ${changedScaleNeighbors} 个邻居。` : "训练跨度为零的维度忽略。"),
        suggestion: "固定训练点和 K。只移动待分类点。观察近邻何时改变。",
      } };
  },
});
