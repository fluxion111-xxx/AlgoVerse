import type { Model } from "./teachingModels";

export const netProgrammingTeachingModels = {
  "rto-backoff": {
    title: "画出重传到期时间",
    fields: [
      { label: "首个 RTT（毫秒）", initial: 400, min: 1, max: 4000 },
      { label: "连续超时次数", initial: 3, min: 1, max: 8 },
    ],
    evaluate: ([roundTripTime, timeouts]) => {
      const clockGranularity = 1;
      const minimumTimeout = 1000;
      const maximumTimeout = 60000;
      const variation = roundTripTime / 2;
      let timeout = Math.max(minimumTimeout, roundTripTime + Math.max(clockGranularity, 4 * variation));
      let elapsed = 0;
      const rows = Array.from({ length: timeouts }, (_, i) => {
        const waited = timeout;
        elapsed += waited;
        timeout = Math.min(2 * waited, maximumTimeout);
        return [i + 1, waited, elapsed, timeout];
      });
      return {
        caption: `最后一次在 ${elapsed} 毫秒重发。下次等 ${timeout} 毫秒。`,
        columns: ["第几次", "本次等待（毫秒）", "重发时刻（毫秒）", "下次等待（毫秒）"],
        rows,
      };
    },
  },
  "realloc-preserve": {
    title: "跟踪扩容与缩容",
    fields: [
      { label: "请求字节数", initial: 5, min: 1, max: 8 },
      { label: "申请结果", initial: 0, min: 0, max: 2,
        choices: [{ value: 0, label: "失败" }, { value: 1, label: "原位成功" }, { value: 2, label: "移动后成功" }] },
    ],
    evaluate: ([requested, outcome]) => {
      const oldBytes = [11, 22, 33];
      const succeeded = outcome !== 0;
      const capacity = succeeded ? requested : oldBytes.length;
      const bytes = Array.from({ length: capacity }, (_, index) =>
        [index, oldBytes[index] ?? "未初始化"]);
      return {
        caption: succeeded
          ? `${outcome === 1 ? "原位成功" : "移动后成功"}。容量为 ${capacity} 字节。请重新借用。`
          : `申请失败。旧对象仍有 ${capacity} 字节。`,
        columns: ["字节下标", "当前所有者可见的数据"],
        rows: bytes,
      };
    },
  },
} satisfies Record<string, Model>;
