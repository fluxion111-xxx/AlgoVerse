import { defineCurriculumLab, sequenceText } from "./curriculumLab";

const percent = (numerator: number, denominator: number) => denominator === 0 ? "无定义" : `${(100 * numerator / denominator).toFixed(1)}%`;
const decimal = (value: number) => Number(value.toFixed(4));

export const topPSamplingLab = defineCurriculumLab({
  id: "top-p-draw", domain: "ai", title: "Top-p 采样的候选范围",
  description: "按权重选最小候选集。用种子复现抽样。",
  topics: ["llm-top-p-sampling"],
  input: {
    topPTokenWeights: { kind: "list", min: 1, max: 99, minItems: 2, maxItems: 12, label: "各候选权重", hint: "权重会归一化；按输入编号。" },
    topPCutoffPct: { kind: "integer", min: 1, max: 100, label: "累计概率门槛（%）", hint: "选累计概率达到该比例的最少前缀。" },
    topPRandomSeed: { kind: "integer", min: 0, max: 65535, label: "随机种子", hint: "相同种子可复现抽样。" },
    topPDrawTimes: { kind: "integer", min: 1, max: 20, label: "抽取次数", hint: "有放回抽样。" },
  },
  defaults: { goalLabel: "对照门槛变化后重归一化的候选集", topPTokenWeights: [50, 25, 15, 10], topPCutoffPct: 75,
    topPRandomSeed: 7, topPDrawTimes: 8 },
  columns: ["阶段", "候选或次数", "权重或随机数", "覆盖或抽中", "说明"],
  metricLabels: { topPCandidateCount: "保留候选数", topPCoverage: "保留的原概率（%）", topPChosenIds: "保留候选编号", topPDrawSequence: "抽样编号" },
  focusMetric: "topPCandidateCount", alternateTrial: "只把累计门槛改为 90。",
  run({ topPTokenWeights, topPCutoffPct, topPRandomSeed, topPDrawTimes }) {
    const sorted = topPTokenWeights.map((weight, index) => ({ weight, id: index + 1 })).sort((a, b) => b.weight - a.weight || a.id - b.id);
    const all = topPTokenWeights.reduce((sum, value) => sum + value, 0);
    const chosen: typeof sorted = [];
    let mass = 0;
    const steps: [string, number, number, number, string][] = [];
    for (const token of sorted) {
      chosen.push(token);
      mass += token.weight;
      steps.push(["筛选", token.id, token.weight, decimal(mass * 100 / all), "保留"]);
      if (mass * 100 >= all * topPCutoffPct) break;
    }
    const draw = randomSource(topPRandomSeed);
    const sequence: number[] = [];
    for (let index = 1; index <= topPDrawTimes; index++) {
      const value = draw();
      let remainder = value * mass;
      const token = chosen.find(({ weight }) => { remainder -= weight; return remainder < 0; }) ?? chosen.at(-1)!;
      sequence.push(token.id);
      steps.push(["采样", index, decimal(value), token.id, `候选内概率 ${decimal(token.weight / mass)}`]);
    }
    return { steps, metrics: { topPCandidateCount: chosen.length, topPCoverage: decimal(mass * 100 / all),
      topPChosenIds: sequenceText(chosen.map(({ id }) => id)), topPDrawSequence: sequenceText(sequence) }, report: {
      conclusion: `门槛 ${topPCutoffPct}%。保留 ${chosen.length} 个候选。`,
      detail: `原有 ${sorted.length} 个候选。保留原概率 ${decimal(mass * 100 / all)}%。抽取 ${topPDrawTimes} 次。种子是 ${topPRandomSeed}。回放列出每次抽中编号。`,
      explanation: "先按权重从大到小排。累加到门槛即停止。按保留权重再归一化。抽样只在候选内进行。相同权重按输入顺序。",
      suggestion: "固定权重与种子。只增大门槛。比较候选及抽取变化。",
    } };
  },
});

export const binaryConfidenceLab = defineCurriculumLab({
  id: "binary-confidence", domain: "ai", title: "二分类对数损失与置信度",
  description: "用同一批概率。对照判错和损失。",
  comparison: "0/1 分类错误 / 对数损失",
  topics: ["binary-log-loss-confidence"],
  input: {
    binaryConfidenceRows: { kind: "rows", columns: [[0, 100], [0, 1]], minItems: 1, maxItems: 20, label: "正类概率百分数与标签",
      hint: "预测按 50% 分类。算对数时把真类概率下限设为 0.0001。" },
  },
  defaults: { goalLabel: "观察错误次数相同时损失如何变化", binaryConfidenceRows: [[90, 1], [90, 0], [60, 0], [10, 0]] },
  columns: ["样本", "正类概率（%）", "标签", "分类结果", "分给真类的概率", "对数损失"],
  metricLabels: { binaryConfidenceErrors: "分类错误数", binaryConfidenceMeanLoss: "平均对数损失",
    binaryConfidenceWorst: "最大单例损失", binaryConfidenceWorstId: "最大损失样本编号" },
  focusMetric: "binaryConfidenceMeanLoss", alternateTrial: "把第 2 行的概率改为 60%。",
  run({ binaryConfidenceRows }) {
    let errors = 0;
    let total = 0;
    let maximum = -1;
    let worst = 1;
    const steps = binaryConfidenceRows.map(([p, label], index) => {
      const correct = Number(p >= 50) === label;
      const trueProbability = (label ? p : 100 - p) / 100;
      const loss = -Math.log(Math.max(0.0001, trueProbability));
      errors += Number(!correct);
      total += loss;
      if (loss > maximum) { maximum = loss; worst = index + 1; }
      return [index + 1, p, label, correct ? "正确" : "错误", trueProbability, decimal(loss)] as const;
    });
    const mean = decimal(total / steps.length);
    return { steps, metrics: { binaryConfidenceErrors: errors, binaryConfidenceMeanLoss: mean, binaryConfidenceWorst: decimal(maximum),
      binaryConfidenceWorstId: worst }, report: {
      conclusion: `分类错 ${errors} 题。平均对数损失为 ${mean}。`,
      detail: `共有 ${steps.length} 题。分类门槛为 50%。第 ${worst} 题损失最大。该题损失为 ${decimal(maximum)}。回放展示真类概率。`,
      explanation: "对数损失取真类概率。概率越低，惩罚越大。0/1 错误只看判对没有。本模型为避免无穷值设了概率下限。",
      suggestion: "不改标签。只降低过度自信的错误预测。核对错误数和损失。",
    } };
  },
});

export const kvProjectionCacheLab = defineCurriculumLab({
  id: "kv-projection-cache", domain: "ai", title: "KV 缓存与历史投影复用",
  description: "同一序列逐词解码。比较投影计算次数。",
  comparison: "每步重算全前缀 / 保留历史 K、V",
  topics: ["llm-kv-cache"],
  input: {
    kvToyTokens: { kind: "list", min: -5, max: 5, minItems: 1, maxItems: 14, label: "各位置标量表示", hint: "输入 1–14 个小整数，按自回归顺序。" },
    kvKeyFactor: { kind: "integer", min: -3, max: 3, label: "键投影系数", hint: "用相同系数计算两个对照组。" },
    kvValueFactor: { kind: "integer", min: -3, max: 3, label: "值投影系数", hint: "由原表示乘系数得到。" },
  },
  defaults: { goalLabel: "验证历史投影减少且注意力输出不变", kvToyTokens: [1, 2, 3, 4], kvKeyFactor: 1, kvValueFactor: 2 },
  columns: ["解码步", "重算投影数", "复用组新投影数", "已缓存标量数", "重算输出", "缓存输出"],
  metricLabels: { kvProjectionPlain: "重算组投影次数", kvProjectionCached: "缓存组投影次数", kvProjectionCacheSize: "最终缓存标量数",
    kvProjectionDotProducts: "每组点积次数", kvProjectionSame: "逐步输出一致" },
  focusMetric: "kvProjectionPlain", alternateTrial: "在序列末尾再加一项 5。",
  run({ kvToyTokens, kvKeyFactor, kvValueFactor }) {
    const project = (value: number) => ({ key: value * kvKeyFactor, val: value * kvValueFactor });
    const stored: ReturnType<typeof project>[] = [];
    const evaluate = (query: number, pairs: typeof stored) => {
      const weights = normalizedExp(pairs.map(({ key }) => key * query));
      return pairs.reduce((sum, { val }, i) => sum + val * weights[i], 0);
    };
    let plain = 0;
    let dotProducts = 0;
    let same = true;
    const steps = kvToyTokens.map((value, index) => {
      const recomputed = kvToyTokens.slice(0, index + 1).map(project);
      stored.push(project(value));
      const a = evaluate(value, recomputed);
      const b = evaluate(value, stored);
      same &&= a === b;
      plain += recomputed.length * 2;
      dotProducts += recomputed.length;
      return [index + 1, recomputed.length * 2, 2, stored.length * 2, decimal(a), decimal(b)] as const;
    });
    return { steps, metrics: { kvProjectionPlain: plain, kvProjectionCached: stored.length * 2, kvProjectionCacheSize: stored.length * 2,
      kvProjectionDotProducts: dotProducts, kvProjectionSame: same ? "是" : "否" }, report: {
      conclusion: `重算投影 ${plain} 次。缓存组投影 ${stored.length * 2} 次。`,
      detail: `一共解码 ${steps.length} 步。逐步输出${same ? "一致" : "不同"}。两组各点积 ${dotProducts} 次。最终持有 ${stored.length * 2} 个标量。回放列出每步输出。`,
      explanation: "每个位置生成 K 和 V。历史值在单层模型中固定。缓存组只投影新位置。当前查询仍看历史键。模型以标量计内存和计算。",
      suggestion: "只加长序列。检查投影数和缓存大小。再改投影系数核对输出。",
    } };
  },
});

export const reluActivationLab = defineCurriculumLab({
  id: "relu-zero-gradient", domain: "ai", title: "ReLU 的零梯度区",
  description: "从负激活开始。观察梯度能否推动更新。",
  comparison: "ReLU / 保留负区斜率的 Leaky ReLU",
  topics: ["relu-dead-neuron"],
  input: {
    reluInitialWeight: { kind: "integer", min: -10, max: 10, label: "初始权重", hint: "固定输入为 1，预激活等于权重。" },
    reluTargetOutput: { kind: "integer", min: 1, max: 12, label: "目标输出", hint: "用平方损失优化。" },
    reluLeakPct: { kind: "integer", min: 1, max: 50, label: "负区斜率百分数", hint: "仅用于 Leaky ReLU。" },
    reluTrainingTicks: { kind: "integer", min: 1, max: 16, label: "训练步数", hint: "两组学习率固定为 0.5。" },
  },
  defaults: { goalLabel: "比较负区的梯度与两种权重轨迹", reluInitialWeight: -1, reluTargetOutput: 2, reluLeakPct: 25, reluTrainingTicks: 6 },
  columns: ["步", "ReLU 梯度", "ReLU 更新后权重", "Leaky 梯度", "Leaky 更新后权重"],
  metricLabels: { reluZeroUpdates: "ReLU 零梯度步数", reluFinalWeight: "ReLU 末权重", reluLeakyFinalWeight: "Leaky 末权重",
    reluFinalLoss: "ReLU 末损失", reluLeakyFinalLoss: "Leaky 末损失" },
  focusMetric: "reluZeroUpdates", alternateTrial: "把初始权重从 -1 改为 1。",
  run({ reluInitialWeight, reluTargetOutput, reluLeakPct, reluTrainingTicks }) {
    const alpha = reluLeakPct / 100;
    const activation = (weight: number, slope: number) => weight > 0 ? weight : weight * slope;
    const gradient = (weight: number, slope: number) => (activation(weight, slope) - reluTargetOutput) * (weight > 0 ? 1 : slope);
    const loss = (weight: number, slope: number) => (activation(weight, slope) - reluTargetOutput) ** 2 / 2;
    let plain = reluInitialWeight;
    let leaky = reluInitialWeight;
    let zeros = 0;
    const steps = Array.from({ length: reluTrainingTicks }, (_, index) => {
      const first = gradient(plain, 0);
      const second = gradient(leaky, alpha);
      zeros += Number(first === 0);
      plain -= first * 0.5;
      leaky -= second * 0.5;
      return [index + 1, decimal(first), decimal(plain), decimal(second), decimal(leaky)] as const;
    });
    return { steps, metrics: { reluZeroUpdates: zeros, reluFinalWeight: decimal(plain), reluLeakyFinalWeight: decimal(leaky),
      reluFinalLoss: decimal(loss(plain, 0)), reluLeakyFinalLoss: decimal(loss(leaky, alpha)) }, report: {
      conclusion: `ReLU 有 ${zeros} 步梯度为零。末权重是 ${decimal(plain)}。`,
      detail: `起点为 ${reluInitialWeight}。目标为 ${reluTargetOutput}。两组均更新 ${steps.length} 步。负区斜率为 ${alpha}。Leaky 末权重为 ${decimal(leaky)}。`,
      explanation: "负预激活下 ReLU 输出零。局部梯度也为零。Leaky 负区仍有斜率。梯度可以继续更新。模型在零点取左侧斜率。",
      suggestion: "只改初始权重的符号。比较零梯度步数。再改负区斜率。",
    } };
  },
});

export const gradientClipLab = defineCurriculumLab({
  id: "gradient-clip", domain: "ai", title: "全局范数裁剪",
  description: "量整组梯度。按同一比例缩小。",
  comparison: "原梯度 / 按全局范数裁剪",
  topics: ["gradient-clipping-global-norm"],
  input: {
    clipGradientVector: { kind: "list", min: -30, max: 30, minItems: 1, maxItems: 12, label: "原梯度向量", hint: "每项一个梯度分量。" },
    clipGradientLimit: { kind: "integer", min: 1, max: 60, label: "范数上限", hint: "使用欧氏范数，1–60。" },
  },
  defaults: { goalLabel: "核对裁剪后的方向和长度", clipGradientVector: [6, 8], clipGradientLimit: 5 },
  columns: ["分量", "原值", "统一缩放因子", "裁剪值"],
  metricLabels: { clipGradientRawNorm: "原范数", clipGradientNorm: "裁剪后范数", clipGradientScale: "统一缩放因子", clipGradientChanged: "值变化的分量" },
  focusMetric: "clipGradientNorm", alternateTrial: "只把范数上限改为 10。",
  run({ clipGradientVector, clipGradientLimit }) {
    const raw = Math.hypot(...clipGradientVector);
    const scale = raw > clipGradientLimit ? clipGradientLimit / raw : 1;
    const clipped = clipGradientVector.map((value) => value * scale);
    const norm = Math.hypot(...clipped);
    const changed = clipped.filter((value, index) => value !== clipGradientVector[index]).length;
    const steps = clipped.map((value, index) => [index + 1, clipGradientVector[index], decimal(scale), decimal(value)] as const);
    return { steps, metrics: { clipGradientRawNorm: decimal(raw), clipGradientNorm: decimal(norm),
      clipGradientScale: decimal(scale), clipGradientChanged: changed }, report: {
      conclusion: `原范数为 ${decimal(raw)}。裁剪后为 ${decimal(norm)}。`,
      detail: `上限设为 ${clipGradientLimit}。向量有 ${steps.length} 项。统一因子是 ${decimal(scale)}。有 ${changed} 项改变。裁剪结果为 ${sequenceText(clipped.map(decimal))}。`,
      explanation: "先求整组的欧氏长度。超限才乘统一因子。因子是上限除以原长度。方向保持一致。原向量为零时无需缩放。",
      suggestion: "只提高范数上限。核对何时恢复原值。再用含零分量的向量测试。",
    } };
  },
});

export const convolutionWindowLab = defineCurriculumLab({
  id: "convolution-window", domain: "ai", title: "卷积窗口、步幅与填充",
  description: "在一维数据上滑动卷积核。",
  topics: ["convolution-output-shape", "convolution-receptive-field"],
  input: {
    convolutionSamples: { kind: "list", min: -20, max: 20, minItems: 1, maxItems: 16, label: "一维输入", hint: "填 1–16 个数。" },
    convolutionKernel: { kind: "list", min: -9, max: 9, minItems: 1, maxItems: 8, label: "卷积核", hint: "按顺序点乘，不翻转卷积核。" },
    convolutionPadding: { kind: "integer", min: 0, max: 6, label: "两端各补几格", hint: "补零。" },
    convolutionStride: { kind: "integer", min: 1, max: 8, label: "步幅", hint: "窗口每次向右走几格。" },
  },
  defaults: { goalLabel: "核对步幅对输出尺寸和取样位置的影响", convolutionSamples: [1, 2, 3, 4, 5],
    convolutionKernel: [1, 0, -1], convolutionPadding: 1, convolutionStride: 1 },
  columns: ["输出位", "对应输入范围", "窗口值", "逐项乘积", "输出"],
  metricLabels: { convolutionOutputSize: "输出长度", convolutionOutputValues: "输出序列", convolutionPaddedInput: "补零后长度",
    convolutionOperations: "标量乘法次数" },
  focusMetric: "convolutionOutputSize", alternateTrial: "只把步幅改为 2。",
  run({ convolutionSamples, convolutionKernel, convolutionPadding, convolutionStride }) {
    const padding = Array<number>(convolutionPadding).fill(0);
    const padded = [...padding, ...convolutionSamples, ...padding];
    const width = convolutionKernel.length;
    const output: number[] = [];
    const steps: [number, string, string, string, number][] = [];
    for (let left = 0; left + width <= padded.length; left += convolutionStride) {
      const window = padded.slice(left, left + width);
      const products = window.map((value, index) => value * convolutionKernel[index]);
      const value = products.reduce((sum, term) => sum + term, 0);
      output.push(value);
      steps.push([steps.length, `[${left - convolutionPadding}, ${left + width - convolutionPadding})`,
        sequenceText(window), sequenceText(products), value]);
    }
    return { steps: steps.length ? steps : [["无输出", "—", "—", "—", "核长于输入"]],
      metrics: { convolutionOutputSize: steps.length, convolutionOutputValues: sequenceText(output),
        convolutionPaddedInput: padded.length, convolutionOperations: steps.length * width }, report: {
      conclusion: `步幅为 ${convolutionStride}，得到 ${output.length} 个输出。`,
      detail: `原长 ${convolutionSamples.length}。补零后长 ${padded.length}。卷积核宽 ${width}。乘法共 ${steps.length * width} 次。结果为 ${sequenceText(output)}。`,
      explanation: "每次只处理一个完整窗口。值与对应核系数相乘。乘积相加得到输出。移动距离等于步幅。模型用深度学习常见的互相关。",
      suggestion: "只改步幅。核对输出的长度和位置。再去掉两端补零。",
    } };
  },
});

export const backwardBranchesLab = defineCurriculumLab({
  id: "backward-branches", domain: "ai", title: "反向传播与分支梯度累加",
  description: "同一个变量走两条路。核对梯度贡献。",
  comparison: "单看第一分支 / 汇总两条分支",
  topics: ["reverse-mode-gradients"],
  input: {
    backwardInput: { kind: "integer", min: -12, max: 12, label: "输入 x", hint: "选择 -12 至 12 的整数。" },
    backwardCoefficients: { kind: "list", min: -6, max: 6, minItems: 3, maxItems: 3, label: "系数 a、b、c",
      hint: "输出为 (a×x+b)² + c×x²。" },
  },
  defaults: { goalLabel: "验证分支梯度相加与中心差分一致", backwardInput: 2, backwardCoefficients: [2, 1, 3] },
  columns: ["阶段", "值", "局部求导", "对 x 的贡献"],
  metricLabels: { backwardOutput: "函数输出", backwardBranchOne: "第一支梯度", backwardBranchTwo: "第二支梯度",
    backwardTotalGradient: "总梯度", backwardNumericGradient: "中心差分梯度" },
  focusMetric: "backwardTotalGradient", alternateTrial: "只把输入 x 改为 0。",
  run({ backwardInput, backwardCoefficients }) {
    const x = backwardInput;
    const [a, b, c] = backwardCoefficients;
    const middle = a * x + b;
    const first = 2 * middle * a;
    const second = 2 * c * x;
    const together = first + second;
    const evaluate = (value: number) => (a * value + b) ** 2 + c * value ** 2;
    const output = evaluate(x);
    const h = 0.01;
    const numeric = decimal((evaluate(x + h) - evaluate(x - h)) / (2 * h));
    const steps = [
      ["第一支前向", middle ** 2, `2×${middle}×${a}`, first],
      ["第二支前向", c * x ** 2, `2×${c}×${x}`, second],
      ["求和后反传", output, `${first} + (${second})`, together],
      ["中心差分", output, "相邻两点试算", numeric],
    ] as const;
    return { steps, metrics: { backwardOutput: output, backwardBranchOne: first, backwardBranchTwo: second,
      backwardTotalGradient: together, backwardNumericGradient: numeric }, report: {
      conclusion: `两支贡献为 ${first} 和 ${second}，总梯度 ${together}。`,
      detail: `输入为 ${x}。函数输出 ${output}。仅用第一支得到 ${first}。中心差分结果为 ${numeric}。回放列出各次乘法。`,
      explanation: "共享输入影响两条分支。每条支路按链式法则求导。对同一输入的贡献要相加。中心差分只用前向值核对。这里的函数是二次式。",
      suggestion: "只改变输入。观察单支和总梯度。再取负的 c，让两支贡献相抵。",
    } };
  },
});

export const momentumUpdateLab = defineCurriculumLab({
  id: "momentum-update", domain: "ai", title: "动量更新与普通梯度下降",
  description: "同一个二次损失。对照有无历史方向。",
  comparison: "普通梯度下降 / 带动量的下降",
  topics: ["momentum-smoothed-direction"],
  input: {
    momentumStart: { kind: "integer", min: -20, max: 20, label: "初始位置", hint: "目标在 0，损失为位置平方的一半。" },
    momentumRatePct: { kind: "integer", min: 1, max: 50, label: "学习率百分数", hint: "1–50。" },
    momentumHistoryPct: { kind: "integer", min: 0, max: 95, label: "动量系数百分数", hint: "历史方向乘这个系数，再加当前梯度。" },
    momentumStepsCount: { kind: "integer", min: 1, max: 16, label: "更新步数", hint: "两组执行相同步数。" },
  },
  defaults: { goalLabel: "观察历史方向何时推动位置越过低点", momentumStart: 6, momentumRatePct: 25,
    momentumHistoryPct: 50, momentumStepsCount: 4 },
  columns: ["步", "普通位置", "普通损失", "动量方向", "动量位置", "动量损失"],
  metricLabels: { momentumPlainPos: "普通组末位置", momentumFinalPos: "动量组末位置", momentumPlainLoss: "普通组末损失",
    momentumFinalLoss: "动量组末损失", momentumCrossings: "动量越过零点次数" },
  focusMetric: "momentumFinalLoss", alternateTrial: "把动量系数改为 0。",
  run({ momentumStart, momentumRatePct, momentumHistoryPct, momentumStepsCount }) {
    const rate = momentumRatePct / 100;
    const beta = momentumHistoryPct / 100;
    const loss = (value: number) => value ** 2 / 2;
    let plain = momentumStart;
    let moving = momentumStart;
    let direction = 0;
    let crossings = 0;
    const steps = Array.from({ length: momentumStepsCount }, (_, index) => {
      plain -= rate * plain;
      direction = beta * direction + moving;
      const next = moving - rate * direction;
      crossings += Number(next * moving < 0);
      moving = next;
      return [index + 1, decimal(plain), decimal(loss(plain)), decimal(direction), decimal(moving), decimal(loss(moving))] as const;
    });
    return { steps, metrics: { momentumPlainPos: decimal(plain), momentumFinalPos: decimal(moving), momentumPlainLoss: decimal(loss(plain)),
      momentumFinalLoss: decimal(loss(moving)), momentumCrossings: crossings }, report: {
      conclusion: `普通组末损失 ${decimal(loss(plain))}。动量组为 ${decimal(loss(moving))}。`,
      detail: `两组都更新 ${steps.length} 次。起点为 ${momentumStart}。动量系数为 ${beta}。末位置分别为 ${decimal(plain)} 和 ${decimal(moving)}。动量越过零点 ${crossings} 次。`,
      explanation: "二次损失的梯度就是位置。普通组只用当前梯度。动量组还带着旧方向。它可能越过低点。表中损失取舍入前的位置计算。",
      suggestion: "只关掉动量。核对两组轨迹。再增加更新步数，看是否继续摆动。",
    } };
  },
});

function normalizedExp(values: number[]) {
  const max = Math.max(...values);
  const exp = values.map((value) => Math.exp(value - max));
  const sum = exp.reduce((total, value) => total + value, 0);
  return exp.map((value) => value / sum);
}

export const stableSoftmaxLab = defineCurriculumLab({
  id: "stable-softmax", domain: "ai", title: "Softmax 平移与数值稳定",
  description: "整体加常数。核对直接指数和稳定算法。",
  comparison: "直接求指数 / 先减最大值",
  topics: ["multiclass-softmax-shift"],
  input: {
    softmaxLogits: { kind: "list", min: -60, max: 60, minItems: 2, maxItems: 12, label: "各类别分数", hint: "填 2–12 个整数。" },
    softmaxCommonShift: { kind: "integer", min: -1000, max: 1000, label: "统一平移量", hint: "给每类分数都加同一个值。" },
  },
  defaults: { goalLabel: "检查大幅平移下的概率是否仍相同", softmaxLogits: [1, 2, 3], softmaxCommonShift: 800 },
  columns: ["类别", "平移后分数", "直接指数", "直接概率", "稳定概率", "未平移概率"],
  metricLabels: { softmaxNaiveStatus: "直接算法状态", softmaxStableTop: "稳定算法最高类别",
    softmaxStablePeak: "该类稳定概率", softmaxStableDrift: "平移前后最大概率差" },
  focusMetric: "softmaxNaiveStatus", alternateTrial: "把平移量改成 0。",
  run({ softmaxLogits, softmaxCommonShift }) {
    const shifted = softmaxLogits.map((value) => value + softmaxCommonShift);
    const raw = shifted.map((value) => Math.exp(value));
    const sum = raw.reduce((total, value) => total + value, 0);
    const valid = Number.isFinite(sum) && sum > 0;
    const stable = normalizedExp(shifted);
    const original = normalizedExp(softmaxLogits);
    const max = Math.max(...stable);
    const top = stable.indexOf(max) + 1;
    const drift = Math.max(...stable.map((value, index) => Math.abs(value - original[index])));
    const status = valid ? "可归一化" : sum === 0 ? "全部下溢" : "求和溢出";
    const steps = shifted.map((value, index) => [index + 1, value, Number.isFinite(raw[index]) ? raw[index].toExponential(2) : "溢出",
      valid ? decimal(raw[index] / sum) : "不可用", decimal(stable[index]), decimal(original[index])] as const);
    return { steps, metrics: { softmaxNaiveStatus: status, softmaxStableTop: top, softmaxStablePeak: decimal(max),
      softmaxStableDrift: decimal(drift) }, report: {
      conclusion: `直接算法${status}。稳定算法最高为第 ${top} 类。`,
      detail: `共 ${steps.length} 类。统一平移 ${softmaxCommonShift}。最高概率 ${decimal(max)}。平移前后最大概率差为 ${decimal(drift)}。回放列出各类的概率。`,
      explanation: "直接指数可能过大或过小。减最大值后，最大指数为一。分子和分母等比变化。概率应保持一致。显示值保留四位小数。",
      suggestion: "把平移量改为 0。再试负的大平移。比较直接算法和稳定概率。",
    } };
  },
});

export const causalMaskLab = defineCurriculumLab({
  id: "causal-mask", domain: "ai", title: "注意力与因果掩码",
  description: "同一查询。有掩码时只看可见位置。",
  comparison: "全序列注意力 / 只看当前与过去",
  topics: ["causal-attention-mask", "scaled-dot-product-attention"],
  input: {
    attentionQueryScalar: { kind: "integer", min: -6, max: 6, label: "一维查询值", hint: "用查询乘键得到一维点积。" },
    attentionKeyValues: { kind: "rows", columns: [[-6, 6], [-99, 99]], minItems: 2, maxItems: 12, label: "各位置的键和值",
      hint: "按位置顺序填键、值。从 1 编号。" },
    attentionVisible: { kind: "integer", min: 1, max: 12, label: "当前位置", hint: "只能看当前和之前。不能超过行数。" },
  },
  defaults: { goalLabel: "验证对未来位置的权重是否归零", attentionQueryScalar: 1,
    attentionKeyValues: [[1, 10], [0, 0], [3, 90]], attentionVisible: 2 },
  check: ({ attentionKeyValues, attentionVisible }) => attentionVisible <= attentionKeyValues.length,
  columns: ["位置", "点积", "值", "全序列权重", "掩码后权重", "掩码后贡献"],
  metricLabels: { attentionUnmaskedOutput: "全序列加权输出", attentionMaskedOutput: "掩码后加权输出",
    attentionFutureWeight: "无掩码时未来总权重", attentionVisibleCount: "可见位置数" },
  focusMetric: "attentionFutureWeight", alternateTrial: "把当前位置改为 3。",
  run({ attentionQueryScalar, attentionKeyValues, attentionVisible }) {
    const logits = attentionKeyValues.map(([key]) => key * attentionQueryScalar);
    const full = normalizedExp(logits);
    const prefix = normalizedExp(logits.slice(0, attentionVisible));
    const weighted = (weights: number[]) => attentionKeyValues.reduce((sum, [, value], index) => sum + (weights[index] ?? 0) * value, 0);
    const future = full.slice(attentionVisible).reduce((sum, value) => sum + value, 0);
    const output = weighted(prefix);
    const plain = weighted(full);
    const steps = attentionKeyValues.map(([, value], index) => {
      const weight = prefix[index] ?? 0;
      return [index + 1, logits[index], value, decimal(full[index]), decimal(weight), decimal(value * weight)] as const;
    });
    return { steps, metrics: { attentionUnmaskedOutput: decimal(plain), attentionMaskedOutput: decimal(output),
      attentionFutureWeight: decimal(future), attentionVisibleCount: attentionVisible }, report: {
      conclusion: `掩码后输出 ${decimal(output)}。未来位置权重为 0。`,
      detail: `共 ${steps.length} 个位置。可见 ${attentionVisible} 个。全序列输出 ${decimal(plain)}。无掩码未来权重合计 ${decimal(future)}。回放列出逐位置贡献。`,
      explanation: "一维键的尺度因子为一。先求查询与键的点积。只在可见位置归一化。未来位置没有权重。加权输出用每个位置的值。",
      suggestion: "把当前位置移到最后。核对两种输出。再改一个未来位置的值试试。",
    } };
  },
});

export const dropoutModeLab = defineCurriculumLab({
  id: "dropout-mode", domain: "ai", title: "Dropout 的训练与推理",
  description: "用可复现的掩码。比较两态输出。",
  comparison: "训练态随机丢弃与缩放 / 推理态原值",
  topics: ["dropout-train-inference"],
  input: {
    dropoutActivations: { kind: "list", min: -20, max: 20, minItems: 1, maxItems: 12, label: "输入激活值", hint: "填 1–12 个整数。" },
    dropoutRatePct: { kind: "integer", min: 0, max: 90, label: "丢弃概率百分数", hint: "0–90。保留值按保留概率倒数缩放。" },
    dropoutTrials: { kind: "integer", min: 1, max: 20, label: "重复前向次数", hint: "1–20。每次采样新掩码。" },
    dropoutRandomSeed: { kind: "integer", min: 0, max: 65535, label: "随机种子", hint: "固定种子可重现掩码。" },
  },
  defaults: { goalLabel: "对照随机训练输出和固定推理输出", dropoutActivations: [2, 4, 6, 8],
    dropoutRatePct: 50, dropoutTrials: 6, dropoutRandomSeed: 42 },
  columns: ["前向次数", "保留掩码", "训练态输出", "训练态总和", "推理态总和"],
  metricLabels: { dropoutMaskedCount: "丢弃位置总数", dropoutTrainMeanSum: "训练态总和的样本均值",
    dropoutInferSum: "推理态总和", dropoutMeanDelta: "训练样本均值与推理差" },
  focusMetric: "dropoutMaskedCount", alternateTrial: "只把丢弃概率改成 0。",
  run({ dropoutActivations, dropoutRatePct, dropoutTrials, dropoutRandomSeed }) {
    const random = randomSource(dropoutRandomSeed);
    const rate = dropoutRatePct / 100;
    const inference = dropoutActivations.reduce((sum, value) => sum + value, 0);
    let masked = 0;
    let total = 0;
    const steps = Array.from({ length: dropoutTrials }, (_, index) => {
      const mask = dropoutActivations.map(() => Number(random() >= rate));
      masked += mask.filter((value) => !value).length;
      const output = dropoutActivations.map((value, i) => value * mask[i] / (1 - rate));
      const sum = output.reduce((value, item) => value + item, 0);
      total += sum;
      return [index + 1, mask.join(""), output.map(decimal).join("、"), decimal(sum), inference] as const;
    });
    const mean = total / dropoutTrials;
    return { steps, metrics: { dropoutMaskedCount: masked, dropoutTrainMeanSum: decimal(mean), dropoutInferSum: inference,
      dropoutMeanDelta: decimal(mean - inference) }, report: {
      conclusion: `训练态共有 ${masked} 处丢弃。推理态总和固定为 ${inference}。`,
      detail: `重复 ${dropoutTrials} 次。每次 ${dropoutActivations.length} 个位置。丢弃率为 ${dropoutRatePct}%。训练总和均值 ${decimal(mean)}。种子为 ${dropoutRandomSeed}。`,
      explanation: "训练时随机将位置置零。保留值除以保留概率。推理态用原激活值。有限样本均值会波动。掩码的 1 表示保留。",
      suggestion: "只把丢弃率设为零。核对两态输出。再增加次数，观察均值。",
    } };
  },
});

export const rankingMetricsLab = defineCurriculumLab({
  id: "ranking-metrics", domain: "ai", title: "排序召回率与 NDCG",
  description: "同一批判断。比较命中数和排名位置。",
  comparison: "排序 A / 排序 B",
  topics: ["recall-at-k", "ndcg-discounted-position"],
  input: {
    rankingGrades: { kind: "rows", columns: [[1, 30], [0, 3]], minItems: 2, maxItems: 14, label: "编号与相关度",
      hint: "每行唯一编号和 0–3 分。大于 0 视为相关。" },
    rankingOrderA: { kind: "list", min: 1, max: 30, minItems: 2, maxItems: 14, label: "A 的排序", hint: "把所有已评分编号各排一次。" },
    rankingOrderB: { kind: "list", min: 1, max: 30, minItems: 2, maxItems: 14, label: "B 的排序", hint: "用同一批编号各排一次。" },
    rankingCutoff: { kind: "integer", min: 1, max: 14, label: "取前几项", hint: "不能超过候选数。" },
  },
  defaults: { goalLabel: "检查命中数相同但排序质量不同的情况", rankingGrades: [[1, 3], [2, 2], [3, 0], [4, 1], [5, 0]],
    rankingOrderA: [1, 2, 3, 4, 5], rankingOrderB: [3, 1, 2, 5, 4], rankingCutoff: 3 },
  check: ({ rankingGrades, rankingOrderA, rankingOrderB, rankingCutoff }) => {
    const ids = new Set(rankingGrades.map(([id]) => id));
    return ids.size === rankingGrades.length && rankingCutoff <= ids.size && [rankingOrderA, rankingOrderB]
      .every((order) => order.length === ids.size && new Set(order).size === ids.size && order.every((id) => ids.has(id)));
  },
  columns: ["名次", "A 编号 / 相关分", "A 累计增益", "B 编号 / 相关分", "B 累计增益", "理想累计增益"],
  metricLabels: { rankingRecallA: "A 召回率", rankingRecallB: "B 召回率", rankingNdcgA: "A NDCG",
    rankingNdcgB: "B NDCG", rankingRelevant: "全部相关项数" },
  focusMetric: "rankingRecallB", alternateTrial: "只把截断位置改到前 2 项。",
  run({ rankingGrades, rankingOrderA, rankingOrderB, rankingCutoff }) {
    const relevance = new Map(rankingGrades.map(([id, grade]) => [id, grade]));
    const ideal = [...relevance.values()].sort((a, b) => b - a);
    const positives = ideal.filter((grade) => grade > 0).length;
    const gain = (grade: number, rank: number) => (2 ** grade - 1) / Math.log2(rank + 1);
    let aGain = 0;
    let bGain = 0;
    let idealGain = 0;
    let aHits = 0;
    let bHits = 0;
    const steps = Array.from({ length: rankingCutoff }, (_, i) => {
      const aId = rankingOrderA[i];
      const bId = rankingOrderB[i];
      const a = relevance.get(aId)!;
      const b = relevance.get(bId)!;
      aHits += Number(a > 0);
      bHits += Number(b > 0);
      aGain += gain(a, i + 1);
      bGain += gain(b, i + 1);
      idealGain += gain(ideal[i], i + 1);
      return [i + 1, `${aId} / ${a}`, decimal(aGain), `${bId} / ${b}`, decimal(bGain), decimal(idealGain)] as const;
    });
    const aScore = idealGain ? decimal(aGain / idealGain) : "无定义";
    const bScore = idealGain ? decimal(bGain / idealGain) : "无定义";
    return { steps, metrics: { rankingRecallA: percent(aHits, positives), rankingRecallB: percent(bHits, positives),
      rankingNdcgA: aScore, rankingNdcgB: bScore, rankingRelevant: positives }, report: {
      conclusion: `A 命中 ${aHits} 项。B 命中 ${bHits} 项。NDCG 为 ${aScore} 与 ${bScore}。`,
      detail: `共有 ${ideal.length} 项。相关的有 ${positives} 项。只比较前 ${rankingCutoff} 位。召回率为 ${percent(aHits, positives)} 和 ${percent(bHits, positives)}。回放逐名次累计增益。`,
      explanation: "召回看找回了多少相关项。NDCG 也看相关程度。靠后位置增益会折损。结果除以理想顺序的增益。没有相关项时两指标无定义。",
      suggestion: "只缩小截断位置。看召回怎么变。再把最高分项向后挪。",
    } };
  },
});

export const imputationLeakageLab = defineCurriculumLab({
  id: "imputation-leakage", domain: "ai", title: "均值填补与数据泄漏",
  description: "改拟合范围。对照验证分数。",
  comparison: "仅训练集拟合 / 混入验证特征",
  topics: ["pipeline-imputation-leakage"],
  input: {
    imputationTrainRows: { kind: "rows", columns: [[-30, 30], [0, 1], [-30, 30]], minItems: 2, maxItems: 14, label: "训练样本",
      hint: "每行填特征、缺失标记、目标值。缺失标记 1 时忽略特征列。" },
    imputationValidRows: { kind: "rows", columns: [[-30, 30], [0, 1], [-30, 30]], minItems: 1, maxItems: 14, label: "验证样本",
      hint: "列顺序同训练集。至少对应 1 个目标值。" },
  },
  defaults: { goalLabel: "检查混入验证特征会不会改动评分", imputationTrainRows: [[0, 0, 0], [4, 0, 4]],
    imputationValidRows: [[10, 0, 4], [0, 1, 4]] },
  check: ({ imputationTrainRows }) => imputationTrainRows.some(([, missing]) => missing === 0),
  columns: ["验证行", "是否缺失", "目标值", "仅训练填补后的特征与预测", "混合填补后的特征与预测"],
  metricLabels: { imputationTrainMean: "仅训练集填补均值", imputationMixedMean: "混合填补均值", imputationTrainMse: "仅训练拟合的验证误差",
    imputationMixedMse: "混合拟合的验证误差", imputationChangedPredictions: "预测不同的验证行数" },
  focusMetric: "imputationMixedMse", alternateTrial: "把验证首行的特征 10 改成 2。",
  run({ imputationTrainRows, imputationValidRows }) {
    const evaluate = (fitRows: number[][]) => {
      const observed = fitRows.filter(([, missing]) => !missing);
      const mean = observed.reduce((sum, [feature]) => sum + feature, 0) / observed.length;
      const fill = ([feature, missing]: number[]) => missing ? mean : feature;
      const train = imputationTrainRows.map((row) => ({ x: fill(row), y: row[2] }));
      const predictions = imputationValidRows.map((row) => {
        const x = fill(row);
        const closest = train.reduce((best, candidate) => Math.abs(candidate.x - x) < Math.abs(best.x - x) ? candidate : best);
        return { x, score: closest.y, error: (closest.y - row[2]) ** 2 };
      });
      return { mean: decimal(mean), predictions, mse: decimal(predictions.reduce((sum, row) => sum + row.error, 0) / predictions.length) };
    };
    const trainOnly = evaluate(imputationTrainRows);
    const mixed = evaluate([...imputationTrainRows, ...imputationValidRows]);
    const display = ({ x, score, error }: typeof trainOnly.predictions[number]) => `X=${decimal(x)} · 预测 ${score} · 平方误差 ${error}`;
    const steps = imputationValidRows.map(([, missing, y], index) => [index + 1, missing ? "是" : "否", y,
      display(trainOnly.predictions[index]), display(mixed.predictions[index])] as const);
    const changed = trainOnly.predictions.filter(({ score }, index) => score !== mixed.predictions[index].score).length;
    return { steps, metrics: { imputationTrainMean: trainOnly.mean, imputationMixedMean: mixed.mean, imputationTrainMse: trainOnly.mse,
      imputationMixedMse: mixed.mse, imputationChangedPredictions: changed }, report: {
      conclusion: `仅训练组验证误差 ${trainOnly.mse}。混合组误差 ${mixed.mse}。`,
      detail: `训练 ${imputationTrainRows.length} 行。验证 ${imputationValidRows.length} 行。两组均值为 ${trainOnly.mean} 和 ${mixed.mean}。有 ${changed} 行预测不同。误差用平均平方值。`,
      explanation: "先用可见特征拟合均值。再用均值填缺失。预测只找最近的训练行。距离相同选较早的行。混合组让验证特征参加拟合。分数因此可能变化。",
      suggestion: "只改验证中一个已知特征。观察两组均值。再比较缺失行的预测。",
    } };
  },
});

export const earlyStoppingLab = defineCurriculumLab({
  id: "early-stopping", domain: "ai", title: "早停与最佳验证检查点",
  description: "边训练边评分。对照早停与跑满。",
  comparison: "验证早停并恢复最佳 / 跑满保留末轮",
  topics: ["early-stopping-best-checkpoint"],
  input: {
    stopTrainTargets: { kind: "list", min: -20, max: 20, minItems: 1, maxItems: 16, label: "训练目标值",
      hint: "1–16 个整数。模型用同一个权重预测全部目标。" },
    stopValidTargets: { kind: "list", min: -20, max: 20, minItems: 1, maxItems: 16, label: "验证目标值",
      hint: "1–16 个整数。只用于验证评分。" },
    stopRatePercent: { kind: "integer", min: 1, max: 50, label: "学习率百分数", hint: "填 1–50，表示 0.01–0.50。" },
    stopMaxEpochs: { kind: "integer", min: 1, max: 24, label: "最多训练轮数", hint: "1–24 轮。" },
    stopPatience: { kind: "integer", min: 1, max: 10, label: "耐心轮数", hint: "连续几轮无改善，就停止更新。" },
  },
  defaults: { goalLabel: "比较恢复最佳验证轮和保留末轮的误差", stopTrainTargets: [8, 12], stopValidTargets: [5, 5],
    stopRatePercent: 25, stopMaxEpochs: 6, stopPatience: 2 },
  columns: ["轮次", "权重", "训练误差", "验证误差", "早停组事件"],
  metricLabels: { stopAtEpoch: "早停组结束轮", stopBestEpoch: "早停组最佳轮", stopBestMse: "恢复最佳后的验证误差",
    stopFullMse: "跑满末轮验证误差", stopBestWeight: "恢复的权重", stopFullWeight: "跑满末轮权重" },
  focusMetric: "stopAtEpoch", alternateTrial: "只把耐心轮数从 2 改为 1。",
  run({ stopTrainTargets, stopValidTargets, stopRatePercent, stopMaxEpochs, stopPatience }) {
    const mean = stopTrainTargets.reduce((sum, y) => sum + y, 0) / stopTrainTargets.length;
    const loss = (ys: number[], weight: number) => ys.reduce((sum, y) => sum + (weight - y) ** 2, 0) / ys.length;
    let weight = 0;
    let best = { epoch: 0, weight, mse: loss(stopValidTargets, weight) };
    let stale = 0;
    let stoppedAt = 0;
    let lastMse = best.mse;
    const steps: [number, number, number, number, string][] = [[0, weight, decimal(loss(stopTrainTargets, weight)), decimal(best.mse), "保存初始权重"]];
    for (let epoch = 1; epoch <= stopMaxEpochs; epoch++) {
      weight -= 2 * (weight - mean) * stopRatePercent / 100;
      lastMse = loss(stopValidTargets, weight);
      let event = "早停组已结束";
      if (!stoppedAt) {
        if (lastMse < best.mse - 1e-12) {
          best = { epoch, weight, mse: lastMse };
          stale = 0;
          event = "更新最佳检查点";
        } else {
          stale++;
          event = `连续 ${stale} 轮未改善`;
          if (stale >= stopPatience) {
            stoppedAt = epoch;
            event = `停止 · 恢复第 ${best.epoch} 轮`;
          }
        }
        if (!stoppedAt && epoch === stopMaxEpochs) event += ` · 上限后恢复第 ${best.epoch} 轮`;
      }
      steps.push([epoch, decimal(weight), decimal(loss(stopTrainTargets, weight)), decimal(lastMse), event]);
    }
    const end = stoppedAt || stopMaxEpochs;
    return { steps, metrics: { stopAtEpoch: end, stopBestEpoch: best.epoch, stopBestMse: decimal(best.mse),
      stopFullMse: decimal(lastMse), stopBestWeight: decimal(best.weight), stopFullWeight: decimal(weight) }, report: {
      conclusion: `早停组第 ${end} 轮结束。恢复第 ${best.epoch} 轮。验证误差 ${decimal(best.mse)}。`,
      detail: `跑满组实际更新 ${stopMaxEpochs} 轮。它的末轮验证误差 ${decimal(lastMse)}。恢复组权重 ${decimal(best.weight)}。跑满组权重 ${decimal(weight)}。回放可查每轮两种误差。`,
      explanation: "训练集决定梯度。验证集只给每轮打分。最好的一轮会保存。连续无改善达到耐心值就停。实验还继续跑完对照组。第 0 轮是初始权重。",
      suggestion: "只改耐心轮数。比较何时停止、恢复哪轮。再让训练和验证目标接近。",
    } };
  },
});

export const silhouetteScoreLab = defineCurriculumLab({
  id: "silhouette-score", domain: "ai", title: "聚类轮廓系数",
  description: "逐点比较离本组和邻组的距离。",
  topics: ["silhouette-cluster-score"],
  input: {
    silhouettePoints: { kind: "rows", columns: [[-40, 40], [-40, 40]], minItems: 3, maxItems: 18, label: "各点坐标",
      hint: "每行填写 X、Y，范围 -40–40。" },
    silhouetteLabels: { kind: "list", min: 0, max: 5, minItems: 3, maxItems: 18, label: "各点组号",
      hint: "每点一个组号。至少两组，至少一组有两点。" },
  },
  defaults: { goalLabel: "找出改错分组后最不贴合的点", silhouettePoints: [[0, 0], [1, 0], [2, 0], [9, 0], [10, 0], [11, 0]],
    silhouetteLabels: [0, 0, 0, 1, 1, 1] },
  check: ({ silhouettePoints, silhouetteLabels }) => {
    const groupCount = new Set(silhouetteLabels).size;
    return silhouettePoints.length === silhouetteLabels.length && groupCount >= 2 && groupCount < silhouettePoints.length;
  },
  columns: ["点号", "组号", "组内平均距离", "最近的其他组", "邻组平均距离", "轮廓系数"],
  metricLabels: { silhouetteMean: "平均轮廓系数", silhouetteNegative: "负分点数", silhouetteWorstPoint: "最低分点号",
    silhouetteWorstScore: "最低轮廓系数", silhouetteSingletons: "单点组数量" },
  focusMetric: "silhouetteNegative", alternateTrial: "只把第 3 个点移到 1 组。",
  run({ silhouettePoints, silhouetteLabels }) {
    const groups = new Map<number, number[]>();
    silhouetteLabels.forEach((label, index) => {
      const members = groups.get(label) ?? [];
      members.push(index);
      groups.set(label, members);
    });
    const scores: number[] = [];
    let worst = 0;
    let negative = 0;
    const steps = silhouettePoints.map(([x, y], index) => {
      const label = silhouetteLabels[index];
      const distances = silhouettePoints.map(([otherX, otherY]) => Math.hypot(x - otherX, y - otherY));
      const own = groups.get(label)!;
      const a = own.length > 1 ? own.reduce((sum, id) => sum + distances[id], 0) / (own.length - 1) : 0;
      let b = Infinity;
      let neighbor = -1;
      for (const [candidate, members] of groups) {
        if (candidate === label) continue;
        const mean = members.reduce((sum, id) => sum + distances[id], 0) / members.length;
        if (mean < b || (mean === b && candidate < neighbor)) {
          b = mean;
          neighbor = candidate;
        }
      }
      const score = own.length === 1 || Math.max(a, b) === 0 ? 0 : (b - a) / Math.max(a, b);
      scores.push(score);
      if (score < scores[worst]) worst = index;
      if (score < 0) negative++;
      return [index + 1, label, own.length > 1 ? decimal(a) : "单点组", neighbor, decimal(b), decimal(score)] as const;
    });
    const mean = decimal(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const singletons = [...groups.values()].filter((members) => members.length === 1).length;
    return { steps, metrics: { silhouetteMean: mean, silhouetteNegative: negative, silhouetteWorstPoint: worst + 1,
      silhouetteWorstScore: decimal(scores[worst]), silhouetteSingletons: singletons }, report: {
      conclusion: `平均轮廓系数 ${mean}。有 ${negative} 个点得负分。`,
      detail: `本轮有 ${scores.length} 个点，分成 ${groups.size} 组。最低分是第 ${worst + 1} 点。它得 ${decimal(scores[worst])} 分。单点组有 ${singletons} 个。回放可查最近的其他组。`,
      explanation: "本轮用直线距离。组内均距排除自己。组外取最近组的均距。组外均距减去组内均距。再除以两者较大值。单点组或两均距都为零时记 0。",
      suggestion: "保持坐标，只改一个组号。找出变成负分的点。再试两组出现重合点。",
    } };
  },
});

export const probabilityCalibrationLab = defineCurriculumLab({
  id: "probability-calibration", domain: "ai", title: "概率校准与 Brier 分数",
  description: "同一真实标签。对照两组预测概率。",
  comparison: "两组概率的准确率、分箱和 Brier",
  topics: ["probability-calibration-bins", "brier-binary-probability-error"],
  input: {
    calibrationRows: { kind: "rows", columns: [[0, 100], [0, 100], [0, 1]], minItems: 1, maxItems: 24, label: "A 概率、B 概率、标签",
      hint: "概率填 0–100 的整数。标签填 0 或 1。" },
    calibrationBins: { kind: "integer", min: 2, max: 10, label: "等宽箱数", hint: "将 0–100% 等宽分成 2–10 组。" },
  },
  defaults: { goalLabel: "比较相同准确率下的概率误差", calibrationRows: [[90, 60, 1], [90, 60, 0], [10, 40, 1], [10, 40, 0]], calibrationBins: 2 },
  columns: ["模型", "概率区间", "样本数", "平均预测", "正例比例", "绝对差（百分点）"],
  metricLabels: { calibrationAccuracyA: "A 分类准确率", calibrationAccuracyB: "B 分类准确率", calibrationBrierA: "A Brier 分数",
    calibrationBrierB: "B Brier 分数", calibrationGapA: "A 分箱误差（百分点）", calibrationGapB: "B 分箱误差（百分点）" },
  focusMetric: "calibrationGapB", alternateTrial: "只把箱数从 2 改为 3。",
  run({ calibrationRows, calibrationBins }) {
    const count = calibrationRows.length;
    const evaluate = (model: "A" | "B", column: number) => {
      const bins = Array.from({ length: calibrationBins }, () => ({ count: 0, total: 0, positives: 0 }));
      let squared = 0;
      let correct = 0;
      for (const row of calibrationRows) {
        const forecast = row[column];
        const actual = row[2];
        const bin = bins[Math.min(calibrationBins - 1, Math.floor(forecast * calibrationBins / 100))];
        bin.count++;
        bin.total += forecast;
        bin.positives += actual;
        squared += (forecast - 100 * actual) ** 2;
        correct += Number(Number(forecast >= 50) === actual);
      }
      let weightedGap = 0;
      const steps = bins.map(({ count: binSize, total, positives }, index) => {
        const bucket = `[${decimal(100 * index / calibrationBins)}, ${decimal(100 * (index + 1) / calibrationBins)}${index === calibrationBins - 1 ? "]" : ")"}%`;
        const gap = Math.abs(total - positives * 100);
        weightedGap += gap;
        return [model, bucket, binSize, binSize ? `${decimal(total / binSize)}%` : "—", binSize ? percent(positives, binSize) : "—",
          binSize ? decimal(gap / binSize) : "—"] as const;
      });
      return { steps, accuracy: percent(correct, count), brier: decimal(squared / (count * 10_000)), gap: decimal(weightedGap / count) };
    };
    const a = evaluate("A", 0);
    const b = evaluate("B", 1);
    return { steps: [...a.steps, ...b.steps],
      metrics: { calibrationAccuracyA: a.accuracy, calibrationAccuracyB: b.accuracy, calibrationBrierA: a.brier, calibrationBrierB: b.brier,
        calibrationGapA: a.gap, calibrationGapB: b.gap }, report: {
      conclusion: `A 的 Brier 为 ${a.brier}。B 为 ${b.brier}。${a.brier === b.brier ? "两组分数显示值相同。" :
        `${a.brier < b.brier ? "A" : "B"} 的概率平方误差更低。`}`,
      detail: `用了 ${count} 个相同标签。分类准确率各为 ${a.accuracy} 和 ${b.accuracy}。划分 ${calibrationBins} 个等宽箱。分箱误差各为 ${a.gap} 和 ${b.gap} 个百分点。空箱显示横杠。`,
      explanation: "概率达 50% 就判正。Brier 逐样本算平方误差。分箱对比均值和正例率。各箱差值按样本数加权。空箱不计。只改分箱不改 Brier。",
      suggestion: "先只改箱数。核对 Brier 是否相同。再改变概率，比较准确率和概率误差。",
    } };
  },
});

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
