import { defineCurriculumLab, gapText, sequenceText } from "./curriculumLab";
import { simulatePageReplacement } from "./pageReplacement";

export const lockOrderingLab = defineCurriculumLab({
  id: "lock-ordering", domain: "operating-systems", title: "固定加锁顺序与死锁",
  description: "两个任务竞争两把锁。回放谁在等谁。",
  comparison: "按任务所需顺序 / 按锁编号顺序",
  topics: ["deadlock-resource-order"],
  input: {
    lockReverseSecond: { kind: "integer", min: 0, max: 1, label: "第二个任务反向加锁", hint: "0 同序；1 先拿 2 再拿 1。" },
  },
  defaults: { goalLabel: "找出两把锁互相等待的时刻", lockReverseSecond: 1 },
  columns: ["拍", "原顺序事件", "原顺序锁持有者", "统一顺序事件", "统一顺序锁持有者"],
  metricLabels: { lockOriginalDone: "原顺序完成任务", lockOrderedDone: "统一顺序完成任务",
    lockOriginalCycle: "原顺序是否有等待环", lockOriginalBlocks: "原顺序等待次数", lockOrderedBlocks: "统一顺序等待次数" },
  focusMetric: "lockOriginalDone", alternateTrial: "让两个任务按相同顺序加锁。",
  run({ lockReverseSecond }) {
    const simulate = (reverse: boolean) => {
      const orders = [[1, 2], reverse ? [2, 1] : [1, 2]];
      const owners = ["", "", ""];
      const progress = [0, 0];
      const frames: [string, string][] = [];
      let blocks = 0;
      let deadlock = false;
      while (progress.some((step) => step < 3)) {
        const events: string[] = [];
        let changed = false;
        for (const [task, order] of orders.entries()) {
          const name = task === 0 ? "甲" : "乙";
          const step = progress[task];
          if (step === 3) continue;
          if (step === 2) {
            for (const lock of order) owners[lock] = "";
            events.push(`${name} 完成并放锁`);
          } else if (owners[order[step]]) {
            events.push(`${name} 等锁 ${order[step]}（${owners[order[step]]}）`);
            blocks++;
            continue;
          } else {
            owners[order[step]] = name;
            events.push(`${name} 获得锁 ${order[step]}`);
          }
          progress[task]++;
          changed = true;
        }
        frames.push([events.join(" · "), `1: ${owners[1] || "空"} / 2: ${owners[2] || "空"}`]);
        if (!changed) { deadlock = true; break; }
      }
      return { frames, blocks, deadlock, done: progress.filter((step) => step === 3).length };
    };
    const original = simulate(lockReverseSecond === 1);
    const ordered = simulate(false);
    const steps = Array.from({ length: Math.max(original.frames.length, ordered.frames.length) }, (_, i) =>
      [i + 1, ...(original.frames[i] ?? ["结束", "—"]), ...(ordered.frames[i] ?? ["结束", "—"])] as const);
    return { steps, metrics: { lockOriginalDone: original.done, lockOrderedDone: ordered.done, lockOriginalCycle: original.deadlock ? "有" : "无",
      lockOriginalBlocks: original.blocks, lockOrderedBlocks: ordered.blocks }, report: {
      conclusion: `原顺序完成 ${original.done} 个任务。统一顺序完成 ${ordered.done} 个。`,
      detail: `原顺序等待 ${original.blocks} 次。统一顺序等待 ${ordered.blocks} 次。原顺序${original.deadlock ? "出现" : "没有"}等待环。每拍按甲、乙处理。拿全锁后下一拍释放。`,
      explanation: "任务等锁时仍持有旧锁。互相持有对方的锁会卡住。统一顺序要求先拿锁 1。拿到两把的任务能完成。普通等待和循环等待要分开看。",
      suggestion: "让乙也先拿锁 1。查看仍有几次等待。再核对两项是否都完成。",
    } };
  },
});

export const fileOffsetLab = defineCurriculumLab({
  id: "file-offset", domain: "operating-systems", title: "文件描述符与共享偏移",
  description: "交替读取。比较 dup 和重新打开。",
  comparison: "dup 共享打开文件 / 独立 open",
  topics: ["file-descriptors"],
  input: {
    offsetFileData: { kind: "list", min: 0, max: 255, minItems: 1, maxItems: 18, label: "文件字节", hint: "1–18 个字节，按顺序读取。" },
    offsetReadOps: { kind: "rows", columns: [[0, 1], [1, 18]], minItems: 1, maxItems: 18, label: "读取请求",
      hint: "每行填描述符 0/1 和请求字节数。文件末尾允许短读。" },
  },
  defaults: { goalLabel: "对照共享和独立的读位置", offsetFileData: [10, 20, 30, 40], offsetReadOps: [[0, 2], [1, 2], [0, 1]] },
  columns: ["请求", "dup 得到", "dup 偏移", "独立打开得到", "独立偏移 0 / 1"],
  metricLabels: { offsetSharedBytes: "dup 读到的总字节", offsetIndependentBytes: "独立读到的总字节",
    offsetSharedEmpty: "dup 空读次数", offsetIndependentEmpty: "独立空读次数", offsetSharedFinal: "共享最终偏移" },
  focusMetric: "offsetSharedEmpty", alternateTrial: "把首个请求改为读 1 字节。",
  run({ offsetFileData, offsetReadOps }) {
    const shared = { position: 0 };
    const independent = [{ position: 0 }, { position: 0 }];
    const counts = [0, 0];
    const empty = [0, 0];
    const read = (cursor: { position: number }, size: number, lane: number) => {
      const data = offsetFileData.slice(cursor.position, cursor.position + size);
      cursor.position += data.length;
      counts[lane] += data.length;
      empty[lane] += Number(data.length === 0);
      return sequenceText(data);
    };
    const steps = offsetReadOps.map(([fd, size]) => [`fd ${fd} 读 ${size}`, read(shared, size, 0), shared.position,
      read(independent[fd], size, 1), independent.map(({ position }) => position).join(" / ")] as const);
    return { steps, metrics: { offsetSharedBytes: counts[0], offsetIndependentBytes: counts[1], offsetSharedEmpty: empty[0],
      offsetIndependentEmpty: empty[1], offsetSharedFinal: shared.position }, report: {
      conclusion: `dup 共读 ${counts[0]} 字节。独立打开共读 ${counts[1]} 字节。`,
      detail: `文件长 ${offsetFileData.length} 字节。处理 ${steps.length} 个请求。共享偏移为 ${shared.position}。两种空读为 ${empty[0]} 和 ${empty[1]} 次。回放展示实际读到的字节。`,
      explanation: "dup 指向同一打开文件描述。两边共用读位置。重新打开各有偏移。每次按实读字节前进。到结尾可以短读或空读。",
      suggestion: "缩短第一次读。跟踪另一个描述符从哪取值。再交换两者顺序。",
    } };
  },
});

export const cacheWritePolicyLab = defineCurriculumLab({
  id: "cache-write-policy", domain: "operating-systems", title: "缓存写回与写直达",
  description: "同样的写序列。数下层实际写入。",
  comparison: "写直达 / 写回",
  topics: ["cache-writeback-dirty"],
  input: {
    writePolicySlots: { kind: "integer", min: 1, max: 8, label: "缓存行数", hint: "以块号取余定位缓存行。" },
    writePolicyOps: { kind: "rows", columns: [[0, 11], [-99, 99]], minItems: 1, maxItems: 20, label: "块号与写入值", hint: "每行一次写入。下层初值都是 0。" },
    writePolicyFlush: { kind: "integer", min: 0, max: 1, label: "末尾刷脏行", hint: "0 不刷；1 刷完再读取下层。" },
  },
  defaults: { goalLabel: "统计合并写入后下层被访问的次数", writePolicySlots: 2, writePolicyOps: [[0, 9], [0, 4], [2, 5], [2, 6]], writePolicyFlush: 1 },
  columns: ["步骤", "目标块", "写直达下层写数", "写回下层写数", "写回缓存事件"],
  metricLabels: { writePolicyThroughCount: "写直达下层写次数", writePolicyBackCount: "写回下层写次数",
    writePolicyFinalDirty: "剩余脏行", writePolicyVisibleDiff: "下层值不同的块数" },
  focusMetric: "writePolicyBackCount", alternateTrial: "关闭末尾刷脏行。",
  run({ writePolicySlots, writePolicyOps, writePolicyFlush }) {
    const direct = Array<number>(12).fill(0);
    const backing = [...direct];
    const cache = Array<{ block: number; value: number; dirty: boolean } | null>(writePolicySlots).fill(null);
    let writes = 0;
    const steps: [number | string, number | string, number, number, string][] = writePolicyOps.map(([block, value], index) => {
      direct[block] = value;
      const slot = block % writePolicySlots;
      const previous = cache[slot];
      let notice = "填入空行";
      if (previous?.block === block) notice = "命中";
      else if (previous?.dirty) {
        backing[previous.block] = previous.value;
        writes++;
        notice = `写回块 ${previous.block}`;
      }
      cache[slot] = { block, value, dirty: true };
      return [index + 1, block, index + 1, writes, `${notice} · 块 ${block} 写 ${value} 并标脏`];
    });
    if (writePolicyFlush) {
      for (const line of cache) {
        if (!line?.dirty) continue;
        backing[line.block] = line.value;
        line.dirty = false;
        writes++;
        steps.push(["刷盘", line.block, writePolicyOps.length, writes, `下层更新为 ${line.value}`]);
      }
    }
    const dirty = cache.filter((line) => line?.dirty).length;
    const different = backing.filter((value, index) => value !== direct[index]).length;
    return { steps, metrics: { writePolicyThroughCount: writePolicyOps.length, writePolicyBackCount: writes,
      writePolicyFinalDirty: dirty, writePolicyVisibleDiff: different }, report: {
      conclusion: `写直达发出 ${writePolicyOps.length} 次写入。写回发出 ${writes} 次。`,
      detail: `缓存有 ${writePolicySlots} 行。上层写 ${writePolicyOps.length} 次。结束还脏 ${dirty} 行。下层数值不同有 ${different} 块。回放显示每次换出或刷回。`,
      explanation: "写直达每次更新下层。写回先改缓存。重复写可合成一次写回。换出脏行时先更新下层。未刷的值还可能只在缓存中。",
      suggestion: "关闭末尾刷回。观察下层是否落后。再换两个不争同一行的块。",
    } };
  },
});

export const conditionRecheckLab = defineCurriculumLab({
  id: "condition-recheck", domain: "operating-systems", title: "条件变量与醒后重查",
  description: "唤醒后抢锁。对照 if 和 while。",
  comparison: "醒后直接取 / 醒后重查",
  topics: ["condition-variable-while"],
  input: {
    conditionProduced: { kind: "integer", min: 0, max: 8, label: "本轮放入件数", hint: "生产者放入后广播通知。0 表示只有唤醒。" },
    conditionWaiters: { kind: "integer", min: 1, max: 8, label: "等待者数", hint: "起初全部因空队列等待。" },
    conditionBargers: { kind: "integer", min: 0, max: 8, label: "抢先消费者数", hint: "他们在等待者重新拿锁前，每人最多取一件。" },
  },
  defaults: { goalLabel: "测通知和实际可取资源之间的差异", conditionProduced: 2, conditionWaiters: 3, conditionBargers: 1 },
  columns: ["事件", "if 行为", "if 剩余", "while 行为", "while 剩余"],
  metricLabels: { conditionIfInvalid: "if 空取次数", conditionWhileWait: "while 重新等待人数",
    conditionSuccessful: "被唤醒者成功取件", conditionBeforeWake: "等待者拿锁前件数" },
  focusMetric: "conditionIfInvalid", alternateTrial: "把放入件数增加到 4。",
  run({ conditionProduced, conditionWaiters, conditionBargers }) {
    const stolen = Math.min(conditionProduced, conditionBargers);
    const available = conditionProduced - stolen;
    let left = available;
    let invalid = 0;
    let consumed = 0;
    const steps: [string, string, number, string, number][] = [
      ["广播通知", "进入待抢锁队列", conditionProduced, "进入待抢锁队列", conditionProduced],
      ["其他人先拿锁", `取走 ${stolen} 件`, available, `取走 ${stolen} 件`, available],
    ];
    for (let index = 1; index <= conditionWaiters; index++) {
      if (left) {
        left--;
        consumed++;
        steps.push([`等待者 ${index}`, "取到一件", left, "重查后取到", left]);
      } else {
        invalid++;
        steps.push([`等待者 ${index}`, "空取失败", 0, "重查后继续等", 0]);
      }
    }
    return { steps, metrics: { conditionIfInvalid: invalid, conditionWhileWait: conditionWaiters - consumed,
      conditionSuccessful: consumed, conditionBeforeWake: available }, report: {
      conclusion: `if 空取 ${invalid} 次。while 让 ${conditionWaiters - consumed} 人继续等待。`,
      detail: `生产者放入 ${conditionProduced} 件。先到者取走 ${stolen} 件。实际唤醒 ${conditionWaiters} 人。醒来后成功取到 ${consumed} 件。回放按重新拿锁的次序展示。`,
      explanation: "被唤醒要重新拿锁。拿锁前资源可能已变化。while 在锁内重查条件。条件仍为假就继续等。模型把空取记作失败。",
      suggestion: "只增加放入件数。观察何时不再空取。再增抢先消费者重测。",
    } };
  },
});

export const feedbackQueueLab = defineCurriculumLab({
  id: "feedback-queue", domain: "operating-systems", title: "多级反馈队列与优先级提升",
  description: "同一批任务。对照有无定期提升。",
  comparison: "无提升 / 定期提升",
  topics: ["mlfq-priority-boost"],
  input: {
    feedbackLongWork: { kind: "integer", min: 2, max: 12, label: "长任务用时", hint: "2–12 拍。长任务第 0 拍就绪。" },
    feedbackShortArrivals: { kind: "list", min: 1, max: 24, minItems: 0, maxItems: 12, label: "短任务到达时刻",
      hint: "每项为 1–24 拍。每个短任务只用 1 拍。" },
    feedbackBoostEvery: { kind: "integer", min: 0, max: 12, label: "每几拍提升", hint: "0 关闭提升，1–12 指定周期。" },
  },
  defaults: { goalLabel: "测短任务连到时长任务能否提前运行", feedbackLongWork: 3,
    feedbackShortArrivals: [1, 2, 3, 4, 5, 6], feedbackBoostEvery: 3 },
  columns: ["时刻", "无提升执行者", "无提升等待队列", "定期提升执行者", "定期提升等待队列"],
  metricLabels: { feedbackPlainFinish: "无提升长任务完成时刻", feedbackBoostFinish: "提升组长任务完成时刻",
    feedbackPlainWait: "无提升最长连续等待", feedbackBoostWait: "提升组最长连续等待",
    feedbackPlainShortWait: "无提升短任务最长等待", feedbackBoostShortWait: "提升组短任务最长等待", feedbackPromotions: "实际提级次数" },
  focusMetric: "feedbackBoostFinish", alternateTrial: "只把提升周期改为 0。",
  run({ feedbackLongWork, feedbackShortArrivals, feedbackBoostEvery }) {
    const simulate = (period: number) => {
      const high = [{ id: "长任务", arrival: 0, remaining: feedbackLongWork }];
      const low: typeof high = [];
      const arrivals = feedbackShortArrivals.map((arrival, index) => ({ id: `短 ${index + 1}`, arrival, remaining: 1 }))
        .sort((a, b) => a.arrival - b.arrival);
      const frames: [string, string][] = [];
      let longFinish = 0;
      let lastLongEnd = 0;
      let longestWait = 0;
      let shortWait = 0;
      let boosted = 0;
      let next = 0;
      for (let tick = 0; high.length || low.length || next < arrivals.length; tick++) {
        const lift = period > 0 && tick > 0 && tick % period === 0 && low.length > 0;
        if (lift) {
          boosted += low.length;
          high.push(...low.splice(0));
        }
        while (arrivals[next]?.arrival === tick) high.push(arrivals[next++]);
        const hasHigh = high.length > 0;
        const job = (hasHigh ? high : low).shift();
        if (job) {
          job.remaining--;
          if (job.id === "长任务") {
            longestWait = Math.max(longestWait, tick - lastLongEnd);
            lastLongEnd = tick + 1;
            if (!job.remaining) longFinish = tick + 1;
          } else shortWait = Math.max(shortWait, tick - job.arrival);
          if (job.remaining) low.push(job);
        }
        const queue = (items: typeof high) => items.map(({ id }) => id).join("、") || "空";
        frames.push([`${lift ? "提级 · " : ""}${job ? `${job.id}（${hasHigh ? "高" : "低"}）` : "空闲"}`,
          `高 ${queue(high)} / 低 ${queue(low)}`]);
      }
      return { frames, longFinish, longestWait, shortWait, boosted };
    };
    const plain = simulate(0);
    const boost = simulate(feedbackBoostEvery);
    const steps = Array.from({ length: Math.max(plain.frames.length, boost.frames.length) }, (_, tick) =>
      [tick, ...(plain.frames[tick] ?? ["—", "—"]), ...(boost.frames[tick] ?? ["—", "—"])] as const);
    return { steps, metrics: { feedbackPlainFinish: plain.longFinish, feedbackBoostFinish: boost.longFinish,
      feedbackPlainWait: plain.longestWait, feedbackBoostWait: boost.longestWait, feedbackPlainShortWait: plain.shortWait,
      feedbackBoostShortWait: boost.shortWait, feedbackPromotions: boost.boosted }, report: {
      conclusion: `长任务分别在第 ${plain.longFinish}、${boost.longFinish} 拍完成。最长等待为 ${plain.longestWait} 和 ${boost.longestWait} 拍。`,
      detail: `长任务需 ${feedbackLongWork} 拍。短任务有 ${feedbackShortArrivals.length} 个。提升组提级 ${boost.boosted} 次。短任务最长等 ${plain.shortWait} 和 ${boost.shortWait} 拍。表中完成时间按拍末计。`,
      explanation: "每拍先选高优先队列。未完成任务降到低队列。低队列也按一拍轮转。到期先提级，再接新任务。已在高队列的任务先排。",
      suggestion: "保持任务不变，只关提升。比较长任务何时完成。也看短任务多等几拍。",
    } };
  },
});

export const fileLinksLab = defineCurriculumLab({
  id: "file-links", domain: "operating-systems", title: "硬链接与符号链接",
  description: "删掉一个文件名。再读两种链接。",
  comparison: "硬链接 B / 指向路径 A 的符号链接 S",
  topics: ["unix-hard-symlink-target", "inode-directory-entry"],
  input: {
    linkFileValue: { kind: "integer", min: -99, max: 99, label: "原文件内容", hint: "用一个 -99–99 的整数代表内容。" },
    linkFileOps: { kind: "rows", columns: [[0, 3], [-99, 99]], minItems: 1, maxItems: 20, label: "文件操作",
      hint: "0 读、1 删除，第二列填名字 A/B/S/C 对应 0/1/2/3。2 新建 A，第二列填内容。3 将 A 改名 C，第二列填 0。" },
  },
  defaults: { goalLabel: "核对原名删除与重建时两种链接的表现", linkFileValue: 7,
    linkFileOps: [[0, 2], [1, 0], [0, 1], [0, 2], [2, 42], [0, 2]] },
  check: ({ linkFileOps }) => linkFileOps.every(([op, argument]) => op === 2 || (op === 3 ? argument === 0 : argument >= 0 && argument <= 3)),
  columns: ["动作", "结果", "硬链接名字", "S 指向 A", "原文件硬链接数"],
  metricLabels: { linkReadMisses: "读取失败次数", linkDanglingReads: "悬空符号链接读取次数",
    linkReplacementReads: "S 读到新文件次数", linkOriginalRefs: "原文件硬链接数", linkLastRead: "最后成功读取的内容" },
  focusMetric: "linkDanglingReads", alternateTrial: "第二步改成删除 B。其余动作不变。",
  run({ linkFileValue, linkFileOps }) {
    const original = { inode: 1, value: linkFileValue };
    const hardNames = new Map([["A", original], ["B", original]]);
    let nextInode = 2;
    let softExists = true;
    let misses = 0;
    let dangling = 0;
    let replacementReads = 0;
    let lastRead: number | string = "无读取";
    const names = ["A", "B", "S", "C"];
    const references = () => [...hardNames.values()].filter((entry) => entry === original).length;
    const status = () => [...hardNames].map(([name, entry]) => `${name}→${entry.inode}`).join("、") || "空";
    const target = () => !softExists ? "S 已删除" : hardNames.has("A") ? `A→${hardNames.get("A")!.inode}` : "A 缺失 · 悬空";
    const steps: [string, string, string, string, number][] = [["初始", "A、B 共用 inode 1", status(), target(), references()]];
    for (const [op, argument] of linkFileOps) {
      const name = names[argument];
      let action: string;
      let result: string;
      if (op === 0) {
        action = `读取 ${name}`;
        const entry = name === "S" && softExists ? hardNames.get("A") : hardNames.get(name);
        if (entry) {
          lastRead = entry.value;
          if (name === "S" && entry !== original) replacementReads++;
          result = `inode ${entry.inode} · 内容 ${entry.value}`;
        } else {
          misses++;
          if (name === "S" && softExists) dangling++;
          result = "找不到文件";
        }
      } else if (op === 1) {
        action = `删除 ${name}`;
        const removed = name === "S" ? softExists : hardNames.delete(name);
        if (name === "S") softExists = false;
        result = removed ? "移除名字" : "名字不存在";
      } else if (op === 2) {
        action = "新建 A";
        result = "A 已存在";
        if (!hardNames.has("A")) {
          const inode = nextInode++;
          hardNames.set("A", { inode, value: argument });
          result = `创建 inode ${inode} · 内容 ${argument}`;
        }
      } else {
        action = "A 改名 C";
        const file = hardNames.get("A");
        result = !file ? "A 不存在" : "C 已存在";
        if (file && !hardNames.has("C")) {
          hardNames.delete("A");
          hardNames.set("C", file);
          result = `仍指向 inode ${file.inode}`;
        }
      }
      steps.push([action, result, status(), target(), references()]);
    }
    return { steps, metrics: { linkReadMisses: misses, linkDanglingReads: dangling, linkReplacementReads: replacementReads,
      linkOriginalRefs: references(), linkLastRead: lastRead }, report: {
      conclusion: `悬空读取 ${dangling} 次。S 读到新文件 ${replacementReads} 次。`,
      detail: `执行 ${linkFileOps.length} 项操作。读取失败 ${misses} 次。原文件还剩 ${references()} 个硬链接。最后成功读取为 ${lastRead}。回放列出每次访问的 inode。`,
      explanation: "硬链接直接指向 inode。符号链接保存路径 A。删掉名字会改变路径查找。同名新文件可有新 inode。模型只在 C 空闲时改名。",
      suggestion: "先把删除 A 改为删除 B。再试把 A 改名 C。对照 S 和硬链接的读取。",
    } };
  },
});

export const copyOnWriteLab = defineCurriculumLab({
  id: "copy-on-write", domain: "operating-systems", title: "fork 与写时复制",
  description: "先读再写。核对谁复制了哪一页。",
  comparison: "fork 时全量复制 / 写时复制",
  topics: ["fork-copy-on-write"],
  input: {
    cowInitialPages: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 8, label: "各页初值", hint: "填写 1–8 个整数，从第 0 页起。" },
    cowOperations: { kind: "rows", columns: [[0, 1], [0, 1], [0, 7], [-99, 99]], minItems: 1, maxItems: 20, label: "读写顺序",
      hint: "每行填进程（0 父、1 子）、读写（0 读、1 写）、页号、写入值（读时填 0）。" },
  },
  defaults: { goalLabel: "分别观察共享页和私有页上的写入", cowInitialPages: [10, 20, 30, 40],
    cowOperations: [[1, 0, 0, 0], [1, 1, 1, 99], [0, 1, 1, 77], [0, 1, 2, 20], [1, 0, 1, 0]] },
  check: ({ cowInitialPages, cowOperations }) => cowOperations.every(([, write, page, value]) =>
    page < cowInitialPages.length && (write === 1 || value === 0)),
  columns: ["动作", "立即复制", "写时复制", "写时组父进程页值", "写时组子进程页值"],
  metricLabels: { eagerPageCopies: "立即复制页数", cowPageCopies: "写时复制页数", cowSharedPages: "仍共享页数",
    cowFinalParent: "父进程最终页值", cowFinalChild: "子进程最终页值" },
  focusMetric: "cowPageCopies", alternateTrial: "把父进程对第 2 页的写入改到第 1 页。",
  run({ cowInitialPages, cowOperations }) {
    const parent = cowInitialPages.map((value) => ({ value }));
    const mappings = [parent, [...parent]];
    const eager = [[...cowInitialPages], [...cowInitialPages]];
    const view = (process: number) => sequenceText(mappings[process].map(({ value }) => value));
    let copies = 0;
    const steps: [string, string, string, string, string][] = [
      ["fork", `复制 ${parent.length} 页`, `共享 ${parent.length} 页`, view(0), view(1)],
    ];
    for (const [process, write, page, value] of cowOperations) {
      const same = mappings[process][page] === mappings[1 - process][page];
      if (write) {
        if (same) {
          mappings[process][page] = { ...mappings[process][page] };
          copies++;
        }
        mappings[process][page].value = value;
        eager[process][page] = value;
      }
      const action = `${process === 0 ? "父" : "子"}${write ? "写" : "读"}第 ${page} 页`;
      const cowValue = mappings[process][page].value;
      steps.push([action, write ? `直接写 ${value}` : `读到 ${eager[process][page]}`,
        write ? `${same ? "先复制" : "已私有"} · 写 ${value}` : `${same ? "共享页" : "私有页"} · 读到 ${cowValue}`, view(0), view(1)]);
    }
    const shared = mappings[0].filter((page, index) => mappings[1][index] === page).length;
    return { steps, metrics: { eagerPageCopies: parent.length, cowPageCopies: copies, cowSharedPages: shared,
      cowFinalParent: view(0), cowFinalChild: view(1) }, report: {
      conclusion: `立即复制 ${parent.length} 页。写时复制 ${copies} 页。剩余共享 ${shared} 页。`,
      detail: `共执行 ${cowOperations.length} 次读写。父进程最终为 ${view(0)}。子进程最终为 ${view(1)}。回放会标出首次复制。两组均保留进程间写入隔离。`,
      explanation: "fork 先共用物理页。读共享页无需复制。第一次写共享页才分开。另一方保留原数据。再写私有页无需再复制。模型用一个数代表一页。",
      suggestion: "让两次写都落在同一页。比较复制页数。再加入一次只读操作。",
    } };
  },
});

export const readerWriterLab = defineCurriculumLab({
  id: "reader-writer", domain: "operating-systems", title: "读写锁与写者等待",
  description: "同一批读写请求。比较两种放行规则。",
  comparison: "读者优先 / 写者优先",
  topics: ["reader-writer-writer-starvation"],
  input: {
    rwJobs: { kind: "rows", columns: [[0, 24], [0, 1], [1, 12]], minItems: 1, maxItems: 16, label: "读写任务",
      hint: "每行填到达拍、任务类（0 读、1 写）、持锁拍数。至少一个写者。" },
  },
  defaults: { goalLabel: "观察连续读请求如何推迟写者", rwJobs: [[0, 0, 3], [1, 1, 2], [2, 0, 3], [4, 0, 2], [5, 0, 2]] },
  check: ({ rwJobs }) => rwJobs.some(([, kind]) => kind === 1),
  columns: ["时刻", "读者优先事件", "读者优先等待", "写者优先事件", "写者优先等待"],
  metricLabels: { rwReaderPolicyWriteWait: "读者优先写者最长等待", rwWriterPolicyWriteWait: "写者优先写者最长等待",
    rwReaderPolicyReadWait: "读者优先读者最长等待", rwWriterPolicyReadWait: "写者优先读者最长等待" },
  focusMetric: "rwReaderPolicyWriteWait", alternateTrial: "把后续读者移到第 7 拍以后。",
  run({ rwJobs }) {
    const jobs = rwJobs.map(([arrival, kind, hold], index) => ({ arrival, kind, hold, id: index + 1 }))
      .sort((a, b) => a.arrival - b.arrival || a.id - b.id);
    const name = (job: typeof jobs[number]) => `${job.kind === 0 ? "读" : "写"}${job.id}`;
    const simulate = (writerFirst: boolean) => {
      const queue: typeof jobs = [];
      let active: { end: number; job: typeof jobs[number] }[] = [];
      let next = 0;
      const waits = [0, 0];
      const frames = new Map<number, [string, string]>();
      for (let tick = 0; next < jobs.length || queue.length || active.length; tick++) {
        const notes = active.filter(({ end }) => end === tick).map(({ job }) => `${name(job)} 释放`);
        active = active.filter(({ end }) => end > tick);
        while (jobs[next]?.arrival === tick) {
          notes.push(`${name(jobs[next])} 到达`);
          queue.push(jobs[next++]);
        }
        const waitingWriter = queue.findIndex(({ kind }) => kind === 1);
        const readersCanStart = !active.some(({ job }) => job.kind === 1) && (!writerFirst || waitingWriter < 0);
        const enter = readersCanStart ? queue.filter(({ kind }) => kind === 0) : [];
        if (!enter.length && !active.length && waitingWriter >= 0) enter.push(queue[waitingWriter]);
        for (const job of enter) {
          queue.splice(queue.indexOf(job), 1);
          active.push({ job, end: tick + job.hold });
          waits[job.kind] = Math.max(waits[job.kind], tick - job.arrival);
          notes.push(`${name(job)} 拿锁`);
        }
        if (notes.length) frames.set(tick, [notes.join(" · "), queue.map(name).join("、") || "空"]);
      }
      return { waits, frames };
    };
    const readers = simulate(false);
    const writers = simulate(true);
    const ticks = [...new Set([...readers.frames.keys(), ...writers.frames.keys()])].sort((a, b) => a - b);
    const steps = ticks.map((tick) => [tick, ...(readers.frames.get(tick) ?? ["—", "—"]), ...(writers.frames.get(tick) ?? ["—", "—"])] as const);
    return { steps, metrics: { rwReaderPolicyWriteWait: readers.waits[1], rwWriterPolicyWriteWait: writers.waits[1],
      rwReaderPolicyReadWait: readers.waits[0], rwWriterPolicyReadWait: writers.waits[0] }, report: {
      conclusion: `写者最长等 ${readers.waits[1]} 拍。写者优先时等 ${writers.waits[1]} 拍。`,
      detail: `共调度 ${jobs.length} 个请求。读者最长等 ${readers.waits[0]} 和 ${writers.waits[0]} 拍。等待从到达到拿锁。每拍先释放再放行。回放标出排队和拿锁。`,
      explanation: "多个读者能同时持锁。写者只在锁空时进入。读者优先会放行后来读者。写者优先会先等读者退出。有限请求只展示本轮等待。",
      suggestion: "把晚到的读请求往后挪。再比较两组等待。也可加一串连续读请求。",
    } };
  },
});

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
