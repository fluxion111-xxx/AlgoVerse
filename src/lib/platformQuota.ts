import { platformQuota } from "./platformAI";

export type QuotaState = {
  day: number;
  minute: number;
  dailyCount: number;
  minuteCount: number;
  visitors: Record<string, number>;
};

export function reservePlatformCall(previous: QuotaState | undefined, visitor: string, now: number) {
  const day = Math.floor(now / 86_400_000);
  const minute = Math.floor(now / 60_000);
  const sameMinute = previous?.minute === minute;
  const visitors = sameMinute ? previous.visitors : {};
  const dailyCount = previous?.day === day ? previous.dailyCount : 0;
  const minuteCount = sameMinute ? previous.minuteCount : 0;
  const visitorCount = visitors[visitor] ?? 0;

  if (dailyCount >= platformQuota.totalPerDay) {
    return { blocked: "daily", retryAfter: (day + 1) * 86_400 - Math.floor(now / 1000) } as const;
  }
  if (minuteCount >= platformQuota.totalPerMinute || visitorCount >= platformQuota.visitorPerMinute) {
    return { blocked: "minute", retryAfter: (minute + 1) * 60 - Math.floor(now / 1000) } as const;
  }
  return { state: { day, minute, dailyCount: dailyCount + 1, minuteCount: minuteCount + 1,
    visitors: { ...visitors, [visitor]: visitorCount + 1 } } };
}
