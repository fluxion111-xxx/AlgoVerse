import { defineCurriculumLab, gapText, sequenceText } from "./curriculumLab";
import { simulatePageReplacement } from "./pageReplacement";

export const workingSetLab = defineCurriculumLab({
  id: "working-set", domain: "operating-systems", title: "工作集与连续缺页",
  description: "圈出近期访问页。比较两种容量。",
  comparison: "当前页框 / 多一个页框",
  topics: ["working-set-thrashing"],
  input: {
    workingFrames: { kind: "integer", min: 1, max: 7, label: "当前页框数", hint: "1–7 个。对照组多一个。" },
    workingWindow: { kind: "integer", min: 1, max: 16, label: "回看窗口", hint: "1–16 次访问，含当前访问" },
    workingReferences: { kind: "list", min: 0, max: 99, minItems: 1, maxItems: 32, label: "页号序列", hint: "1–32 个页号，每项 0–99" },
  },
  defaults: { goalLabel: "看循环访问是否持续缺页", workingFrames: 2, workingWindow: 3,
    workingReferences: [1, 2, 3, 1, 2, 3, 1, 2, 3] },
  columns: ["访问次序", "页号", "近期工作集", "旧容量状态", "加一页框状态"],
  metricLabels: { workingFaults: "当前缺页数", workingExtraFaults: "加框后缺页数", workingOverflow: "工作集超容量步数",
    workingPeakPages: "工作集峰值", workingFaultStreak: "最长连续缺页" },
  focusMetric: "workingFaults", alternateTrial: "当前页框数改成 3。其他参数不动。",
  run({ goalLabel, workingFrames, workingWindow, workingReferences }) {
    const setup = { goalLabel, references: workingReferences };
    const current = simulatePageReplacement({ ...setup, frameCount: workingFrames }, "LRU");
    const expanded = simulatePageReplacement({ ...setup, frameCount: workingFrames + 1 }, "LRU");
    let overflow = 0;
    let peak = 0;
    let faultStreak = 0;
    let maxStreak = 0;
    const describe = ({ hit, evicted, frames }: typeof current.steps[number]) =>
      `${hit ? "命中" : evicted === null ? "缺页·装入" : `缺页·淘汰 ${evicted}`}（${frames.map((page) => page ?? "空").join("、")}）`;
    const steps = workingReferences.map((page, index) => {
      const pages = [...new Set(workingReferences.slice(Math.max(0, index + 1 - workingWindow), index + 1))];
      if (pages.length > workingFrames) overflow++;
      peak = Math.max(peak, pages.length);
      faultStreak = current.steps[index].hit ? 0 : faultStreak + 1;
      maxStreak = Math.max(maxStreak, faultStreak);
      return [index + 1, page, `${pages.length} 页 · ${sequenceText(pages)}`, describe(current.steps[index]), describe(expanded.steps[index])] as const;
    });
    const saved = current.faults - expanded.faults;
    return { steps, metrics: { workingFaults: current.faults, workingExtraFaults: expanded.faults, workingOverflow: overflow,
      workingPeakPages: peak, workingFaultStreak: maxStreak }, report: {
      conclusion: saved ? `多一个页框，少缺页 ${saved} 次。` : "多一个页框，缺页数相同。",
      detail: `两组从空页框起跑。共访问 ${steps.length} 次。${workingFrames} 框缺页 ${current.faults} 次。${workingFrames + 1} 框缺页 ${expanded.faults} 次。工作集峰值 ${peak} 页。原容量最长连续缺页 ${maxStreak} 次。`,
      explanation: `向前看 ${workingWindow} 次访问。不同页号组成工作集。有 ${overflow} 步超过当前容量。两组都换出最久没用的页。初次装入也算缺页。连续换页可提示容量压力。`,
      suggestion: "先加一个页框。再单独改回看窗口。窗口改变统计范围。对照缺页数是否跟着变。",
    } };
  },
});

export const priorityInheritanceLab = defineCurriculumLab({
  id: "priority-inheritance", domain: "operating-systems", title: "优先级反转与继承",
  description: "高优先任务等锁。看谁拖慢了它。",
  comparison: "固定优先级 / 锁优先级继承",
  topics: ["mutex-priority-inheritance"],
  input: {
    lowLockWork: { kind: "integer", min: 1, max: 10, label: "低优先持锁用时", hint: "1–10 拍。第 0 拍先拿锁。" },
    mediumWork: { kind: "integer", min: 0, max: 12, label: "中优先任务用时", hint: "0–12 拍。第 1 拍到达。" },
  },
  defaults: { goalLabel: "对照优先级继承前后的等待时间", lowLockWork: 3, mediumWork: 4 },
  columns: ["时刻", "固定优先级", "启用继承"],
  metricLabels: { fixedHighWait: "固定优先级等锁拍数", inheritedHighWait: "启用继承等锁拍数", prioritySaved: "节省等待拍数" },
  focusMetric: "prioritySaved", alternateTrial: "把中优先任务用时改为 0。",
  run({ lowLockWork, mediumWork }) {
    const simulate = (inherit: boolean) => {
      let low = lowLockWork;
      let medium = mediumWork;
      let highStartedAt = 0;
      const events = ["低优先拿锁" + (--low === 0 ? "并在拍末释放" : "，执行一拍")];
      for (let tick = 1; tick <= lowLockWork + mediumWork; tick++) {
        if (!low && !highStartedAt) {
          highStartedAt = tick;
          events.push("高优先拿锁，拍末释放");
        } else if (low && (inherit || !medium)) {
          const runner = inherit ? "低优先继承最高优先级" : "低优先继续执行";
          events.push(runner + (--low === 0 ? "，拍末放锁" : "，高优先等待"));
        } else {
          medium--;
          events.push(low ? "中优先抢占，最高优先继续等锁" : "中优先执行一拍");
        }
      }
      return { wait: highStartedAt - 1, events };
    };
    const fixed = simulate(false);
    const inherited = simulate(true);
    const saved = fixed.wait - inherited.wait;
    return { steps: fixed.events.map((event, index) => [index, event, inherited.events[index]] as const),
      metrics: { fixedHighWait: fixed.wait, inheritedHighWait: inherited.wait, prioritySaved: saved }, report: {
        conclusion: saved ? `启用继承后，少等 ${saved} 拍。` : "两组的等锁用时相同。",
        detail: `高优先任务第 1 拍到达。低优先持锁需 ${lowLockWork} 拍。中优先需 ${mediumWork} 拍。固定优先级下等 ${fixed.wait} 拍。启用继承后等 ${inherited.wait} 拍。高优先运行 1 拍。`,
        explanation: "高优先先尝试拿锁。遇到持锁者就等。中优先可抢占低优先。继承让持锁者临时提级。它放锁后恢复。模型只有一颗 CPU 和一把锁。",
        suggestion: "先把中优先用时调成 0。再单独缩短持锁时间。回放核对高优先在哪拍拿锁。",
      } };
  },
});

export const cacheMappingLab = defineCurriculumLab({
  id: "cache-mapping", domain: "operating-systems", title: "缓存映射与组冲突",
  description: "固定总块数。比较两种映射的命中和淘汰。",
  comparison: "直接映射 / 两路组相联",
  topics: ["cache-set-index-conflicts"],
  input: {
    cacheBlocks: { kind: "integer", min: 2, max: 8, label: "缓存块数", hint: "2、4、6 或 8" },
    cacheAccesses: { kind: "list", min: 0, max: 63, minItems: 1, maxItems: 32, label: "访问块号", hint: "1–32 个块号，每项 0–63" },
  },
  defaults: { goalLabel: "观察同组访问何时触发替换", cacheBlocks: 4, cacheAccesses: [1, 5, 1, 5, 1, 5] },
  check: ({ cacheBlocks }) => cacheBlocks % 2 === 0,
  columns: ["访问", "直接映射", "两路组相联"],
  metricLabels: { directMisses: "直接映射未命中", twoWayMisses: "两路未命中", directEvictions: "直接映射淘汰", twoWayEvictions: "两路淘汰" },
  focusMetric: "twoWayMisses", alternateTrial: "保持容量。改用 1、2 交替访问。",
  run({ cacheBlocks, cacheAccesses }) {
    const lanes = [1, 2].map((ways) => ({ ways, sets: Array.from({ length: cacheBlocks / ways }, () => [] as number[]), misses: 0, evictions: 0 }));
    const steps = cacheAccesses.map((block) => {
      const results = lanes.map((lane) => {
        const group = block % lane.sets.length;
        const entries = lane.sets[group];
        const slot = entries.indexOf(block);
        let action = "命中";
        if (slot >= 0) entries.splice(slot, 1);
        else {
          lane.misses++;
          action = "装入空位";
          if (entries.length === lane.ways) {
            lane.evictions++;
            action = `淘汰块 ${entries.shift()}`;
          }
        }
        entries.push(block);
        return `组 ${group} · ${action} · ${sequenceText(entries)}`;
      });
      return [block, ...results] as const;
    });
    const [direct, twoWay] = lanes;
    return { steps, metrics: { directMisses: direct.misses, twoWayMisses: twoWay.misses,
      directEvictions: direct.evictions, twoWayEvictions: twoWay.evictions }, report: {
      conclusion: gapText(direct.misses, twoWay.misses, "直接映射", "两路组相联", "次未命中"),
      detail: `两边各有 ${cacheBlocks} 个缓存块。共访问 ${cacheAccesses.length} 次。直接映射命中 ${cacheAccesses.length - direct.misses} 次。两路命中 ${cacheAccesses.length - twoWay.misses} 次。两边分别淘汰 ${direct.evictions} 次、${twoWay.evictions} 次。`,
      explanation: `块号对组数取余，得到组号。直接映射分 ${direct.sets.length} 组。每组只留一块。两路分 ${twoWay.sets.length} 组。每组能留两块。满组先淘汰最久没用的块。回放按从旧到新显示组内块号。`,
      suggestion: "固定总容量和访问次数。换一对能落入不同组的块。对比未命中和淘汰次数。",
    } };
  },
});

export const boundedBufferLab = defineCurriculumLab({
  id: "bounded-buffer", domain: "operating-systems", title: "生产者与消费者",
  description: "模拟有界队列。看谁等待、谁先取走数据。",
  topics: ["bounded-buffer-two-semaphores", "semaphore-counting-slots"],
  input: {
    bufferCapacity: { kind: "integer", min: 1, max: 8, label: "缓冲区容量", hint: "1–8 个槽位" },
    bufferSchedule: { kind: "list", min: 0, max: 1, minItems: 1, maxItems: 24, label: "请求顺序", hint: "0 放入一件，1 取出一件" },
  },
  defaults: { goalLabel: "观察满队列和空队列如何阻塞", bufferCapacity: 2, bufferSchedule: [0, 0, 0, 1, 1, 1, 1, 0] },
  columns: ["新请求", "本步完成", "等待中", "缓冲区", "空槽 / 满槽"],
  metricLabels: { blockedPuts: "放入等待次数", blockedTakes: "取出等待次数", donePuts: "完成放入", doneTakes: "完成取出", peakBuffer: "最高占用", pendingRequests: "未完成请求" },
  focusMetric: "blockedPuts", alternateTrial: "容量改成 3。请求顺序不变。",
  run({ bufferCapacity, bufferSchedule }) {
    const queue: number[] = [];
    const pending: { request: number; action: number }[] = [];
    const waits = [0, 0];
    const completed = [0, 0];
    let peakBuffer = 0;
    const steps = bufferSchedule.map((action, index) => {
      const request = index + 1;
      const current = { request, action };
      pending.push(current);
      const activity: string[] = [];
      function readyIndex() {
        return pending.findIndex((item) => item.action === 0 ? queue.length < bufferCapacity : queue.length > 0);
      }
      for (let ready = readyIndex(); ready >= 0; ready = readyIndex()) {
        const [item] = pending.splice(ready, 1);
        completed[item.action]++;
        if (item.action === 0) {
          queue.push(item.request);
          peakBuffer = Math.max(peakBuffer, queue.length);
          activity.push(`#${item.request} 放入物品 ${item.request}`);
        } else activity.push(`#${item.request} 取出物品 ${queue.shift()}`);
      }
      if (pending.includes(current)) waits[action]++;
      return [`#${request} ${action === 0 ? "放入" : "取出"}`, activity.join("；") || "无",
        sequenceText(pending.map((item) => item.request)), sequenceText(queue), `${bufferCapacity - queue.length} / ${queue.length}`] as const;
    });
    return { steps, metrics: { blockedPuts: waits[0], blockedTakes: waits[1], donePuts: completed[0], doneTakes: completed[1],
      peakBuffer, pendingRequests: pending.length }, report: {
      conclusion: `放入等待 ${waits[0]} 次。取出等待 ${waits[1]} 次。最后待办 ${pending.length} 个。`,
      detail: `容量是 ${bufferCapacity}。占用峰值是 ${peakBuffer}。完成放入 ${completed[0]} 次。完成取出 ${completed[1]} 次。最后剩下 ${queue.length} 件物品。等待过的请求也可能已经完成。`,
      explanation: "空槽数等于容量减去占用量。满槽数就是可取件数。物品先放先取。有空槽才能放入。有物品才能取出。每步优先执行最早可完成的请求。",
      suggestion: "只改容量，保留同一请求序列。先看放入等待次数。再找出队列变空的步骤。",
    } };
  },
});
import { pageReplacementEngine } from "./pageReplacement";

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

export const clockReplacementLab = defineCurriculumLab({
  id: "clock-replacement", domain: "operating-systems", title: "时钟置换与引用位",
  description: "对照 FIFO 和时钟置换。看一次命中怎样影响后续淘汰。",
  comparison: "相同页序列下的时钟置换与 FIFO",
  topics: ["clock-page-reference-bit"],
  input: {
    clockFrames: { kind: "integer", min: 1, max: 8, label: "页框数", hint: "1–8 个页框。" },
    clockPages: { kind: "list", min: 0, max: 99, minItems: 1, maxItems: 32, label: "访问页序列", hint: "1–32 个页号。范围 0–99。" },
  },
  defaults: { goalLabel: "看引用位是否保住刚访问的页。", clockFrames: 3, clockPages: [1, 2, 3, 4, 2, 5, 2, 6, 2] },
  columns: ["访问页", "FIFO 本步", "时钟本步", "页框（页:位）", "指针", "清零页"],
  metricLabels: { clockFaults: "时钟缺页次数", clockFifoFaults: "FIFO 缺页次数", clockResets: "引用位清零次数", clockEvictions: "时钟淘汰次数" },
  focusMetric: "clockFaults",
  alternateTrial: "只把页框数设成 1。看看两种方法的缺页。",
  run({ goalLabel, clockFrames, clockPages }) {
    const [fifo] = pageReplacementEngine.run({ goalLabel, frameCount: clockFrames, references: clockPages }).policies;
    const frames = Array<number | null>(clockFrames).fill(null);
    const referenced = Array<boolean>(clockFrames).fill(false);
    let hand = 0;
    let clockFaults = 0;
    let clockResets = 0;
    let clockEvictions = 0;
    let firstEvicted: number | null = null;
    const steps = clockPages.map((page, index) => {
      const found = frames.indexOf(page);
      const cleared: number[] = [];
      let outcome = "命中";
      if (found >= 0) referenced[found] = true;
      else {
        clockFaults++;
        while (referenced[hand]) {
          cleared.push(frames[hand]!);
          referenced[hand] = false;
          hand = (hand + 1) % clockFrames;
        }
        clockResets += cleared.length;
        const evicted = frames[hand];
        if (evicted === null) outcome = "装入空框";
        else {
          firstEvicted ??= evicted;
          clockEvictions++;
          outcome = `换出 ${evicted}`;
        }
        frames[hand] = page;
        referenced[hand] = true;
        hand = (hand + 1) % clockFrames;
      }
      const baseline = fifo.steps[index];
      return [page, baseline.hit ? "命中" : baseline.evicted === null ? "装入空框" : `换出 ${baseline.evicted}`, outcome,
        frames.map((value, i) => value === null ? "空" : `${value}:${Number(referenced[i])}`).join("、"), hand, sequenceText(cleared)] as const;
    });
    const gap = fifo.faults - clockFaults;
    return { steps, metrics: { clockFaults, clockFifoFaults: fifo.faults, clockResets, clockEvictions }, report: {
      conclusion: gap ? `${gap > 0 ? "时钟" : "FIFO"}少缺页 ${Math.abs(gap)} 次。` : "两种方法缺页次数相同。",
      detail: `各访问 ${clockPages.length} 次。各用 ${clockFrames} 个页框。时钟缺页 ${clockFaults} 次。FIFO 缺页 ${fifo.faults} 次。`,
      explanation: "命中会把引用位置一。扫到一就清零并跳过。扫到零才换页。" +
        `本轮共清零 ${clockResets} 次。` + (firstEvicted === null ? "本轮无需淘汰。" : `首个换出的页是 ${firstEvicted}。`),
      suggestion: "保留页框数。只换一次重复访问。比较淘汰顺序。",
    } };
  },
});

function counterTrace(initial: number, deltas: [number, number], order: number[]) {
  const phase = [0, 0];
  const reads = [0, 0];
  const versions = [0, 0];
  let value = initial;
  let version = 0;
  let staleWrites = 0;
  const steps = order.map((thread) => {
    const current = phase[thread]++;
    if (current === 0) {
      reads[thread] = value;
      versions[thread] = version;
      return [`${thread ? "B" : "A"} 读 ${value}`, value] as const;
    }
    const next = reads[thread] + deltas[thread];
    if (current === 1) return [`${thread ? "B" : "A"} 算出 ${next}`, value] as const;
    const stale = version !== versions[thread];
    if (stale) staleWrites++;
    version++;
    value = next;
    return [`${thread ? "B" : "A"} 写 ${value}${stale ? "（旧读值）" : ""}`, value] as const;
  });
  return { steps, value, staleWrites };
}

export const counterMutexLab = defineCurriculumLab({
  id: "counter-mutex", domain: "operating-systems", title: "临界区与丢失更新",
  description: "让两个线程改同一计数器。比较交错执行和持锁完成读改写的结果。",
  comparison: "相同计数任务的交错调度与持锁串行",
  topics: ["mutex-critical-section"],
  input: {
    counterInitial: { kind: "integer", min: 0, max: 999, label: "计数器初值", hint: "0–999 的整数。" },
    threadDeltaA: { kind: "integer", min: 1, max: 99, label: "线程 A 要加", hint: "1–99 的整数。" },
    threadDeltaB: { kind: "integer", min: 1, max: 99, label: "线程 B 要加", hint: "1–99 的整数。" },
    counterSchedule: { kind: "list", min: 0, max: 1, minItems: 6, maxItems: 6, label: "交错次序", hint: "0 表示 A，1 表示 B。各出现 3 次，依次读、算、写。" },
  },
  defaults: { goalLabel: "找到覆盖另一线程的写入。", counterInitial: 10, threadDeltaA: 1, threadDeltaB: 2, counterSchedule: [0, 1, 0, 1, 0, 1] },
  check: ({ counterSchedule }) => counterSchedule.filter((thread) => thread === 0).length === 3,
  columns: ["步次", "交错动作", "交错共享值", "持锁动作", "持锁共享值"],
  metricLabels: { interleavedCounter: "交错执行终值", mutexCounter: "持锁执行终值", staleCounterWrites: "依据旧读值的写入", lostCounterUnits: "丢失增量" },
  focusMetric: "lostCounterUnits",
  alternateTrial: "把次序设为 0,0,0,1,1,1。再对照。",
  run({ counterInitial, threadDeltaA, threadDeltaB, counterSchedule }) {
    const deltas: [number, number] = [threadDeltaA, threadDeltaB];
    const first = counterSchedule[0];
    const interleaved = counterTrace(counterInitial, deltas, counterSchedule);
    const locked = counterTrace(counterInitial, deltas, [first, first, first, 1 - first, 1 - first, 1 - first]);
    const lost = locked.value - interleaved.value;
    return { steps: interleaved.steps.map((step, i) => [i + 1, ...step, ...locked.steps[i]]),
      metrics: { interleavedCounter: interleaved.value, mutexCounter: locked.value, staleCounterWrites: interleaved.staleWrites, lostCounterUnits: lost }, report: {
        conclusion: lost ? `交错执行少加了 ${lost}。` : "本次交错没有丢失增量。",
        detail: `初值为 ${counterInitial}。A 要加 ${threadDeltaA}。B 要加 ${threadDeltaB}。交错终值 ${interleaved.value}。持锁终值 ${locked.value}。`,
        explanation: "每次加值分读、算、写。保存旧读值会覆盖新结果。" +
          `用旧读值写入 ${interleaved.staleWrites} 次。` + "锁保护完整的读改写。先进入者先做完。",
        suggestion: "固定两次增量。只交换最后两次写入。再看交错终值。",
      } };
  },
});
