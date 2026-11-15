import { defineEngine, fields, goalLabel, integer } from "./engine";

type MemoryConfig = { goalLabel: string; factorialInput: number };
type StackFrame = { n: number; returned?: number };
type MemoryStep = { kind: "call" | "return" | "done"; stack: StackFrame[]; value?: number };

function configure(value: unknown): MemoryConfig | null {
  const input = fields(value, ["goalLabel", "factorialInput"]);
  const goal = goalLabel(input?.goalLabel);
  const n = input?.factorialInput;
  return goal && integer(n, 0, 10) ? { goalLabel: goal, factorialInput: n } : null;
}

export const memoryEngine = defineEngine({
  id: "memory-visualization",
  version: 1,
  domain: "programming",
  route: "/experiments/programming/memory-visualization",
  creator: {
    title: "递归调用栈",
    description: "用阶乘观察函数调用、局部参数、返回值和栈帧释放。只执行预设的阶乘模型。",
    parameters: { goalLabel: "实验目标", factorialInput: "0–10 的整数 n" },
  },
  preset: (): MemoryConfig => ({ goalLabel: "观察递归如何逐层返回。", factorialInput: 4 }),
  configure,
  validate: (value): value is MemoryConfig => configure(value) !== null,
  run({ factorialInput }: MemoryConfig) {
    const stack: StackFrame[] = [];
    const steps: MemoryStep[] = [];
    function factorial(n: number): number {
      const frame: StackFrame = { n };
      stack.push(frame);
      steps.push({ kind: "call", stack: stack.map((entry) => ({ ...entry })) });
      const value = n === 0 ? 1 : n * factorial(n - 1);
      frame.returned = value;
      steps.push({ kind: "return", stack: stack.map((entry) => ({ ...entry })), value });
      stack.pop();
      return value;
    }
    const value = factorial(factorialInput);
    steps.push({ kind: "done", stack: [], value });
    return { kind: "memory-visualization" as const, steps, value, maxDepth: Math.max(...steps.map((step) => step.stack.length)), calls: steps.filter((step) => step.kind === "call").length };
  },
});
