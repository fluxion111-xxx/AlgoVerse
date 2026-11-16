import { defineCurriculumLab } from "./curriculumLab";

function ipNumber(input: string) {
  const parts = input.trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((value, part) => value * 256 + Number(part), 0);
}

function ipText(value: number) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

function subnet(address: number, bits: number) {
  const size = 2 ** (32 - bits);
  const first = Math.floor(address / size) * size;
  return { first, last: first + size - 1, size, mask: 2 ** 32 - size };
}

export const ipv4SubnetLab = defineCurriculumLab({
  id: "ipv4-subnet", domain: "networks", title: "IPv4 子网划分",
  description: "按 CIDR 前缀计算掩码和地址范围，检查另一地址是否落在同一子网。",
  topics: ["ipv4-subnet-network-host", "cidr-aggregate-alignment"],
  input: {
    hostIp: { kind: "text", maxLength: 15, label: "起始 IPv4 地址", hint: "点分十进制 IPv4，例如 192.168.1.101。" },
    subnetBits: { kind: "integer", min: 0, max: 32, label: "前缀长度", hint: "0–32 的整数。" },
    testIp: { kind: "text", maxLength: 15, label: "待检查地址", hint: "点分十进制 IPv4，例如 192.168.1.130。" },
  },
  defaults: { goalLabel: "看前缀长度怎样改变地址范围。", hostIp: "192.168.1.101", subnetBits: 26, testIp: "192.168.1.130" },
  check: ({ hostIp, testIp }) => ipNumber(hostIp) !== null && ipNumber(testIp) !== null,
  columns: ["操作", "地址或掩码", "得到什么"],
  metricLabels: { subnetMask: "子网掩码", subnetStart: "网络地址", subnetEnd: "地址上界", subnetSize: "区间地址数", subnetMember: "测试地址是否同网" },
  focusMetric: "subnetSize",
  alternateTrial: "把测试地址设为区间上界。观察是否仍同网。",
  run({ hostIp, subnetBits, testIp }) {
    const range = subnet(ipNumber(hostIp)!, subnetBits);
    const candidate = subnet(ipNumber(testIp)!, subnetBits);
    const same = range.first === candidate.first;
    const start = ipText(range.first);
    const end = ipText(range.last);
    const mask = ipText(range.mask);
    return {
      steps: [["划定前缀", mask, `网络位 ${subnetBits} 位`], ["主机位全置零", start, "地址下界"],
        ["主机位全置一", end, "地址上界"], ["待检查地址取前缀", ipText(candidate.first), same ? "同一子网" : "不同子网"]],
      metrics: { subnetMask: mask, subnetStart: start, subnetEnd: end, subnetSize: range.size, subnetMember: same ? "同一子网" : "不同子网" },
      report: {
        conclusion: same ? "两个地址在同一子网。" : "两个地址分属不同子网。",
        detail: `前缀长 ${subnetBits} 位。主机位有 ${32 - subnetBits} 位。区间共 ${range.size} 个地址。上下界均计入。`,
        explanation: `掩码为 ${mask}。下界为 ${start}。上界为 ${end}。` +
          `测试地址归入 ${ipText(candidate.first)}。比较前缀即可判断。`,
        suggestion: "保留两个地址。只改前缀长度。再看边界和归属。",
      },
    };
  },
});

function readRoutes(value: string) {
  const lines = value.trim().split(/\r?\n/);
  if (lines.length > 12) return null;
  const routes: { first: number; bits: number; hop: string; cidr: string }[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const match = line.trim().match(/^([\d.]+)\/(0|[1-9]\d?)\s+([A-Za-z0-9_-]{1,12})$/);
    if (!match) return null;
    const first = ipNumber(match[1]);
    const bits = Number(match[2]);
    if (first === null || bits > 32 || subnet(first, bits).first !== first) return null;
    const cidr = `${ipText(first)}/${bits}`;
    if (seen.has(cidr)) return null;
    seen.add(cidr);
    routes.push({ first, bits, hop: match[3], cidr });
  }
  return routes;
}

export const longestPrefixLab = defineCurriculumLab({
  id: "longest-prefix", domain: "networks", title: "最长前缀匹配",
  description: "检查路由表中每条 IPv4 前缀，选中覆盖目的地址的最长前缀。",
  topics: ["cidr-prefix-match"],
  input: {
    routeTable: { kind: "text", maxLength: 480, multiline: true, label: "路由表", hint: "1–12 行。每行如 10.0.0.0/8 A。前缀要对齐且不重复。" },
    packetIp: { kind: "text", maxLength: 15, label: "包的目的地址", hint: "点分十进制 IPv4，例如 10.1.2.9。" },
  },
  defaults: { goalLabel: "看多条路由匹配时如何选下一跳。", routeTable: "0.0.0.0/0 A\n10.0.0.0/8 B\n10.1.0.0/16 C\n10.1.2.0/24 D", packetIp: "10.1.2.9" },
  check: ({ routeTable, packetIp }) => readRoutes(routeTable) !== null && ipNumber(packetIp) !== null,
  columns: ["路由前缀", "下一跳", "检查结果", "当前最长匹配"],
  metricLabels: { routeChecks: "检查路由条数", routeMatches: "匹配路由条数", bestPrefix: "选中前缀", bestPrefixBits: "选中前缀长度", selectedHop: "选中下一跳" },
  focusMetric: "routeMatches",
  alternateTrial: "只删掉最长匹配。再看选中的下一跳。",
  run({ routeTable, packetIp }) {
    const routes = readRoutes(routeTable)!;
    const address = ipNumber(packetIp)!;
    let best: (typeof routes)[number] | undefined;
    let routeMatches = 0;
    const steps = routes.map((route) => {
      const match = subnet(address, route.bits).first === route.first;
      if (match) {
        routeMatches++;
        if (!best || route.bits > best.bits) best = route;
      }
      return [route.cidr, route.hop, match ? "覆盖目的地址" : "不匹配", best?.cidr ?? "—"] as const;
    });
    return { steps, metrics: { routeChecks: routes.length, routeMatches, bestPrefix: best?.cidr ?? "无", bestPrefixBits: best?.bits ?? "无", selectedHop: best?.hop ?? "无" }, report: {
      conclusion: best ? `选中 /${best.bits} 前缀。下一跳为 ${best.hop}。` : "没有匹配的路由。该表无法转发。",
      detail: `目的地址是 ${packetIp.trim()}。共检查 ${routes.length} 条。匹配 ${routeMatches} 条。` +
        (best ? `选中 ${best.cidr}。` : "所有前缀都未覆盖目标。"),
      explanation: "逐条按前缀比对地址。匹配后保留更长的一条。前缀越长范围越小。" +
        (routes.some(({ bits }) => bits === 0) ? "默认路由匹配所有地址。" : "表中没有默认路由。"),
      suggestion: "保留路由表。只换包的目的地址。再看匹配与下一跳。",
    } };
  },
});
