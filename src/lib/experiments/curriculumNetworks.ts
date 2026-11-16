import { defineCurriculumLab, sequenceText } from "./curriculumLab";

export const tcpHandshakeLab = defineCurriculumLab({
  id: "tcp-handshake", domain: "networks", title: "TCP 握手与初始序号",
  description: "跟踪 SYN、确认号和丢包重试。",
  topics: ["tcp-three-way-sequence"],
  input: {
    handshakeClientIsn: { kind: "integer", min: 0, max: 4294967295, label: "客户端初始序号", hint: "填 32 位无符号序号。" },
    handshakeServerIsn: { kind: "integer", min: 0, max: 4294967295, label: "服务端初始序号", hint: "填 32 位无符号序号。" },
    handshakeDrop: { kind: "integer", min: 0, max: 3, label: "丢弃哪步首发", hint: "0 不丢；1 SYN；2 SYN-ACK；3 最后 ACK。重试可达。" },
  },
  defaults: { goalLabel: "核对第三次确认丢失时两端状态", handshakeClientIsn: 100, handshakeServerIsn: 900, handshakeDrop: 3 },
  columns: ["报文", "序号", "确认号", "传输", "客户端状态", "服务端状态"],
  metricLabels: { handshakeTransmissions: "握手发送报文数", handshakeRetries: "重发报文数", handshakeFinalAck: "最终发往服务端的确认号",
    handshakeClientNext: "客户端下一序号", handshakeBothEstablished: "两端均已建立" },
  focusMetric: "handshakeTransmissions", alternateTrial: "把丢弃步骤改为 0。",
  run({ handshakeClientIsn, handshakeServerIsn, handshakeDrop }) {
    const clientNext = (handshakeClientIsn + 1) % 2 ** 32;
    const serverNext = (handshakeServerIsn + 1) % 2 ** 32;
    let client = "SYN-SENT";
    let server = "LISTEN";
    let retries = 0;
    const steps: [string, number, number | string, string, string, string][] = [];
    const send = (stage: number, retry = false) => {
      const lost = !retry && stage === handshakeDrop;
      if (retry) retries++;
      if (!lost) {
        if (stage === 1) server = "SYN-RECEIVED";
        if (stage === 2) client = "ESTABLISHED";
        if (stage === 3) server = "ESTABLISHED";
      }
      const messages = ["SYN →", "← SYN-ACK", "ACK →"];
      const seq = [handshakeClientIsn, handshakeServerIsn, clientNext];
      const ack = ["—", clientNext, serverNext];
      steps.push([messages[stage - 1], seq[stage - 1], ack[stage - 1], lost ? "丢失" : retry ? "重发并送达" : "送达", client, server]);
    };
    for (const stage of [1, 2, 3]) {
      send(stage);
      if (handshakeDrop !== stage) continue;
      if (stage === 3) send(2, true);
      send(stage, true);
    }
    return { steps, metrics: { handshakeTransmissions: steps.length, handshakeRetries: retries, handshakeFinalAck: serverNext,
      handshakeClientNext: clientNext, handshakeBothEstablished: client === server && server === "ESTABLISHED" ? "是" : "否" }, report: {
      conclusion: `两端完成握手。共发送 ${steps.length} 个报文。`,
      detail: `客户端初始序号 ${handshakeClientIsn}。服务端初始序号 ${handshakeServerIsn}。共重发 ${retries} 次。最后确认号为 ${serverNext}。回放可核对各端何时就绪。`,
      explanation: "SYN 占一个序号。纯 ACK 不占额外序号。最后 ACK 丢失时一端还在等。模型让服务端再送 SYN-ACK。客户端再确认，双方才就绪。",
      suggestion: "关闭丢包，对比报文数。再把一个初始序号改为 32 位最大值。",
    } };
  },
});

export const tcpSackLab = defineCurriculumLab({
  id: "tcp-sack", domain: "networks", title: "TCP 累计确认与 SACK",
  description: "尝试乱序到达。查看确认号和缺口。",
  topics: ["tcp-sack-out-of-order-blocks", "tcp-trace-gap-dupacks-sack"],
  input: {
    sackInitialAck: { kind: "integer", min: 0, max: 999, label: "起始确认号", hint: "第一个期待的字节序号。" },
    sackArrivals: { kind: "rows", columns: [[0, 999], [1, 120]], minItems: 1, maxItems: 18, label: "到达段起点与长度",
      hint: "按到达顺序填写。允许重叠或重复。" },
  },
  defaults: { goalLabel: "观察缺口补齐前的累计确认和乱序块", sackInitialAck: 100, sackArrivals: [[100, 20], [140, 20], [160, 20], [120, 20]] },
  columns: ["到达段", "旧 ACK", "新 ACK", "SACK 区间", "判定"],
  metricLabels: { tcpSackFinalAck: "最终累计确认号", tcpSackStalls: "确认号未推进次数", tcpSackMaxBlocks: "SACK 区间峰值",
    tcpSackRemaining: "最终仍缓存区间数" },
  focusMetric: "tcpSackStalls", alternateTrial: "按序到达，120 段放到第二步。",
  run({ sackInitialAck, sackArrivals }) {
    let ack = sackInitialAck;
    let blocks: number[][] = [];
    let stalled = 0;
    let peak = 0;
    const steps = sackArrivals.map(([start, length]) => {
      const old = ack;
      const end = start + length;
      if (end > ack) blocks.push([Math.max(start, ack), end]);
      blocks.sort((a, b) => a[0] - b[0]);
      const merged: number[][] = [];
      for (const block of blocks) {
        const last = merged.at(-1);
        if (last && block[0] <= last[1]) last[1] = Math.max(last[1], block[1]);
        else merged.push(block);
      }
      if (merged[0]?.[0] === ack) ack = merged.shift()![1];
      blocks = merged;
      peak = Math.max(peak, blocks.length);
      stalled += Number(ack === old);
      return [`[${start}, ${end})`, old, ack, blocks.map(([from, to]) => `[${from}, ${to})`).join(" ") || "空",
        ack === old ? "ACK 停留" : `推进 ${ack - old} 字节`] as const;
    });
    return { steps, metrics: { tcpSackFinalAck: ack, tcpSackStalls: stalled, tcpSackMaxBlocks: peak, tcpSackRemaining: blocks.length }, report: {
      conclusion: `最终 ACK 为 ${ack}。有 ${stalled} 次到达未推进 ACK。`,
      detail: `起始 ACK 为 ${sackInitialAck}。收到 ${steps.length} 个段。连续推进 ${ack - sackInitialAck} 字节。乱序区间最多 ${peak} 个。结束仍缓存 ${blocks.length} 个。`,
      explanation: "ACK 指向下个期待字节。缺口后的段可先缓存。相邻块或重叠块会合并。缺口补齐才推进 ACK。表中按序号展示所有缓存块。",
      suggestion: "保持各段不变。只改到达次序。再追加一次重复到达。",
    } };
  },
});

export const hopLimitLab = defineCurriculumLab({
  id: "hop-limit", domain: "networks", title: "IPv6 跳数限制与路由环",
  description: "沿路由逐跳前进。查看递减和丢包。",
  topics: ["ipv6-hop-limit"],
  input: {
    hopNextRouters: { kind: "list", min: -1, max: 8, minItems: 1, maxItems: 8, label: "每台路由器的下一跳",
      hint: "从 0 编号。长度 N 代表目的端编号。-1 代表无路由。" },
    hopStartLimit: { kind: "integer", min: 1, max: 32, label: "起始 Hop Limit", hint: "从路由器 0 进入，起始 1–32。" },
  },
  defaults: { goalLabel: "对照环路停下和正常到达的路径", hopNextRouters: [1, 2, 1], hopStartLimit: 5 },
  check: ({ hopNextRouters }) => hopNextRouters.every((next) => next <= hopNextRouters.length),
  columns: ["路由器", "入站限制", "下一跳", "剩余限制", "动作"],
  metricLabels: { hopOutcome: "转发结果", hopForwards: "成功转发次数", hopRemaining: "结束剩余限制",
    hopRevisits: "重复经过路由器次数" },
  focusMetric: "hopOutcome", alternateTrial: "把路由器 2 的下一跳改成 3。",
  run({ hopNextRouters, hopStartLimit }) {
    const seen = new Set<number>();
    const steps: [number, number, number | string, number, string][] = [];
    let router = 0;
    let limit = hopStartLimit;
    let visits = 0;
    let forwards = 0;
    let outcome = "送达";
    while (router < hopNextRouters.length) {
      visits += Number(seen.has(router));
      seen.add(router);
      const next = hopNextRouters[router];
      const inbound = limit;
      if (next === -1) {
        outcome = "无路由";
        steps.push([router, inbound, "—", limit, outcome]);
        break;
      }
      limit--;
      if (!limit) {
        outcome = "跳数用尽";
        steps.push([router, inbound, next, limit, outcome]);
        break;
      }
      forwards++;
      steps.push([router, inbound, next, limit, next === hopNextRouters.length ? "转发并送达" : "转发"]);
      router = next;
    }
    return { steps, metrics: { hopOutcome: outcome, hopForwards: forwards, hopRemaining: limit, hopRevisits: visits }, report: {
      conclusion: `本轮结果是${outcome}。成功转发 ${forwards} 次。`,
      detail: `起始限制为 ${hopStartLimit}。最后剩 ${limit}。重复经过路由器 ${visits} 次。目的端编号是 ${hopNextRouters.length}。回放列出整个转发序列。`,
      explanation: "模型每次转发前减一。减到零就在该路由器丢弃。进入目的端无需再转发。环路会反复消耗限制。无路由会直接停止。",
      suggestion: "只改环中一处下一跳。核对是否到达。再缩短正常路径的限制。",
    } };
  },
});

export const dnsReferralLab = defineCurriculumLab({
  id: "dns-referral", domain: "networks", title: "DNS 递归解析与转介",
  description: "查根、顶级域和权威服务器。",
  comparison: "每次冷查 / 复用转介缓存",
  topics: ["dns-recursive-iterative"],
  input: {
    referralQueries: { kind: "rows", columns: [[1, 9], [1, 9]], minItems: 1, maxItems: 16, label: "区号与主机号", hint: "每行一次。区号和主机号各为 1–9。" },
    referralRecords: { kind: "rows", columns: [[1, 9], [1, 9]], minItems: 0, maxItems: 20, label: "已登记的主机", hint: "同查询格式。不在表中时返回不存在。" },
  },
  defaults: { goalLabel: "复用父区转介后核对查询量", referralQueries: [[1, 1], [1, 2], [2, 1], [1, 1]], referralRecords: [[1, 1], [2, 1]] },
  columns: ["请求", "冷查路径", "复用路径", "复用少查次数", "权威结果"],
  metricLabels: { referralColdLookups: "冷查总上游请求", referralCachedLookups: "复用总上游请求",
    referralTldAsks: "复用组顶级域请求", referralFound: "查询成功次数" },
  focusMetric: "referralCachedLookups", alternateTrial: "让四个请求都查询不同的区。",
  run({ referralQueries, referralRecords }) {
    const stored = new Set(referralRecords.map(([zone, name]) => `${name}.${zone}`));
    const zones = new Set<number>();
    let root = false;
    let cachedLookups = 0;
    let found = 0;
    const steps = referralQueries.map(([zone, name]) => {
      const route = [...(root ? [] : ["根"]), ...(zones.has(zone) ? [] : ["顶级域"]), `区 ${zone} 权威`];
      root = true;
      zones.add(zone);
      cachedLookups += route.length;
      const exists = stored.has(`${name}.${zone}`);
      found += Number(exists);
      return [`${name}.${zone}.test`, `根 → 顶级域 → 区 ${zone} 权威`, route.join(" → "), 3 - route.length, exists ? "有记录" : "NXDOMAIN"] as const;
    });
    return { steps, metrics: { referralColdLookups: steps.length * 3, referralCachedLookups: cachedLookups,
      referralTldAsks: zones.size, referralFound: found }, report: {
      conclusion: `冷查请求 ${steps.length * 3} 次。复用转介请求 ${cachedLookups} 次。`,
      detail: `共解析 ${steps.length} 次。有记录 ${found} 次。经过 ${zones.size} 个权威区。复用组根只问一次。顶级域按新区域发问。`,
      explanation: "客户端把递归请求交给解析器。解析器沿转介逐级询问。根和顶级域给下一站。权威才给最后答案。模型只缓存转介，且本轮不过期。",
      suggestion: "只把请求换成不同区域。核对有多少顶级域查询。再让域名重复出现。",
    } };
  },
});

function bridgeNeighbors(count: number, links: number[][]) {
  const neighbors = Array.from({ length: count }, () => [] as number[]);
  for (const [left, right] of links) {
    neighbors[left].push(right);
    neighbors[right].push(left);
  }
  return neighbors;
}

function bridgeDepths(neighbors: number[][], root: number) {
  const depths = neighbors.map(() => -1);
  depths[root] = 0;
  const queue = [root];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const other of neighbors[current]) {
      if (depths[other] >= 0) continue;
      depths[other] = depths[current] + 1;
      queue.push(other);
    }
  }
  return depths;
}

export const spanningBridgeLab = defineCurriculumLab({
  id: "spanning-bridge", domain: "networks", title: "二层环路与生成树",
  description: "同一张拓扑。对照有无环路的广播。",
  comparison: "全链路转发 / 生成树转发",
  topics: ["stp-block-redundant-path"],
  input: {
    bridgeCount: { kind: "integer", min: 2, max: 8, label: "交换机数量", hint: "2–8 台，从 0 编号。" },
    bridgeRoot: { kind: "integer", min: 0, max: 7, label: "指定根桥", hint: "填写实际存在的交换机。" },
    bridgeSource: { kind: "integer", min: 0, max: 7, label: "广播起点", hint: "填写实际存在的交换机。" },
    bridgeLinks: { kind: "rows", columns: [[0, 7], [0, 7]], minItems: 1, maxItems: 16, label: "双向连线",
      hint: "每行填两个端点。不重复、不自连，整网连通。" },
    bridgeHopBudget: { kind: "integer", min: 2, max: 10, label: "观察跳数", hint: "2–10 跳。只限制实验长度。" },
  },
  defaults: { goalLabel: "比较组环和阻断多余链路后的广播数", bridgeCount: 3, bridgeRoot: 0, bridgeSource: 0,
    bridgeLinks: [[0, 1], [1, 2], [0, 2]], bridgeHopBudget: 5 },
  check: ({ bridgeCount, bridgeRoot, bridgeSource, bridgeLinks }) =>
    bridgeRoot < bridgeCount && bridgeSource < bridgeCount &&
    bridgeLinks.every(([a, b]) => a < bridgeCount && b < bridgeCount && a !== b) &&
    new Set(bridgeLinks.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`)).size === bridgeLinks.length &&
    bridgeDepths(bridgeNeighbors(bridgeCount, bridgeLinks), bridgeRoot).every((depth) => depth >= 0),
  columns: ["阶段", "全链路帧数", "全链路到达交换机", "生成树帧数", "生成树到达交换机"],
  metricLabels: { bridgeBlocked: "阻断链路数", bridgePlainFrames: "全链路累计帧数", bridgeTreeFrames: "生成树累计帧数",
    bridgePlainExtra: "全链路重复或返源帧数", bridgeTreeReached: "生成树覆盖的其他交换机" },
  focusMetric: "bridgePlainExtra", alternateTrial: "删掉 0 与 2 的直连。保留其余连线。",
  run({ bridgeCount, bridgeRoot, bridgeSource, bridgeLinks, bridgeHopBudget }) {
    const all = bridgeNeighbors(bridgeCount, bridgeLinks);
    const depths = bridgeDepths(all, bridgeRoot);
    const parents = depths.map((depth, node) => depth === 0 ? -1 : Math.min(...all[node].filter((other) => depths[other] === depth - 1)));
    const selected = bridgeLinks.filter(([a, b]) => parents[a] === b || parents[b] === a);
    const blocked = bridgeLinks.filter(([a, b]) => parents[a] !== b && parents[b] !== a);
    const simulate = (neighbors: number[][]) => {
      let frontier = new Map(neighbors[bridgeSource].map((to) => [bridgeSource * bridgeCount + to, 1]));
      let total = 0;
      const reached = new Set<number>();
      const frames = Array.from({ length: bridgeHopBudget }, () => {
        const next = new Map<number, number>();
        const arrivals = new Set<number>();
        let count = 0;
        for (const [edge, copies] of frontier) {
          const from = Math.floor(edge / bridgeCount);
          const to = edge % bridgeCount;
          count += copies;
          arrivals.add(to);
          if (to !== bridgeSource) reached.add(to);
          for (const destination of neighbors[to]) {
            if (destination === from) continue;
            const out = to * bridgeCount + destination;
            next.set(out, (next.get(out) ?? 0) + copies);
          }
        }
        frontier = next;
        total += count;
        return [count, sequenceText([...arrivals].sort((a, b) => a - b))] as const;
      });
      return { total, reached, frames };
    };
    const plain = simulate(all);
    const tree = simulate(bridgeNeighbors(bridgeCount, selected));
    return { steps: plain.frames.map((row, index) => [`第 ${index + 1} 跳`, ...row, ...tree.frames[index]] as const),
      metrics: { bridgeBlocked: blocked.length, bridgePlainFrames: plain.total, bridgeTreeFrames: tree.total,
        bridgePlainExtra: plain.total - plain.reached.size, bridgeTreeReached: tree.reached.size }, report: {
      conclusion: `全链路传 ${plain.total} 帧。生成树传 ${tree.total} 帧。已阻断 ${blocked.length} 条链路。`,
      detail: `根桥为 ${bridgeRoot}。广播从 ${bridgeSource} 发起。观察到第 ${bridgeHopBudget} 跳。阻断连线为 ${blocked.map(([a, b]) => `${a}–${b}`).join("、") || "无"}。生成树覆盖 ${tree.reached.size} 台其他交换机。`,
      explanation: "模型使用等成本链路。每台桥选更近根的一条边。平局选较小编号。广播会避开来口。环路仍可把帧送回。观察跳数只限制回放。",
      suggestion: "只去掉一条环上的边。比较重复帧。再改根桥，观察保留的连线。",
    } };
  },
});

export const ipv6PmtuLab = defineCurriculumLab({
  id: "ipv6-path-mtu", domain: "networks", title: "IPv6 路径 MTU 与大包卡住",
  description: "追踪超长包。对照收到和收不到反馈。",
  comparison: "收到 Packet Too Big / 反馈被过滤",
  topics: ["ipv6-packet-too-big", "pmtu-size-dependent-stall"],
  input: {
    pmtuLinkSizes: { kind: "list", min: 1280, max: 3600, minItems: 1, maxItems: 8, label: "各链路 MTU",
      hint: "按经过顺序填 1280–3600 字节。" },
    pmtuStartingSize: { kind: "integer", min: 1280, max: 3600, label: "发送端初始上限", hint: "1280–3600 字节，含头部。" },
    pmtuPayloadBytes: { kind: "integer", min: 1, max: 6000, label: "待送应用数据", hint: "1–6000 字节，不含头部。" },
  },
  defaults: { goalLabel: "查反馈丢失如何让流量卡在超长包", pmtuLinkSizes: [1500, 1280, 1600],
    pmtuStartingSize: 1500, pmtuPayloadBytes: 3000 },
  columns: ["尝试号", "收到反馈时", "累计送达字节", "反馈过滤时", "累计送达字节"],
  metricLabels: { pmtuActualLimit: "路径最小 MTU", pmtuFeedbackBytes: "收到反馈送达字节", pmtuFilteredBytes: "反馈过滤送达字节",
    pmtuFeedbackDrops: "收到反馈组超长次数", pmtuFilteredDrops: "过滤组超长次数", pmtuLearnedLimit: "收到反馈组最终上限" },
  focusMetric: "pmtuFilteredBytes", alternateTrial: "只把发送端初始上限改为 1280。",
  run({ pmtuLinkSizes, pmtuStartingSize, pmtuPayloadBytes }) {
    const header = 60;
    const simulate = (deliverFeedback: boolean) => {
      let sent = 0;
      let drops = 0;
      let limit = pmtuStartingSize;
      const frames: [string, number][] = [];
      while (sent < pmtuPayloadBytes) {
        const bytes = Math.min(limit - header, pmtuPayloadBytes - sent);
        const size = bytes + header;
        const failedAt = pmtuLinkSizes.findIndex((mtu) => size > mtu);
        if (failedAt < 0) {
          sent += bytes;
          frames.push([`${size} 字节 · 送达`, sent]);
          continue;
        }
        drops++;
        if (deliverFeedback) {
          limit = pmtuLinkSizes[failedAt];
          frames.push([`${size} 字节 · 链路 ${failedAt + 1} 丢弃 · 上限改为 ${limit}`, sent]);
        } else {
          frames.push([`${size} 字节 · 链路 ${failedAt + 1} 丢弃 · ${drops === 3 ? "停止尝试" : "未收到反馈"}`, sent]);
          if (drops === 3) break;
        }
      }
      return { sent, drops, limit, frames };
    };
    const received = simulate(true);
    const filtered = simulate(false);
    const min = Math.min(...pmtuLinkSizes);
    const steps = Array.from({ length: Math.max(received.frames.length, filtered.frames.length) }, (_, index) =>
      [index + 1, ...(received.frames[index] ?? ["结束", received.sent]), ...(filtered.frames[index] ?? ["结束", filtered.sent])] as const);
    return { steps, metrics: { pmtuActualLimit: min, pmtuFeedbackBytes: received.sent, pmtuFilteredBytes: filtered.sent,
      pmtuFeedbackDrops: received.drops, pmtuFilteredDrops: filtered.drops, pmtuLearnedLimit: received.limit }, report: {
      conclusion: `收到反馈送达 ${received.sent} 字节。过滤反馈送达 ${filtered.sent} 字节。`,
      detail: `待送 ${pmtuPayloadBytes} 字节。路径最小 MTU 是 ${min}。两组超长 ${received.drops} 和 ${filtered.drops} 次。收到反馈组最终上限为 ${received.limit}。回放给出首条拦截链路。`,
      explanation: "模型给每包加 60 字节头。IPv6 路由器丢弃超长包。反馈报告该链路 MTU。源端改小后重试。过滤组用原大小，最多失败三次。",
      suggestion: "只降低起始包上限。看过滤组能否送达。再加一条更窄链路。",
    } };
  },
});

export const ethernetLearningLab = defineCurriculumLab({
  id: "ethernet-learning", domain: "networks", title: "交换机学习与 VLAN 转发",
  description: "逐帧更新地址表。看帧发往哪些口。",
  topics: ["ethernet-source-learning", "vlan-trunk-tag"],
  input: {
    switchVlans: { kind: "list", min: 1, max: 99, minItems: 2, maxItems: 8, label: "各接入口的 VLAN", hint: "2–8 个 VLAN 编号，从端口 0 起填。" },
    switchFrames: { kind: "rows", columns: [[0, 7], [1, 99], [0, 99]], minItems: 1, maxItems: 20, label: "入站帧",
      hint: "每行填入端口、源主机编号、目的主机编号。目的 0 表示广播。" },
  },
  defaults: { goalLabel: "验证未知目的泛洪和学习后的单播", switchVlans: [10, 10, 10, 20],
    switchFrames: [[0, 1, 2], [1, 2, 1], [0, 1, 2], [2, 2, 1], [0, 1, 2], [3, 1, 2]] },
  check: ({ switchVlans, switchFrames }) => switchFrames.every(([port]) => port < switchVlans.length),
  columns: ["帧", "入端口与 VLAN", "学习结果", "转发判断", "出端口"],
  metricLabels: { switchFloods: "泛洪决策数", switchUnicasts: "定向转发数", switchFiltered: "同口过滤数", switchCopies: "出端口帧数",
    switchMoves: "地址迁移次数", switchEntries: "最终地址表项" },
  focusMetric: "switchFloods", alternateTrial: "只把端口 1 的 VLAN 改为 20。",
  run({ switchVlans, switchFrames }) {
    const learned = new Map<string, number>();
    let floods = 0;
    let unicasts = 0;
    let filtered = 0;
    let copies = 0;
    let moved = 0;
    const steps = switchFrames.map(([port, source, dest], index) => {
      const vlan = switchVlans[port];
      const key = `${vlan}/${source}`;
      const previous = learned.get(key);
      if (previous !== undefined && previous !== port) moved++;
      learned.set(key, port);
      const target = dest ? learned.get(`${vlan}/${dest}`) : undefined;
      let outputs: number[];
      let action: string;
      if (target === undefined) {
        floods++;
        outputs = switchVlans.flatMap((group, id) => id !== port && group === vlan ? [id] : []);
        action = dest ? "未知目的泛洪" : "广播泛洪";
      } else if (target === port) {
        filtered++;
        outputs = [];
        action = "同口过滤";
      } else {
        unicasts++;
        outputs = [target];
        action = "定向转发";
      }
      copies += outputs.length;
      return [`#${index + 1} ${source}→${dest || "广播"}`, `${port} / ${vlan}`,
        previous === undefined ? `新增 ${key}→${port}` : previous === port ? `保留 ${key}→${port}` : `端口 ${previous}→${port}`,
        action, sequenceText(outputs)] as const;
    });
    return { steps, metrics: { switchFloods: floods, switchUnicasts: unicasts, switchFiltered: filtered, switchCopies: copies,
      switchMoves: moved, switchEntries: learned.size }, report: {
      conclusion: `定向转发 ${unicasts} 帧。泛洪决策 ${floods} 次。发出 ${copies} 份帧。`,
      detail: `输入 ${steps.length} 帧。交换机有 ${switchVlans.length} 个接入口。同口过滤 ${filtered} 帧。学习表剩 ${learned.size} 项。地址迁移 ${moved} 次。泛洪时可能没有出端口。`,
      explanation: "入站帧先登记源地址。VLAN 和地址组成表键。已知目的按表选出端口。泛洪只发给同组其他口。模型只含接入口。地址表在本轮内保留。",
      suggestion: "只改一个端口的 VLAN。对比泛洪口。再让同一源换到同组其他口。",
    } };
  },
});

export const linkAggregationLab = defineCurriculumLab({
  id: "link-aggregation", domain: "networks", title: "链路聚合与流哈希",
  description: "同一批流，比较两种分链路方式。",
  comparison: "逐帧轮询 / 按流取模",
  topics: ["link-aggregation-flow-hash"],
  input: {
    aggregationMembers: { kind: "integer", min: 1, max: 8, label: "成员链路数", hint: "1–8 条，从 0 编号。" },
    aggregationFlows: { kind: "rows", columns: [[0, 99], [1, 24]], minItems: 1, maxItems: 12, label: "流编号、帧数",
      hint: "每行填不重复的流编号和帧数。各流按行顺序发完。" },
  },
  defaults: { goalLabel: "测同一流是否被拆到多条链路", aggregationMembers: 3, aggregationFlows: [[0, 6], [3, 4], [1, 2]] },
  check: ({ aggregationFlows }) => new Set(aggregationFlows.map(([flow]) => flow)).size === aggregationFlows.length,
  columns: ["流", "帧数", "轮询各成员帧数", "流哈希成员", "该成员累计帧数"],
  metricLabels: { aggregationFrames: "总帧数", aggregationRoundRobinSplit: "轮询拆分流数", aggregationRoundRobinLoads: "轮询成员帧数",
    aggregationHashLoads: "哈希成员帧数", aggregationHashGap: "哈希最大负载差", aggregationHashCollisions: "碰到已有流成员的流数" },
  focusMetric: "aggregationHashGap", alternateTrial: "只把成员链路数改为 4。",
  run({ aggregationMembers, aggregationFlows }) {
    const hashLoad = Array<number>(aggregationMembers).fill(0);
    const roundLoad = [...hashLoad];
    let frames = 0;
    let split = 0;
    let collisions = 0;
    const steps = aggregationFlows.map(([flow, count]) => {
      const link = flow % aggregationMembers;
      if (hashLoad[link]) collisions++;
      hashLoad[link] += count;
      const flowLoads = Array<number>(aggregationMembers).fill(0);
      for (let i = 0; i < count; i++) {
        const member = frames++ % aggregationMembers;
        roundLoad[member]++;
        flowLoads[member]++;
      }
      if (flowLoads.filter(Boolean).length > 1) split++;
      return [flow, count, sequenceText(flowLoads), link, hashLoad[link]] as const;
    });
    const gap = Math.max(...hashLoad) - Math.min(...hashLoad);
    return { steps, metrics: { aggregationFrames: frames, aggregationRoundRobinSplit: split, aggregationRoundRobinLoads: sequenceText(roundLoad),
      aggregationHashLoads: sequenceText(hashLoad), aggregationHashGap: gap, aggregationHashCollisions: collisions }, report: {
      conclusion: `轮询拆开 ${split} 条流。按流分配的负载差是 ${gap} 帧。`,
      detail: `共 ${aggregationFlows.length} 条流，${frames} 帧。轮询各链路帧数为 ${sequenceText(roundLoad)}。按流为 ${sequenceText(hashLoad)}。有 ${collisions} 条流落到已有流的口。`,
      explanation: "同一流固定在同一成员。模型用流号取余选口。几条大流可能分到一起。逐帧轮询较均匀。跨链路时到达顺序可能变化。本轮只统计分配。",
      suggestion: "只增加一条成员链路。观察各成员帧数。再只改大流编号，检查碰撞。",
    } };
  },
});

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
