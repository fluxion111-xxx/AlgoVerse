import { defineEngine, fields, goalLabel, integer } from "./engine";

type GradientConfig = { goalLabel: string; start: number; target: number; curvature: number; learningRate: number; maxSteps: number };

function configure(value: unknown): GradientConfig | null {
  const input = fields(value, ["goalLabel", "start", "target", "curvature", "learningRate", "maxSteps"]);
  const goal = goalLabel(input?.goalLabel);
  const { start, target, curvature, learningRate, maxSteps } = input ?? {};
  return goal && integer(start, -20, 20) && integer(target, -20, 20) && integer(curvature, 1, 10)
    && typeof learningRate === "number" && learningRate >= 0.001 && learningRate <= 2 && integer(maxSteps, 1, 32)
    ? { goalLabel: goal, start, target, curvature, learningRate, maxSteps } : null;
}

function simulate({ start, target, curvature, learningRate, maxSteps }: GradientConfig) {
  const measure = (position: number) => ({ position, loss: curvature * (position - target) ** 2 / 2, gradient: curvature * (position - target) });
  const initial = measure(start);
  const steps: (ReturnType<typeof measure> & { iteration: number; previousPosition: number })[] = [];
  let current = initial;
  for (let iteration = 1; iteration <= maxSteps && Math.abs(current.gradient) > 1e-6; iteration++) {
    const previousPosition = current.position;
    current = measure(current.position - learningRate * current.gradient);
    steps.push({ ...current, iteration, previousPosition });
  }
  return { kind: "gradient-descent" as const, initial, steps, final: current, converged: Math.abs(current.gradient) <= 1e-6 };
}

export const gradientDescentEngine = defineEngine({
  id: "gradient-descent",
  version: 1,
  domain: "ai",
  route: "/experiments/ai/gradient-descent",
  creator: {
    title: "梯度下降",
    description: "对一维二次损失 L(w)=a(w−b)²/2 做梯度下降。逐步计算参数、梯度与损失，梯度绝对值不超过 0.000001 时提前结束。",
    parameters: { goalLabel: "实验目标", start: "-20 至 20 的整数起点", target: "-20 至 20 的整数最小点 b",
      curvature: "1–10 的整数曲率 a", learningRate: "0.001–2 的学习率", maxSteps: "1–32 步" },
  },
  preset: (): GradientConfig => ({ goalLabel: "观察学习率与损失变化。", start: 4, target: 0, curvature: 2, learningRate: 0.25, maxSteps: 8 }),
  configure,
  validate: (value): value is GradientConfig => configure(value) !== null,
  run: simulate,
});
