import { defineEngine, fields, goalLabel, integer } from "./engine";

export const tcpSignals = ["ack", "dup", "timeout"] as const;
type Signal = typeof tcpSignals[number];
type Phase = "slow-start" | "avoidance" | "recovery";
type TcpConfig = { goalLabel: string; initialWindow: number; initialThreshold: number; signals: Signal[] };

function configure(value: unknown): TcpConfig | null {
  const input = fields(value, ["goalLabel", "initialWindow", "initialThreshold", "signals"]);
  const goal = goalLabel(input?.goalLabel);
  const { initialWindow, initialThreshold, signals } = input ?? {};
  if (!goal || !integer(initialWindow, 1, 24) || !integer(initialThreshold, 2, 48)
    || !Array.isArray(signals) || !signals.length || signals.length > 48) return null;
  const parsed: Signal[] = [];
  for (const signal of signals) {
    const known = tcpSignals.find((item) => item === signal);
    if (!known) return null;
    parsed.push(known);
  }
  return { goalLabel: goal, initialWindow, initialThreshold, signals: parsed };
}

function simulate({ initialWindow, initialThreshold, signals }: TcpConfig) {
  let cwnd = initialWindow;
  let threshold = initialThreshold;
  let duplicates = 0;
  let recovering = false;
  const phase = (): Phase => recovering ? "recovery" : cwnd < threshold ? "slow-start" : "avoidance";
  const initialPhase = phase();
  const steps = signals.map((signal) => {
    const before = cwnd;
    const previousPhase = phase();
    let retransmit: "fast" | "timeout" | null = null;
    if (signal === "timeout") {
      threshold = Math.max(Math.floor(cwnd / 2), 2);
      cwnd = 1;
      recovering = false;
      duplicates = 0;
      retransmit = "timeout";
    } else if (signal === "dup") {
      duplicates++;
      if (recovering) {
        cwnd++;
      } else if (duplicates === 3) {
        threshold = Math.max(Math.floor(cwnd / 2), 2);
        cwnd = threshold + 3;
        recovering = true;
        retransmit = "fast";
      }
    } else {
      duplicates = 0;
      if (recovering) {
        cwnd = threshold;
        recovering = false;
      } else {
        cwnd += previousPhase === "slow-start" ? 1 : 1 / cwnd;
      }
    }
    return { signal, before, previousPhase, cwnd, threshold, phase: phase(), duplicates, retransmit };
  });
  const fastRetransmits = steps.filter(({ retransmit }) => retransmit === "fast").length;
  const timeouts = steps.filter(({ retransmit }) => retransmit === "timeout").length;
  return { kind: "tcp-congestion" as const, steps, initialPhase, final: steps.at(-1)!, fastRetransmits, timeouts };
}

export const tcpCongestionEngine = defineEngine({
  id: "tcp-congestion", version: 1, domain: "networks", route: "/experiments/networks/tcp-congestion",
  creator: {
    title: "TCP 拥塞控制",
    description: "按输入信号执行简化 Reno。以 MSS 为单位，每个新 ACK 确认一段，恢复期 ACK 结束单次丢包恢复。减窗时用当前窗口近似在途量，不发送真实数据包。",
    parameters: { goalLabel: "实验目标", initialWindow: "1–24 MSS", initialThreshold: "2–48 MSS",
      signals: "1–48 个信号，由 ack（新确认）、dup（重复确认）、timeout（超时）组成" },
  },
  preset: (): TcpConfig => ({ goalLabel: "比较快重传和超时后的窗口。", initialWindow: 4, initialThreshold: 8,
    signals: ["ack", "ack", "ack", "ack", "ack", "dup", "dup", "dup", "dup", "ack", "timeout", "ack"] }),
  configure,
  validate: (value): value is TcpConfig => configure(value) !== null,
  run: simulate,
});
