import { defineCurriculumLab, gapText, sequenceText } from "./curriculumLab";

export const diskSchedulingLab = defineCurriculumLab({
  id: "disk-scheduling", domain: "operating-systems", title: "磁盘寻道调度",
  description: "固定磁头起点。比较先来先服务与最短寻道优先。所有请求起初已排队。",
  comparison: "同一请求下的 FCFS 与 SSTF",
  topics: ["hdd-seek-rotation-latency"],
  input: {
    diskHead: { kind: "integer", min: 0, max: 499, label: "磁头起点", hint: "0–499 的磁道号。" },
    diskRequests: { kind: "list", min: 0, max: 499, minItems: 1, maxItems: 24, label: "请求磁道", hint: "1–24 个磁道号。范围 0–499。" },
  },
  defaults: { goalLabel: "比较两种策略移动的距离。", diskHead: 53, diskRequests: [98, 183, 37, 122, 14, 124, 65, 67] },
  columns: ["步次", "FCFS 到达", "本步移动", "SSTF 到达", "本步移动"],
  metricLabels: { fcfsSeek: "FCFS 总移动磁道数", sstfSeek: "SSTF 总移动磁道数", seekGap: "移动距离差", sstfTrackOrder: "SSTF 服务顺序" },
  focusMetric: "sstfSeek",
  alternateTrial: "把请求按磁道升序排列。磁头起点保持不变。",
  run({ diskHead, diskRequests }) {
    const pending = [...diskRequests];
    let head = diskHead;
    const shortest = diskRequests.map(() => {
      const next = pending.reduce((best, track, index) => {
        const gap = Math.abs(track - head) - Math.abs(pending[best] - head);
        return gap < 0 || (gap === 0 && track < pending[best]) ? index : best;
      }, 0);
      const [track] = pending.splice(next, 1);
      const distance = Math.abs(track - head);
      head = track;
      return { track, distance };
    });
    const arrival = diskRequests.map((track, index) => Math.abs(track - (diskRequests[index - 1] ?? diskHead)));
    const fcfsSeek = arrival.reduce((total, distance) => total + distance, 0);
    const sstfSeek = shortest.reduce((total, { distance }) => total + distance, 0);
    const order = shortest.map(({ track }) => track);
    return {
      steps: diskRequests.map((track, i) => [i + 1, track, arrival[i], order[i], shortest[i].distance]),
      metrics: { fcfsSeek, sstfSeek, seekGap: Math.abs(fcfsSeek - sstfSeek), sstfTrackOrder: sequenceText(order) },
      report: {
        conclusion: gapText(fcfsSeek, sstfSeek, "FCFS", "SSTF", "道"),
        detail: `磁头从 ${diskHead} 道起步。各处理 ${diskRequests.length} 个请求。FCFS 共走 ${fcfsSeek} 道。SSTF 共走 ${sstfSeek} 道。`,
        explanation: `FCFS 先去 ${diskRequests[0]} 道。SSTF 先去 ${order[0]} 道。` +
          "FCFS 按原顺序处理。SSTF 就近选下一站。等距选磁道号较小者。这里只统计移动距离。",
        suggestion: "固定请求。只移动磁头起点。看总距离和首个请求。",
      },
    };
  },
});

export const tlbTranslationLab = defineCurriculumLab({
  id: "tlb-translation", domain: "operating-systems", title: "TLB 地址转换",
  description: "拆出页号和偏移。用固定页表比较开关地址翻译缓存的查表次数。",
  comparison: "相同地址流下有无 TLB 的查表次数",
  topics: ["translation-cache", "fault-trace-tlb-versus-major"],
  input: {
    virtualAddresses: { kind: "list", min: 0, max: 4095, minItems: 1, maxItems: 32, label: "虚拟地址序列", hint: "1–32 个整数地址。范围 0–4095。" },
    pageBytes: { kind: "integer", min: 4, max: 1024, label: "每页字节数", hint: "4–1024 之间的 2 的幂。" },
    tlbEntries: { kind: "integer", min: 1, max: 8, label: "TLB 项数", hint: "1–8 个缓存项。" },
  },
  defaults: { goalLabel: "观察重复访问能省多少查表。", virtualAddresses: [2, 7, 18, 5, 33, 21, 34, 6], pageBytes: 16, tlbEntries: 2 },
  check: ({ pageBytes }) => (pageBytes & (pageBytes - 1)) === 0,
  columns: ["虚拟地址", "页号", "偏移", "这次查询", "物理地址", "缓存页号"],
  metricLabels: { tlbHits: "TLB 命中次数", tlbMisses: "TLB 未命中次数", noTlbLookups: "关闭 TLB 查表次数", tlbEvictions: "TLB 替换次数" },
  focusMetric: "tlbHits",
  alternateTrial: "固定地址流。只增大页大小。再看页号与命中。",
  run({ virtualAddresses, pageBytes, tlbEntries }) {
    const cache: number[] = [];
    let tlbHits = 0;
    let tlbEvictions = 0;
    let firstEvicted: number | undefined;
    const steps = virtualAddresses.map((address) => {
      const page = Math.floor(address / pageBytes);
      const offset = address % pageBytes;
      const index = cache.indexOf(page);
      const hit = index >= 0;
      if (hit) {
        tlbHits++;
        cache.splice(index, 1);
      } else if (cache.length === tlbEntries) {
        const evicted = cache.shift()!;
        firstEvicted ??= evicted;
        tlbEvictions++;
      }
      cache.push(page);
      return [address, page, offset, hit ? "命中 TLB" : "查页表", (page * 2 + 1) * pageBytes + offset, sequenceText(cache)] as const;
    });
    const noTlbLookups = virtualAddresses.length;
    const tlbMisses = noTlbLookups - tlbHits;
    return { steps, metrics: { tlbHits, tlbMisses, noTlbLookups, tlbEvictions }, report: {
      conclusion: `开启 TLB 少查表 ${tlbHits} 次。`,
      detail: `共访问 ${noTlbLookups} 次。每页 ${pageBytes} 字节。缓存有 ${tlbEntries} 项。命中 ${tlbHits} 次。查页表 ${tlbMisses} 次。`,
      explanation: `首个地址落在页 ${steps[0][1]}。偏移是 ${steps[0][2]}。` +
        "同页的地址可共用翻译。满时换走最久未用项。" +
        (firstEvicted === undefined ? "本轮没有换掉缓存项。" : `首个换出页是 ${firstEvicted}。`) + "模型中各页都在内存。",
      suggestion: "固定页大小与地址流。只改 TLB 项数。再比查表次数。",
    } };
  },
});
