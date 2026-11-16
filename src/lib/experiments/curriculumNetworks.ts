import { defineCurriculumLab } from "./curriculumLab";

export const tcpTimeoutLab = defineCurriculumLab({
  id: "tcp-timeout", domain: "networks", title: "TCP 超时与重传退避",
  description: "延迟一个 ACK。对照两种重传节奏。",
  comparison: "固定间隔 / TCP 式倍增退避",
  topics: ["tcp-rto-backoff"],
  input: {
    rtoInitial: { kind: "integer", min: 1, max: 16, label: "起始等待", hint: "1–16 拍" },
    rtoAckAt: { kind: "integer", min: -1, max: 4096, label: "ACK 到达时刻", hint: "-1 表示未到达，0–4096 表示到达拍" },
    rtoRetryLimit: { kind: "integer", min: 0, max: 7, label: "最多重传次数", hint: "0–7 次。首次发送单独计。" },
  },
  defaults: { goalLabel: "看迟到的确认能否赶上重传计时", rtoInitial: 2, rtoAckAt: 13, rtoRetryLimit: 5 },
  columns: ["时刻", "固定间隔", "倍增退避"],
  metricLabels: { fixedRetries: "固定间隔重传", backoffRetries: "倍增退避重传", fixedStopTick: "固定间隔结束时刻",
    backoffStopTick: "倍增退避结束时刻", fixedAck: "固定间隔结果", backoffAck: "倍增退避结果" },
  focusMetric: "backoffRetries", alternateTrial: "把 ACK 到达时刻改为第 5 拍。",
  run({ rtoInitial, rtoAckAt, rtoRetryLimit }) {
    const simulate = (backoff: boolean) => {
      let interval = rtoInitial;
      let deadline = interval;
      let retries = 0;
      const events = new Map([[0, `首发 · 等 ${interval} 拍`]]);
      for (;;) {
        if (rtoAckAt >= 0 && rtoAckAt <= deadline) {
          events.set(rtoAckAt, rtoAckAt === 0 ? "首发并收到 ACK" : "收到 ACK，停表");
          return { events, retries, stop: rtoAckAt, outcome: "收到确认" };
        }
        if (retries === rtoRetryLimit) {
          events.set(deadline, "超时 · 重试用尽");
          return { events, retries, stop: deadline, outcome: "超时结束" };
        }
        retries++;
        if (backoff) interval *= 2;
        events.set(deadline, `第 ${retries} 次重传 · 再等 ${interval} 拍`);
        deadline += interval;
      }
    };
    const fixed = simulate(false);
    const backoff = simulate(true);
    const ticks = [...new Set([...fixed.events.keys(), ...backoff.events.keys()])].sort((a, b) => a - b);
    const steps = ticks.map((tick) => [tick, fixed.events.get(tick) ?? "—", backoff.events.get(tick) ?? "—"] as const);
    return { steps, metrics: { fixedRetries: fixed.retries, backoffRetries: backoff.retries, fixedStopTick: fixed.stop,
      backoffStopTick: backoff.stop, fixedAck: fixed.outcome, backoffAck: backoff.outcome }, report: {
      conclusion: `固定间隔${fixed.outcome}。倍增退避${backoff.outcome}。`,
      detail: `${rtoAckAt < 0 ? "本轮没有 ACK。" : `ACK 设在第 ${rtoAckAt} 拍。`}固定组重传 ${fixed.retries} 次。第 ${fixed.stop} 拍结束。退避组重传 ${backoff.retries} 次。第 ${backoff.stop} 拍结束。首次发送在第 0 拍。`,
      explanation: "只追踪一个待确认段。固定组每次等同样久。退避组超时后倍增等待。同拍先处理 ACK。重试耗尽后停表。初值由参数给出。",
      suggestion: "只提前 ACK 的到达拍。核对少发了几次。再把 ACK 设成未到达。",
    } };
  },
});

export const dnsNegativeCacheLab = defineCurriculumLab({
  id: "dns-negative-cache", domain: "networks", title: "DNS 否定缓存与发布",
  description: "反复查询同一域名。看新记录何时可见。",
  comparison: "启用否定缓存 / 关闭否定缓存",
  topics: ["dns-negative-cache"],
  input: {
    dnsPublishAt: { kind: "integer", min: 0, max: 99, label: "发布时刻", hint: "0–99 拍，从该拍起可向上游查到" },
    dnsSoaTtl: { kind: "integer", min: 0, max: 20, label: "SOA 的 TTL", hint: "0–20 拍" },
    dnsSoaMinimum: { kind: "integer", min: 0, max: 20, label: "SOA 的 MINIMUM", hint: "0–20 拍，取两者中较小值" },
    dnsPositiveTtl: { kind: "integer", min: 0, max: 20, label: "记录的 TTL", hint: "0–20 拍，两组共用" },
    dnsQueryTicks: { kind: "list", min: 0, max: 99, minItems: 1, maxItems: 24, label: "查询时刻", hint: "按时间由小到大填，允许同拍查询" },
  },
  defaults: { goalLabel: "比较降低上游查询量和新记录可见性", dnsPublishAt: 5, dnsSoaTtl: 6, dnsSoaMinimum: 4,
    dnsPositiveTtl: 3, dnsQueryTicks: [0, 1, 3, 4, 5, 7, 8, 10] },
  check: ({ dnsQueryTicks }) => dnsQueryTicks.every((tick, index) => index === 0 || tick >= dnsQueryTicks[index - 1]),
  columns: ["时刻", "上游此时应答", "启用否定缓存", "关闭否定缓存"],
  metricLabels: { dnsCachedLookups: "启用组查上游次数", dnsUncachedLookups: "关闭组查上游次数", dnsStaleNegative: "发布后仍命中否定缓存",
    dnsCachedFirstVisible: "启用组首次查到", dnsUncachedFirstVisible: "关闭组首次查到" },
  focusMetric: "dnsStaleNegative", alternateTrial: "只把 SOA 的 MINIMUM 改成 0。",
  run({ dnsPublishAt, dnsSoaTtl, dnsSoaMinimum, dnsPositiveTtl, dnsQueryTicks }) {
    const negativeTtl = Math.min(dnsSoaTtl, dnsSoaMinimum);
    const simulate = (negativeCacheTtl: number) => {
      let expires = 0;
      let exists = false;
      let lookups = 0;
      let stale = 0;
      let firstVisible: number | null = null;
      const events = dnsQueryTicks.map((tick) => {
        const hit = tick < expires;
        if (!hit) {
          lookups++;
          exists = tick >= dnsPublishAt;
          expires = tick + (exists ? dnsPositiveTtl : negativeCacheTtl);
        }
        if (exists) firstVisible ??= tick;
        if (!exists && tick >= dnsPublishAt) stale++;
        return `${hit ? "缓存" : "上游"} · ${exists ? "查到记录" : "NXDOMAIN"} · ${expires > tick ? `第 ${expires} 拍到期` : "不缓存"}`;
      });
      return { events, lookups, firstVisible, stale };
    };
    const cached = simulate(negativeTtl);
    const uncached = simulate(0);
    const when = (tick: number | null) => tick === null ? "未查到" : `第 ${tick} 拍`;
    const steps = dnsQueryTicks.map((tick, index) =>
      [tick, tick >= dnsPublishAt ? "已有记录" : "名称不存在", cached.events[index], uncached.events[index]] as const);
    return { steps, metrics: { dnsCachedLookups: cached.lookups, dnsUncachedLookups: uncached.lookups, dnsStaleNegative: cached.stale,
      dnsCachedFirstVisible: cached.firstVisible ?? "未查到", dnsUncachedFirstVisible: uncached.firstVisible ?? "未查到" }, report: {
      conclusion: `缓存组查上游 ${cached.lookups} 次。对照组查 ${uncached.lookups} 次。发布后仍否定 ${cached.stale} 次。`,
      detail: `共查询 ${steps.length} 次。第 ${dnsPublishAt} 拍发布记录。启用组首次可见为${when(cached.firstVisible)}。关闭组为${when(uncached.firstVisible)}。回放区分缓存和上游。`,
      explanation: `否定缓存存 NXDOMAIN。它的寿命取两项的较小值。本轮是 ${negativeTtl} 拍。到期后才再问上游。发布记录不会清空旧缓存。两组都缓存正常应答。`,
      suggestion: "只把 MINIMUM 改为 0。比较否定命中和上游次数。再挪动发布时刻。",
    } };
  },
});

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

export const arpResolutionLab = defineCurriculumLab({
  id: "arp-resolution", domain: "networks", title: "ARP 下一跳与缓存",
  description: "找出下一跳。逐包跟踪 ARP 缓存。",
  topics: ["arp-next-hop-resolution"],
  input: {
    arpLocalIp: { kind: "text", label: "本机 IPv4", hint: "例 192.168.1.10", maxLength: 15 },
    arpGatewayIp: { kind: "text", label: "网关 IPv4", hint: "同网段的网关地址", maxLength: 15 },
    arpDestinationIp: { kind: "text", label: "目的 IPv4", hint: "与本机不同的目的地址", maxLength: 15 },
    arpPrefixBits: { kind: "integer", label: "前缀长度", hint: "0–30 位", min: 0, max: 30 },
    arpPackets: { kind: "integer", label: "发包次数", hint: "1–16 个包，每步发一个", min: 1, max: 16 },
    arpTtl: { kind: "integer", label: "缓存寿命", hint: "1–16 步，到期重新请求", min: 1, max: 16 },
  },
  defaults: { goalLabel: "查看跨网段发送和缓存到期", arpLocalIp: "192.168.1.10", arpGatewayIp: "192.168.1.1",
    arpDestinationIp: "192.168.2.20", arpPrefixBits: 24, arpPackets: 5, arpTtl: 2 },
  check({ arpLocalIp, arpGatewayIp, arpDestinationIp, arpPrefixBits }) {
    const local = ipNumber(arpLocalIp);
    const gateway = ipNumber(arpGatewayIp);
    const destination = ipNumber(arpDestinationIp);
    if (local === null || gateway === null || destination === null || local === gateway || local === destination) return false;
    const link = subnet(local, arpPrefixBits);
    return local > link.first && local < link.last && gateway > link.first && gateway < link.last &&
      destination > 0 && destination < 0xe0000000 && destination !== link.first && destination !== link.last;
  },
  columns: ["发包步", "目的 IPv4", "下一跳 IPv4", "地址解析", "链路目标 MAC", "到期步"],
  metricLabels: { arpNextHop: "下一跳 IPv4", arpDestination: "目的 IPv4", arpLookups: "ARP 请求", arpCacheHits: "缓存命中" },
  focusMetric: "arpLookups", alternateTrial: "缓存寿命改成 5。继续发送 5 次。",
  run({ arpLocalIp, arpGatewayIp, arpDestinationIp, arpPrefixBits, arpPackets, arpTtl }) {
    const local = ipNumber(arpLocalIp)!;
    const destination = ipNumber(arpDestinationIp)!;
    const localLink = subnet(local, arpPrefixBits);
    const onLink = subnet(destination, arpPrefixBits).first === localLink.first;
    const nextHop = onLink ? destination : ipNumber(arpGatewayIp)!;
    const hopText = ipText(nextHop);
    const destinationText = ipText(destination);
    const mac = ["02", "00", ...hopText.split(".").map((octet) => Number(octet).toString(16).padStart(2, "0"))].join(":");
    let expiration = 1;
    let lookups = 0;
    const steps = Array.from({ length: arpPackets }, (_, index) => {
      const tick = index + 1;
      let action = "缓存命中";
      if (tick >= expiration) {
        action = lookups === 0 ? "首次请求并学习" : "到期后重新请求";
        expiration = tick + arpTtl;
        lookups++;
      }
      return [tick, destinationText, hopText, action, mac, expiration] as const;
    });
    return { steps, metrics: { arpNextHop: hopText, arpDestination: destinationText,
      arpLookups: lookups, arpCacheHits: arpPackets - lookups }, report: {
      conclusion: `${onLink ? "同网段，直接查目的主机" : "跨网段，先查网关"}。发出 ${lookups} 次 ARP 请求。`,
      detail: `共尝试发送 ${arpPackets} 个包。缓存命中 ${arpPackets - lookups} 次。下一跳是 ${hopText}。所有包的目的仍是 ${destinationText}。模拟链路目标是 ${mac}。`,
      explanation: `用 /${arpPrefixBits} 判断是否同网段。ARP 查询本链路的下一跳。模型用固定 MAC 模拟及时应答。从学习步起缓存 ${arpTtl} 步。到期步再次发包就重新查询。`,
      suggestion: "先延长缓存寿命。比较请求时点。再单独改目的地址，试同网段。观察下一跳和链路目标。",
    } };
  },
});

export const ipv4FragmentationLab = defineCurriculumLab({
  id: "ipv4-fragmentation", domain: "networks", title: "IPv4 分片与 MTU",
  description: "逐片核算长度和偏移。对照 DF 开关。",
  topics: ["ipv4-df-fragment-needed"],
  input: {
    fragmentPayload: { kind: "integer", label: "数据长度", hint: "0–65515 字节，不含首部", min: 0, max: 65_515 },
    fragmentMtu: { kind: "integer", label: "链路 MTU", hint: "68–65535 字节，含首部", min: 68, max: 65_535 },
    fragmentDf: { kind: "integer", label: "禁止分片 DF", hint: "0 允许分片，1 禁止分片", min: 0, max: 1 },
  },
  defaults: { goalLabel: "比较分片大小和禁止分片的结果", fragmentPayload: 1_480, fragmentMtu: 600, fragmentDf: 0 },
  columns: ["片号", "原数据位置", "数据长度", "总长度", "偏移（8 字节）", "后续分片 MF"],
  metricLabels: { outputPackets: "输出包数", sentPayload: "转发数据字节", sentBytes: "输出总字节", extraHeaders: "额外首部字节" },
  focusMetric: "outputPackets", alternateTrial: "只把 DF 从 0 改成 1。",
  run({ fragmentPayload, fragmentMtu, fragmentDf }) {
    const header = 20;
    const payloadLimit = fragmentMtu - header;
    const alignedPayload = Math.floor(payloadLimit / 8) * 8;
    const tooLarge = fragmentPayload > payloadLimit;
    const dropped = tooLarge && fragmentDf === 1;
    const packets: { offset: number; bytes: number; more: boolean }[] = [];
    if (!dropped) {
      let offset = 0;
      do {
        const remaining = fragmentPayload - offset;
        const more = remaining > payloadLimit;
        const bytes = more ? alignedPayload : remaining;
        packets.push({ offset, bytes, more });
        offset += bytes;
      } while (offset < fragmentPayload);
    }
    const steps = packets.map(({ offset, bytes, more }, index) =>
      [index + 1, bytes ? `${offset}–${offset + bytes - 1}` : "空", bytes, bytes + header, offset / 8, more ? 1 : 0] as const);
    const sentPayload = packets.reduce((sum, packet) => sum + packet.bytes, 0);
    const sentBytes = sentPayload + packets.length * header;
    const extraHeaders = Math.max(0, packets.length - 1) * header;
    const sizes = packets.length <= 6 ? packets.map((packet) => packet.bytes).join("、") :
      `${packets[0].bytes}（前 ${packets.length - 1} 片）、${packets[packets.length - 1].bytes}（末片）`;
    return { steps: dropped ? [["丢弃 · 需要分片", "—", "—", "—", "—", "—"]] : steps,
      metrics: { outputPackets: packets.length, sentPayload, sentBytes, extraHeaders }, report: {
        conclusion: dropped ? "超出 MTU，且 DF 禁止分片。本跳丢弃原包。" :
          tooLarge ? `分成 ${packets.length} 片。数据完整转发。额外首部 ${extraHeaders} 字节。` : "原包符合 MTU。整包转发。",
        detail: `原包长 ${fragmentPayload + header} 字节。MTU 是 ${fragmentMtu} 字节。DF 为 ${fragmentDf}。${dropped ?
          "没有输出包。转发数据为 0 字节。" : `数据长度依次为 ${sizes} 字节。共输出 ${sentBytes} 字节。回放列出每片位置和偏移。`}`,
        explanation: `模型用 20 字节首部。每片最多装 ${payloadLimit} 字节数据。非末片按 8 字节对齐，可装 ${alignedPayload} 字节。偏移是起点除以 8。MF 为 1 表示后面还有分片。`,
        suggestion: "只切换 DF，看超长包能否转发。再增大 MTU，找出无需分片的边界。",
      } };
  },
});

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

function crcDivision(bits: string, generator: string, label: string) {
  const word = [...bits].map(Number);
  const polynomial = [...generator].map(Number);
  const steps: [string, number, string][] = [];
  for (let offset = 0; offset <= word.length - polynomial.length; offset++) {
    if (word[offset] === 0) continue;
    for (const [i, bit] of polynomial.entries()) word[offset + i] ^= bit;
    steps.push([label, offset, word.join("")]);
  }
  return { remainder: word.slice(1 - polynomial.length).join(""), steps };
}

export const crcDetectionLab = defineCurriculumLab({
  id: "crc-detection", domain: "networks", title: "CRC 差错检测",
  description: "用短生成多项式算余数。翻转指定比特，再验证接收帧。",
  topics: ["ethernet-crc-detection"],
  input: {
    crcPayload: { kind: "text", maxLength: 32, label: "原始比特串", hint: "1–32 位。只写 0 或 1。" },
    crcGenerator: { kind: "text", maxLength: 9, label: "生成多项式", hint: "2–9 位二进制。最高位和最低位须为 1。" },
    crcFlips: { kind: "list", min: 0, max: 39, minItems: 0, maxItems: 12, label: "翻转下标", hint: "下标从 0 起。按整帧编号，不重复，可留空。" },
  },
  defaults: { goalLabel: "翻转一位并检查余数。", crcPayload: "11010011101100", crcGenerator: "1011", crcFlips: [5] },
  check: ({ crcPayload, crcGenerator, crcFlips }) => /^[01]+$/.test(crcPayload) && /^1[01]*1$/.test(crcGenerator) &&
    crcFlips.every((position) => position < crcPayload.length + crcGenerator.length - 1) && new Set(crcFlips).size === crcFlips.length,
  columns: ["阶段", "异或起始下标", "当前比特串"],
  metricLabels: { sentCrc: "发送端校验位", receivedCrcRemainder: "接收校验余数", crcFlippedBits: "翻转位数", crcOutcome: "校验结果" },
  focusMetric: "crcOutcome",
  alternateTrial: "保留原帧。清空翻转下标。再看余数。",
  run({ crcPayload, crcGenerator, crcFlips }) {
    const padded = crcPayload + "0".repeat(crcGenerator.length - 1);
    const encoded = crcDivision(padded, crcGenerator, "发送端异或");
    const frame = crcPayload + encoded.remainder;
    const received = [...frame];
    for (const position of crcFlips) received[position] = received[position] === "0" ? "1" : "0";
    const checked = crcDivision(received.join(""), crcGenerator, "接收端异或");
    const detected = checked.remainder.includes("1");
    const crcOutcome = detected ? "检出误码" : crcFlips.length ? "未检出翻转" : "校验通过";
    return {
      steps: [["补零", "—", padded], ...encoded.steps, ["发送帧", "—", frame],
        ["接收帧", "—", received.join("")], ...checked.steps, ["接收余数", "—", checked.remainder]],
      metrics: { sentCrc: `0b${encoded.remainder}`, receivedCrcRemainder: `0b${checked.remainder}`, crcFlippedBits: crcFlips.length, crcOutcome },
      report: {
        conclusion: `${crcOutcome}。接收余数为 ${checked.remainder}。`,
        detail: `原始数据 ${crcPayload.length} 位。校验位 ${encoded.remainder.length} 位。整帧 ${frame.length} 位。翻转 ${crcFlips.length} 位。`,
        explanation: "发送端先补零再异或。把余数附在数据后。接收端对整帧再算余数。" +
          (detected ? "余数非零，判定帧有误码。" : "余数为零，当前校验通过。") + "某些多位翻转会漏检。",
        suggestion: "固定数据和多项式。只改翻转位置。对照接收余数。",
      },
    };
  },
});

function sendSchedule(count: number, window: number, ackDelay: number) {
  const rows: { send: number; ack: number; flight: number }[] = [];
  let outstandingFrom = 0;
  for (let i = 0; i < count; i++) {
    const send = Math.max(i === 0 ? 0 : rows[i - 1].send + 1, i < window ? 0 : rows[i - window].ack);
    while (outstandingFrom < rows.length && rows[outstandingFrom].ack <= send) outstandingFrom++;
    rows.push({ send, ack: send + ackDelay, flight: i + 1 - outstandingFrom });
  }
  return { rows, end: rows.at(-1)!.ack, peak: Math.max(...rows.map(({ flight }) => flight)) };
}

export const sendWindowLab = defineCurriculumLab({
  id: "send-window", domain: "networks", title: "停止等待与滑动窗口",
  description: "固定确认时延。比较每次等确认与允许多个包在途的发送方式。",
  comparison: "无丢包模型下的停止等待与固定发送窗口",
  topics: ["tcp-receive-window", "tcp-sequence-ack"],
  input: {
    windowPackets: { kind: "integer", min: 1, max: 32, label: "要发送的包数", hint: "1–32 包。每拍最多发 1 包。" },
    sendWindowSize: { kind: "integer", min: 1, max: 16, label: "发送窗口上限", hint: "1–16 包。满窗时等确认。" },
    windowAckDelay: { kind: "integer", min: 1, max: 40, label: "确认时延（拍）", hint: "1–40 拍。每包确认时延相同。" },
  },
  defaults: { goalLabel: "比较两种窗口的确认完成时间。", windowPackets: 8, sendWindowSize: 3, windowAckDelay: 5 },
  columns: ["包号", "停止等待发出", "停止等待确认", "滑窗发出", "滑窗确认", "滑窗在途包"],
  metricLabels: { stopWaitTicks: "停止等待完成拍数", slidingWindowTicks: "滑窗完成拍数", windowSavedTicks: "滑窗节省拍数", peakWindowPackets: "滑窗最多在途包" },
  focusMetric: "slidingWindowTicks",
  alternateTrial: "只把窗口设为 1。检查两条发送时间线。",
  run({ windowPackets, sendWindowSize, windowAckDelay }) {
    const serial = sendSchedule(windowPackets, 1, windowAckDelay);
    const parallel = sendSchedule(windowPackets, sendWindowSize, windowAckDelay);
    const windowSavedTicks = serial.end - parallel.end;
    return { steps: parallel.rows.map(({ send, ack, flight }, i) => [i + 1, serial.rows[i].send, serial.rows[i].ack, send, ack, flight]),
      metrics: { stopWaitTicks: serial.end, slidingWindowTicks: parallel.end, windowSavedTicks, peakWindowPackets: parallel.peak }, report: {
        conclusion: windowSavedTicks ? `滑窗提前 ${windowSavedTicks} 拍收齐确认。` : "两种方法同拍收齐确认。",
        detail: `各发 ${windowPackets} 个包。确认时延 ${windowAckDelay} 拍。停止等待用 ${serial.end} 拍。滑窗用 ${parallel.end} 拍。`,
        explanation: "每拍最多发 1 个包。收到确认就腾出一格。滑窗最多容纳多个在途包。" +
          `实测峰值 ${parallel.peak} 包。模型假设无丢包。`,
        suggestion: "固定包数和时延。只改窗口上限。看总拍数何时持平。",
      } };
  },
});
