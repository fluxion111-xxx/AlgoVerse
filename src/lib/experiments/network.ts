import { defineEngine, fields, goalLabel, integer } from "./engine";

export const networkLinks = ["AB", "BD", "AC", "CD"] as const;
type LinkId = typeof networkLinks[number];
type LinkSettings = { delay: number; loss: number };
type NetworkInput = { goalLabel: string; packets: number; links: Record<LinkId, LinkSettings> };
export type NetworkConfig = NetworkInput & { seed: number };

function parseInput(value: unknown): NetworkInput | null {
  const input = fields(value, ["goalLabel", "packets", "links"]);
  const goal = goalLabel(input?.goalLabel);
  const links = fields(input?.links, networkLinks);
  if (!goal || !integer(input?.packets, 1, 30) || !links) return null;
  const entries = networkLinks.map((id) => {
    const link = fields(links[id], ["delay", "loss"]);
    return integer(link?.delay, 1, 200) && integer(link?.loss, 0, 100) ? { delay: link.delay, loss: link.loss } : null;
  });
  const [AB, BD, AC, CD] = entries;
  return AB && BD && AC && CD ? { goalLabel: goal, packets: input.packets, links: { AB, BD, AC, CD } } : null;
}

function simulate(config: NetworkConfig) {
  const { links, packets, seed } = config;
  const route: [LinkId, LinkId] = links.AB.delay + links.BD.delay <= links.AC.delay + links.CD.delay ? ["AB", "BD"] : ["AC", "CD"];
  let randomState = seed;
  function roll() {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return (randomState / 0x100000000) * 100;
  }
  const events: { packet: number; link: LinkId; at: number; state: "forwarded" | "delivered" | "dropped" }[] = [];
  let delivered = 0;
  let latencySum = 0;
  for (let packet = 1; packet <= packets; packet++) {
    let at = 0;
    for (const [index, link] of route.entries()) {
      const { delay, loss } = links[link];
      at += delay;
      if (roll() < loss) {
        events.push({ packet, link, at, state: "dropped" });
        break;
      }
      const destination = index === route.length - 1;
      events.push({ packet, link, at, state: destination ? "delivered" : "forwarded" });
      if (destination) {
        delivered += 1;
        latencySum += at;
      }
    }
  }
  return { kind: "network-transmission" as const, route, events, delivered, dropped: packets - delivered,
    lossRate: (packets - delivered) / packets, averageLatency: delivered ? latencySum / delivered : null };
}

export const networkEngine = defineEngine({
  id: "network-transmission",
  version: 1,
  domain: "networks",
  route: "/experiments/networks/network-transmission",
  creator: {
    title: "双路由丢包仿真",
    description: "固定拓扑 A→B→D 或 A→C→D。按总延迟选路，同延迟走 B。逐包、逐跳模拟独立丢包。不模拟拥塞、带宽或重传。",
    parameters: { goalLabel: "实验目标", packets: "1–30 个包",
      links: "必须给出 AB、BD、AC、CD 四条链路。每项为 {delay: 毫秒整数 1–200, loss: 百分比整数 0–100}" },
  },
  preset: (seed): NetworkConfig => ({ goalLabel: "观察链路丢包怎样影响送达。", seed, packets: 10,
    links: { AB: { delay: 10, loss: 20 }, BD: { delay: 15, loss: 0 }, AC: { delay: 20, loss: 0 }, CD: { delay: 15, loss: 0 } } }),
  configure(value, seed): NetworkConfig | null {
    const input = parseInput(value);
    return input ? { ...input, seed } : null;
  },
  validate(value): value is NetworkConfig {
    const config = fields(value, ["goalLabel", "packets", "links", "seed"]);
    return !!config && integer(config.seed, 0, 0xffffffff)
      && parseInput({ goalLabel: config.goalLabel, packets: config.packets, links: config.links }) !== null;
  },
  run: simulate,
});
