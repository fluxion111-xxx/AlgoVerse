import { defineEngine, fields, goalLabel, integer } from "./engine";

type Link = { from: number; to: number; cost: number };
type RoutingConfig = {
  goalLabel: string; routerCount: number; source: number; destination: number;
  topology: Link[]; changedLink: number; newCost: number;
};

function configure(value: unknown): RoutingConfig | null {
  const input = fields(value, ["goalLabel", "routerCount", "source", "destination", "topology", "changedLink", "newCost"]);
  const goal = goalLabel(input?.goalLabel);
  const { routerCount, source, destination, topology, changedLink, newCost } = input ?? {};
  if (!goal || !integer(routerCount, 2, 10) || !integer(source, 0, routerCount - 1)
    || !integer(destination, 0, routerCount - 1) || destination === source
    || !Array.isArray(topology) || !topology.length || topology.length > 36
    || !integer(changedLink, 0, topology.length - 1) || !integer(newCost, 0, 99)) return null;
  const links: Link[] = [];
  const pairs = new Set<string>();
  for (const entry of topology) {
    const link = fields(entry, ["from", "to", "cost"]);
    if (!integer(link?.from, 0, routerCount - 1) || !integer(link?.to, 0, routerCount - 1)
      || link.from === link.to || !integer(link?.cost, 1, 99)) return null;
    const from = Math.min(link.from, link.to);
    const to = Math.max(link.from, link.to);
    const pair = `${from},${to}`;
    if (pairs.has(pair)) return null;
    pairs.add(pair);
    links.push({ from, to, cost: link.cost });
  }
  return { goalLabel: goal, routerCount, source, destination, topology: links, changedLink, newCost };
}

function shortestPaths(config: RoutingConfig, links: Link[]) {
  const neighbors = Array.from({ length: config.routerCount }, () => [] as { to: number; cost: number }[]);
  for (const { from, to, cost } of links) {
    neighbors[from].push({ to, cost });
    neighbors[to].push({ to: from, cost });
  }
  const distances = Array<number | null>(config.routerCount).fill(null);
  const previous = Array<number | null>(config.routerCount).fill(null);
  const settled = new Set<number>();
  const steps = [];
  distances[config.source] = 0;
  for (;;) {
    let chosen = -1;
    let best = Infinity;
    for (const [router, distance] of distances.entries()) {
      if (distance === null || settled.has(router) || distance >= best) continue;
      chosen = router;
      best = distance;
    }
    if (chosen === -1) break;
    settled.add(chosen);
    const updated: number[] = [];
    for (const { to, cost } of neighbors[chosen]) {
      const candidate = best + cost;
      if (distances[to] !== null && candidate >= distances[to]) continue;
      distances[to] = candidate;
      previous[to] = chosen;
      updated.push(to);
    }
    steps.push({ chosen, updated, distances: [...distances], previous: [...previous], settled: [...settled] });
  }
  const routes = distances.map((cost, router) => {
    if (cost === null) return { cost, path: [] as number[] };
    const path = [router];
    for (let parent = previous[router]; parent !== null; parent = previous[parent]) path.push(parent);
    return { cost, path: path.reverse() };
  });
  return { links, steps, routes, destination: routes[config.destination] };
}

export const dynamicRoutingEngine = defineEngine({
  id: "dynamic-routing", version: 1, domain: "networks", route: "/experiments/networks/dynamic-routing",
  creator: {
    title: "动态路由",
    description: "模拟链路状态同步后的最短路重算。比较同一来源路由器的下一跳与路径成本。链路可断开或改权重。平局优先确认编号较小的路由器。",
    parameters: { goalLabel: "实验目标", routerCount: "2–10 台，编号从 0 起", source: "源路由器", destination: "不同的目标路由器",
      topology: "1–36 条不重复双向链路，每条 {from,to,cost}，成本为 1–99",
      changedLink: "变更链路的列表下标，从 0 起", newCost: "新成本 0–99，0 表示断开" },
  },
  preset: (): RoutingConfig => ({
    goalLabel: "断开链路后重新选路。", routerCount: 5, source: 0, destination: 4, changedLink: 1, newCost: 0,
    topology: [{ from: 0, to: 1, cost: 2 }, { from: 1, to: 4, cost: 2 }, { from: 0, to: 2, cost: 3 },
      { from: 2, to: 3, cost: 2 }, { from: 3, to: 4, cost: 2 }, { from: 1, to: 2, cost: 4 }],
  }),
  configure,
  validate: (value): value is RoutingConfig => configure(value) !== null,
  run(config: RoutingConfig) {
    const changed = config.topology.map((link, index) => index === config.changedLink ? { ...link, cost: config.newCost } : link);
    return { kind: "dynamic-routing" as const, before: shortestPaths(config, config.topology), after: shortestPaths(config, changed.filter(({ cost }) => cost > 0)) };
  },
});
