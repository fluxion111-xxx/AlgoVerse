import { defineCurriculumLab, sequenceText } from "./curriculumLab";

export const mutableDefaultLab = defineCurriculumLab({
  id: "mutable-default", domain: "programming", title: "Python 可变默认参数",
  description: "连续调用函数。对照共享列表和新列表。",
  comparison: "列表作默认值 / 调用时创建列表",
  topics: ["python-mutable-default-argument"],
  input: {
    defaultCallValues: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 12, label: "每次追加的值", hint: "每个数对应一次函数调用。" },
    defaultExplicitCalls: { kind: "list", min: 1, max: 12, minItems: 0, maxItems: 12, label: "显式传列表的调用",
      hint: "填调用编号，从 1 起。这些调用各传一个新空列表。" },
  },
  defaults: { goalLabel: "找出省略参数的调用何时共享状态", defaultCallValues: [1, 2, 3], defaultExplicitCalls: [] },
  check: ({ defaultCallValues, defaultExplicitCalls }) => defaultExplicitCalls.every((id) => id <= defaultCallValues.length),
  columns: ["调用", "是否显式传列表", "追加值", "共享默认值结果", "每次创建结果"],
  metricLabels: { defaultSharedCalls: "使用共享默认值次数", defaultSharedFinal: "共享列表最终内容",
    defaultDifferentCalls: "返回内容不同次数", defaultSharedLength: "共享列表最终长度" },
  focusMetric: "defaultSharedLength", alternateTrial: "让第 2 次调用显式传空列表。",
  run({ defaultCallValues, defaultExplicitCalls }) {
    const explicit = new Set(defaultExplicitCalls);
    const shared: number[] = [];
    let sharedCalls = 0;
    let different = 0;
    const steps = defaultCallValues.map((value, index) => {
      const supplied = explicit.has(index + 1);
      const alias = supplied ? [] : shared;
      const fresh: number[] = [];
      alias.push(value);
      fresh.push(value);
      sharedCalls += Number(!supplied);
      different += Number(alias.length !== fresh.length);
      return [index + 1, supplied ? "是" : "否", value, sequenceText(alias), sequenceText(fresh)] as const;
    });
    return { steps, metrics: { defaultSharedCalls: sharedCalls, defaultSharedFinal: sequenceText(shared), defaultDifferentCalls: different,
      defaultSharedLength: shared.length }, report: {
      conclusion: `共享默认列表留下 ${shared.length} 项。两种做法有 ${different} 次返回不同。`,
      detail: `共调用 ${steps.length} 次。省略列表 ${sharedCalls} 次。显式传入 ${steps.length - sharedCalls} 次。共享列表结果为 ${sequenceText(shared)}。回放保存每次调用当时的结果。`,
      explanation: "函数定义时创建默认列表。省略参数时重复使用它。显式传入绕过默认值。另一写法用空标记作默认。需要列表时再创建。",
      suggestion: "改一轮为显式传入。看共享列表少了谁。再重复输入同一个数。",
    } };
  },
});

export const exceptionGuaranteeLab = defineCurriculumLab({
  id: "exception-guarantee", domain: "programming", title: "强异常保证与暂存提交",
  description: "中途故意失败。核对对象是否改了一半。",
  comparison: "逐项原地修改 / 暂存后一次提交",
  topics: ["cpp-strong-exception-guarantee"],
  input: {
    guaranteeBase: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 10, label: "原对象内容", hint: "1–10 个值，从 0 编号。" },
    guaranteeEdits: { kind: "rows", columns: [[0, 9], [-99, 99]], minItems: 1, maxItems: 12, label: "修改下标与新值", hint: "每行一次写入，可重复改同一位置。" },
    guaranteeFailAt: { kind: "integer", min: 0, max: 12, label: "失败操作编号", hint: "从 1 起，失败在写入之前。0 表示不失败。" },
  },
  defaults: { goalLabel: "验证暂存组的失败不改变可见对象", guaranteeBase: [10, 20, 30], guaranteeEdits: [[0, 8], [1, 22], [2, 9]], guaranteeFailAt: 2 },
  check: ({ guaranteeBase, guaranteeEdits, guaranteeFailAt }) => guaranteeFailAt <= guaranteeEdits.length &&
    guaranteeEdits.every(([index]) => index < guaranteeBase.length),
  columns: ["事件", "原地组可见数据", "暂存组可见数据", "暂存内容"],
  metricLabels: { guaranteePartialFields: "原地组改变位置数", guaranteePublishedFields: "暂存组改变位置数",
    guaranteeOriginalResult: "原地最终状态", guaranteeStagedResult: "暂存组最终状态", guaranteeApplied: "失败前实际写入次数" },
  focusMetric: "guaranteePublishedFields", alternateTrial: "把失败操作编号改为 0。",
  run({ guaranteeBase, guaranteeEdits, guaranteeFailAt }) {
    const direct = [...guaranteeBase];
    const staged = [...guaranteeBase];
    let published = guaranteeBase;
    let applied = 0;
    const steps: [string, string, string, string][] = [];
    for (const [index, [cell, value]] of guaranteeEdits.entries()) {
      if (index + 1 === guaranteeFailAt) {
        steps.push([`第 ${index + 1} 项失败`, sequenceText(direct), sequenceText(published), "丢弃暂存"]);
        break;
      }
      direct[cell] = value;
      staged[cell] = value;
      applied++;
      steps.push([`写入位置 ${cell}`, sequenceText(direct), sequenceText(published), sequenceText(staged)]);
    }
    if (!guaranteeFailAt) {
      published = staged;
      steps.push(["一次提交", sequenceText(direct), sequenceText(published), "提交完成"]);
    }
    const changes = (values: number[]) => values.filter((value, index) => value !== guaranteeBase[index]).length;
    return { steps, metrics: { guaranteePartialFields: changes(direct), guaranteePublishedFields: changes(published),
      guaranteeOriginalResult: sequenceText(direct), guaranteeStagedResult: sequenceText(published), guaranteeApplied: applied }, report: {
      conclusion: `原地组改动 ${changes(direct)} 处。暂存组改动 ${changes(published)} 处。`,
      detail: `计划改 ${guaranteeEdits.length} 次。实际先写 ${applied} 次。失败操作号为 ${guaranteeFailAt}。原地最终值为 ${sequenceText(direct)}。暂存组为 ${sequenceText(published)}。`,
      explanation: "原地写入马上可见。中途失败会留下已写的值。暂存组先改副本。准备成功才发布。模型的最后提交不会失败。",
      suggestion: "只关闭失败点。对照最后值。再让第一步失败，核对两组。",
    } };
  },
});

export const copyMoveLab = defineCurriculumLab({
  id: "copy-move", domain: "programming", title: "C++ 复制与移动所有权",
  description: "比较自定义缓冲对象的两种交接。",
  comparison: "复制独立缓冲 / 移动接管缓冲",
  topics: ["cpp-copy-move"],
  input: {
    moveBufferValues: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 12, label: "源缓冲数据", hint: "1–12 个整数。" },
    moveDestinationValue: { kind: "integer", min: -99, max: 99, label: "接收方写入首值", hint: "交接后写入首位，核对原对象。" },
  },
  defaults: { goalLabel: "核对复制元素数和交接后的缓冲归属", moveBufferValues: [4, 8, 15], moveDestinationValue: 7 },
  columns: ["动作", "复制源 / 接收方", "移动源 / 接收方", "复制组数据", "移动组数据"],
  metricLabels: { moveCopiedCells: "复制的元素数", moveTransferredCells: "移动接管的元素数", moveCopySource: "复制组源对象末值",
    moveSourceOwns: "移动后源是否仍持有缓冲", moveReceiver: "接收方末值" },
  focusMetric: "moveCopiedCells", alternateTrial: "把源缓冲改为只含 4。",
  run({ moveBufferValues, moveDestinationValue }) {
    const copySource = { id: 1, cells: [...moveBufferValues] };
    const copyTarget = { id: 2, cells: [...copySource.cells] };
    const moveSource = { buffer: { id: 1, cells: [...moveBufferValues] } as { id: number; cells: number[] } | null };
    const moveTarget = moveSource.buffer!;
    moveSource.buffer = null;
    const steps: [string, string, string, string, string][] = [["交接", `${copySource.id} / ${copyTarget.id}`, `空 / ${moveTarget.id}`,
      sequenceText(copyTarget.cells), sequenceText(moveTarget.cells)]];
    copyTarget.cells[0] = moveDestinationValue;
    moveTarget.cells[0] = moveDestinationValue;
    steps.push(["改接收方首位", `${copySource.id} / ${copyTarget.id}`, `空 / ${moveTarget.id}`,
      sequenceText(copyTarget.cells), sequenceText(moveTarget.cells)]);
    steps.push(["核对源对象", `源值 ${sequenceText(copySource.cells)}`, "移后为空", sequenceText(copyTarget.cells), sequenceText(moveTarget.cells)]);
    return { steps,
      metrics: { moveCopiedCells: copyTarget.cells.length, moveTransferredCells: moveTarget.cells.length,
        moveCopySource: sequenceText(copySource.cells), moveSourceOwns: moveSource.buffer ? "是" : "否", moveReceiver: sequenceText(moveTarget.cells) }, report: {
      conclusion: `复制组复制 ${copyTarget.cells.length} 项。移动组直接接管原缓冲。`,
      detail: `源缓冲有 ${moveBufferValues.length} 项。接收方把首值改为 ${moveDestinationValue}。复制组源值为 ${sequenceText(copySource.cells)}。移动组源已空。回放用编号追踪缓冲。`,
      explanation: "复制构造新缓冲。移动让接收方拥有原缓冲。移后为空是这个类的约定。std::move 只改变值类别。实际转移来自移动构造。",
      suggestion: "先缩短缓冲。核对复制计数。再只改接收方新值，核对复制源。",
    } };
  },
});

export const cStringLab = defineCurriculumLab({
  id: "c-string-terminator", domain: "programming", title: "C 字符串与结束字节",
  description: "拷贝同一串字节。检查容量和结尾。",
  comparison: "预留空字符 / 只复制内容",
  topics: ["c-string-terminator"],
  input: {
    cStringSource: { kind: "list", min: 1, max: 255, minItems: 1, maxItems: 20, label: "源字节（不含结尾）", hint: "每项 1–255。结尾由写入方式决定。" },
    cStringCapacity: { kind: "integer", min: 1, max: 24, label: "目标容量", hint: "1–24 字节。未覆盖的格子初值为 88。" },
  },
  defaults: { goalLabel: "验证内容长度之外还需一格放结尾", cStringSource: [65, 66, 67, 68], cStringCapacity: 4 },
  columns: ["下标", "预留组字节", "仅复制字节", "预留组读取", "仅复制组读取"],
  metricLabels: { cStringSafeLength: "预留组读出长度", cStringLostBytes: "预留组截断字节", cStringRawContainsNull: "仅复制组找到结尾",
    cStringRequired: "完整保存所需容量" },
  focusMetric: "cStringLostBytes", alternateTrial: "只把目标容量改为 5。",
  run({ cStringSource, cStringCapacity }) {
    const safe = Array<number>(cStringCapacity).fill(88);
    const raw = [...safe];
    const used = cStringSource.slice(0, cStringCapacity - 1);
    used.forEach((value, index) => { safe[index] = value; });
    safe[used.length] = 0;
    cStringSource.slice(0, cStringCapacity).forEach((value, index) => { raw[index] = value; });
    const stop = raw.indexOf(0);
    const steps = safe.map((value, index) => [index, value, raw[index], value === 0 ? "遇到结尾" : index < used.length ? "取字节" : "已停止",
      raw[index] === 0 ? "遇到结尾" : index + 1 === raw.length && stop < 0 ? "缓冲区内无结尾" : "未结束"] as const);
    const lost = cStringSource.length - used.length;
    return { steps, metrics: { cStringSafeLength: used.length, cStringLostBytes: lost,
      cStringRawContainsNull: stop >= 0 ? "是" : "否", cStringRequired: cStringSource.length + 1 }, report: {
      conclusion: `预留组读出 ${used.length} 字节。仅复制组未补写结束字节。`,
      detail: `源内容长 ${cStringSource.length}。容量为 ${cStringCapacity}。预留组截断 ${lost} 字节。完整存放需 ${cStringSource.length + 1} 格。回放标出结束位置。`,
      explanation: "C 字符串遇零结束。内容和结尾都占容量。仅填内容可能找不到零。本实验只检查已分配空间。模拟缓冲区初值非零。",
      suggestion: "先增加一个字节的容量。检查能否存全。再试容量只有 1。",
    } };
  },
});

export const generatorExhaustionLab = defineCurriculumLab({
  id: "generator-exhaustion", domain: "programming", title: "生成器与迭代耗尽",
  description: "分几次取值。回放生成器的位置。",
  comparison: "复用生成器 / 每次新建",
  topics: ["python-iterator-exhaustion", "python-generator"],
  input: {
    generatorValues: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 12, label: "依次产出的值", hint: "1–12 个整数，按输入顺序产出。" },
    generatorTakeCounts: { kind: "list", min: 1, max: 12, minItems: 1, maxItems: 12, label: "每批要取的个数",
      hint: "最多 12 批。每批要取 1–12 个，遇耗尽即停。" },
  },
  defaults: { goalLabel: "比较复用与每次新建的取值结果", generatorValues: [2, 4, 6, 8], generatorTakeCounts: [3, 3, 2] },
  columns: ["批次", "请求个数", "复用取到", "每次新建取到", "复用剩余", "触发耗尽"],
  metricLabels: { generatorReusedProduced: "复用累计产出", generatorFreshProduced: "新建累计产出", generatorReusedStops: "复用触发耗尽的批数",
    generatorFreshStops: "新建触发耗尽的批数", generatorReusedLast: "复用末批产出" },
  focusMetric: "generatorReusedStops", alternateTrial: "把每批取值数改成 1、1、1。",
  run({ generatorValues, generatorTakeCounts }) {
    function* newIterator() {
      yield* generatorValues;
    }
    const read = (iterator: ReturnType<typeof newIterator>, count: number) => {
      const taken: number[] = [];
      while (taken.length < count) {
        const next = iterator.next();
        if (next.done) return { taken, stopped: true };
        taken.push(next.value);
      }
      return { taken, stopped: false };
    };
    const reused = newIterator();
    let reusedProduced = 0;
    let freshProduced = 0;
    let reusedStops = 0;
    let freshStops = 0;
    let last = "";
    const steps = generatorTakeCounts.map((count, index) => {
      const current = read(reused, count);
      const fresh = read(newIterator(), count);
      reusedProduced += current.taken.length;
      freshProduced += fresh.taken.length;
      reusedStops += Number(current.stopped);
      freshStops += Number(fresh.stopped);
      last = sequenceText(current.taken);
      return [index + 1, count, last, sequenceText(fresh.taken), generatorValues.length - reusedProduced,
        `复用 ${current.stopped ? "是" : "否"} / 新建 ${fresh.stopped ? "是" : "否"}`] as const;
    });
    return { steps, metrics: { generatorReusedProduced: reusedProduced, generatorFreshProduced: freshProduced,
      generatorReusedStops: reusedStops, generatorFreshStops: freshStops, generatorReusedLast: last }, report: {
      conclusion: `复用取到 ${reusedProduced} 项。每次新建取到 ${freshProduced} 项。`,
      detail: `原序列有 ${generatorValues.length} 项。分 ${steps.length} 批取值。复用遇耗尽 ${reusedStops} 批。新建遇耗尽 ${freshStops} 批。复用末批取到 ${last}。`,
      explanation: "生成器每取一次就前进一步。复用会接着原位置读。新建会从头读。取完后再请求才遇耗尽。模型用生成器模拟 next。",
      suggestion: "只减小每批请求数。比较两个输出序列。再试正好取完后多取一次。",
    } };
  },
});

export const mutableHashKeyLab = defineCurriculumLab({
  id: "mutable-hash-key", domain: "programming", title: "Java 哈希键修改与查找",
  description: "改掉参与哈希的编号。再查登记项。",
  comparison: "登记后直接改键 / 改键前先移除",
  topics: ["java-equals-hashcode"],
  input: {
    hashKeyBefore: { kind: "integer", min: 0, max: 99, label: "登记时的编号", hint: "编号同时参与哈希和相等判断。" },
    hashKeyAfter: { kind: "integer", min: 0, max: 99, label: "修改后的编号", hint: "可填相同或不同的编号。" },
    hashKeyBuckets: { kind: "integer", min: 2, max: 16, label: "模拟桶数", hint: "2–16 个桶。使用编号取余。" },
  },
  defaults: { goalLabel: "验证桶相同也不能修复已改的键", hashKeyBefore: 3, hashKeyAfter: 11, hashKeyBuckets: 8 },
  columns: ["步骤", "查询键", "直接改键", "移除后改键", "备注"],
  metricLabels: { hashKeyUnsafeFound: "直接改键后能否查到", hashKeySafeFound: "重登记后能否查到", hashKeySameBucket: "修改前后是否同桶",
    hashKeyOriginalBucket: "原桶号", hashKeyUpdatedBucket: "新桶号" },
  focusMetric: "hashKeyUnsafeFound", alternateTrial: "只把修改后的编号改回 3。",
  run({ hashKeyBefore, hashKeyAfter, hashKeyBuckets }) {
    const unsafeKey = { id: hashKeyBefore };
    const safeKey = { id: hashKeyBefore };
    const unsafeEntry = { key: unsafeKey, hash: unsafeKey.id };
    let safeEntry: typeof unsafeEntry | null = { key: safeKey, hash: safeKey.id };
    const bucket = (hash: number) => hash % hashKeyBuckets;
    const lookup = (entry: typeof unsafeEntry | null, id: number) => {
      if (!entry || bucket(entry.hash) !== bucket(id)) return "查不到 · 桶内无记录";
      if (entry.hash !== id) return "查不到 · 哈希不同";
      return entry.key.id === id ? "查到" : "查不到 · 键不相等";
    };
    const steps: [string, string | number, string, string, string][] = [
      ["登记后读取", hashKeyBefore, lookup(unsafeEntry, hashKeyBefore), lookup(safeEntry, hashKeyBefore), `两边都在桶 ${bucket(hashKeyBefore)}`],
    ];
    const removed = lookup(safeEntry, hashKeyBefore) === "查到";
    if (removed) safeEntry = null;
    steps.push(["修改前", hashKeyBefore, "保留旧记录", removed ? "按旧键移除" : "移除失败", lookup(safeEntry, hashKeyBefore)]);
    unsafeKey.id = hashKeyAfter;
    safeKey.id = hashKeyAfter;
    safeEntry = { key: safeKey, hash: safeKey.id };
    steps.push(["修改并登记", hashKeyAfter, `对象编号改为 ${unsafeKey.id}`, `新哈希为 ${safeEntry.hash}`, "左侧记录仍存旧哈希"]);
    steps.push(["查原编号", hashKeyBefore, lookup(unsafeEntry, hashKeyBefore), lookup(safeEntry, hashKeyBefore), "忽略其他键"]);
    const unsafe = lookup(unsafeEntry, hashKeyAfter);
    const safe = lookup(safeEntry, hashKeyAfter);
    steps.push(["查新编号", hashKeyAfter, unsafe, safe, "先看桶和哈希，再看相等"]);
    const oldBucket = bucket(hashKeyBefore);
    const newBucket = bucket(hashKeyAfter);
    const same = oldBucket === newBucket;
    return { steps, metrics: { hashKeyUnsafeFound: unsafe === "查到" ? "是" : "否",
      hashKeySafeFound: safe === "查到" ? "是" : "否", hashKeySameBucket: same ? "是" : "否",
      hashKeyOriginalBucket: oldBucket, hashKeyUpdatedBucket: newBucket }, report: {
      conclusion: `直接改键后${unsafe === "查到" ? "能查到" : "查不到"}。重登记后能查到。`,
      detail: `原编号为 ${hashKeyBefore}。新编号为 ${hashKeyAfter}。新旧桶号是 ${newBucket} 和 ${oldBucket}。${same ? "两次定位落在同一桶。" : "两次定位落在不同桶。"}回放可查两次键查找。`,
      explanation: "记录保存登记时的哈希。改对象不会重挂记录。同桶还要核对哈希和键。改前移除可用旧哈希。模型以编号作为哈希值。",
      suggestion: "只改新编号。分别试同桶和不同桶。再试保持编号不变。",
    } };
  },
});

export const microtaskQueueLab = defineCurriculumLab({
  id: "microtask-queue", domain: "programming", title: "微任务与计时器顺序",
  description: "逐步排队。看计时器前面有谁。",
  topics: ["js-microtasks"],
  input: {
    eventInitialMicros: { kind: "integer", min: 0, max: 8, label: "独立微任务数", hint: "脚本先排入 0–8 个。" },
    eventNestedDepth: { kind: "integer", min: 0, max: 8, label: "微任务链长度", hint: "0–8 层，每层只排下一层。" },
    eventTimerCount: { kind: "integer", min: 1, max: 6, label: "就绪计时器数", hint: "1–6 个，到期后按登记顺序执行。" },
    eventTimerMicro: { kind: "integer", min: 0, max: 1, label: "计时器追加微任务", hint: "0 不追加。1 每个追加一个。" },
  },
  defaults: { goalLabel: "测试微任务何时清空及计时器何时启动", eventInitialMicros: 2, eventNestedDepth: 3, eventTimerCount: 2, eventTimerMicro: 1 },
  columns: ["步", "执行者", "动作", "待执行微任务", "剩余计时器"],
  metricLabels: { eventFirstTimerStep: "首个计时器执行步", eventBeforeFirstTimer: "首个计时器前的微任务数",
    eventMicroCount: "执行微任务总数", eventTimerRan: "执行计时器总数" },
  focusMetric: "eventFirstTimerStep", alternateTrial: "微任务链改为 0。其他参数不动。",
  run({ eventInitialMicros, eventNestedDepth, eventTimerCount, eventTimerMicro }) {
    const queue = Array.from({ length: eventInitialMicros }, (_, i) => ({ title: `微任务 ${i + 1}`, depth: 0 }));
    if (eventNestedDepth) queue.push({ title: "链第 1 层", depth: 1 });
    const steps: [number, string, string, string, number][] = [];
    let timer = 0;
    const record = (title: string, action: string) =>
      steps.push([steps.length + 1, title, action, queue.map((job) => job.title).join("、") || "空", eventTimerCount - timer]);
    record("同步脚本", "登记计时器和初始微任务");
    let microCount = 0;
    let beforeFirstTimer = 0;
    let firstTimerStep = 0;
    while (queue.length || timer < eventTimerCount) {
      if (queue.length) {
        const { title, depth } = queue.shift()!;
        const chained = depth > 0 && depth < eventNestedDepth;
        if (chained) queue.push({ title: `链第 ${depth + 1} 层`, depth: depth + 1 });
        microCount++;
        record(title, chained ? "下一层排到微任务队尾" : "执行完毕");
      } else {
        timer++;
        if (timer === 1) {
          beforeFirstTimer = microCount;
          firstTimerStep = steps.length + 1;
        }
        if (eventTimerMicro) queue.push({ title: `计时器 ${timer} 的微任务`, depth: 0 });
        record(`计时器 ${timer}`, eventTimerMicro ? "追加一个微任务" : "执行完毕");
      }
    }
    return { steps, metrics: { eventFirstTimerStep: firstTimerStep, eventBeforeFirstTimer: beforeFirstTimer,
      eventMicroCount: microCount, eventTimerRan: timer }, report: {
      conclusion: `首个计时器在第 ${firstTimerStep} 步。此前完成 ${beforeFirstTimer} 个微任务。`,
      detail: `本轮跑了 ${microCount} 个微任务。计时器共执行 ${timer} 个。首步是同步脚本。步数只代表执行顺序。回放可查每一步的队列。`,
      explanation: "同步脚本先跑完。然后清空微任务队列。新微任务进队尾。队列清空才开下个任务。计时器也能追加微任务。模型把计时器视为已就绪。",
      suggestion: "只缩短微任务链。看首个计时器提前几步。再关闭计时器的追加动作。",
    } };
  },
});

export const vectorIteratorLab = defineCurriculumLab({
  id: "vector-iterator", domain: "programming", title: "vector 扩容与迭代器失效",
  description: "先保存迭代器，再追加元素。",
  comparison: "按当前容量追加 / 先 reserve",
  topics: ["cpp-iterator-invalidation", "cpp-vector-reserve-resize"],
  input: {
    vectorInitialSize: { kind: "integer", min: 1, max: 12, label: "初始元素数", hint: "1–12 个，保证能保存首元素迭代器。" },
    vectorInitialCapacity: { kind: "integer", min: 1, max: 32, label: "起始容量", hint: "至少能装下现有元素。" },
    vectorReserveCapacity: { kind: "integer", min: 0, max: 32, label: "预留容量", hint: "先 reserve，再保存迭代器。" },
    vectorAppendCount: { kind: "integer", min: 1, max: 12, label: "追加个数", hint: "1–12 次 push_back。" },
  },
  defaults: { goalLabel: "核对追加时哪些旧迭代器还能用", vectorInitialSize: 3,
    vectorInitialCapacity: 3, vectorReserveCapacity: 6, vectorAppendCount: 3 },
  check: ({ vectorInitialSize, vectorInitialCapacity }) => vectorInitialSize <= vectorInitialCapacity,
  columns: ["步骤", "元素数", "当前容量组", "预留容量组", "两组旧 end()"],
  metricLabels: { vectorBaselineReallocations: "当前容量组追加扩容", vectorReservedReallocations: "预留组追加扩容",
    vectorBaselineFirstLoss: "当前组首元素失效步", vectorReservedFirstLoss: "预留组首元素失效步", vectorEndLoss: "两组旧 end() 失效步" },
  focusMetric: "vectorReservedReallocations", alternateTrial: "把预留容量从 6 改为 3。",
  run({ vectorInitialSize, vectorInitialCapacity, vectorReserveCapacity, vectorAppendCount }) {
    const lanes = [vectorInitialCapacity, Math.max(vectorInitialCapacity, vectorReserveCapacity)]
      .map((capacity) => ({ capacity, reallocations: 0, firstLoss: 0 }));
    const steps: [string, number, string, string, string][] = [["保存迭代器", vectorInitialSize,
      `容量 ${lanes[0].capacity} · 首元素有效`, `容量 ${lanes[1].capacity} · 首元素有效`, "有效"]];
    for (let index = 1; index <= vectorAppendCount; index++) {
      const size = vectorInitialSize + index;
      const snapshot = lanes.map((lane) => {
        const prior = lane.capacity;
        if (size > prior) {
          lane.capacity *= 2;
          lane.reallocations++;
          lane.firstLoss ||= index;
        }
        return `容量 ${lane.capacity} · ${prior === lane.capacity ? "原地追加" : "发生扩容"} · 旧首元素${lane.firstLoss ? "失效" : "有效"}`;
      });
      steps.push([`追加 ${index}`, size, snapshot[0], snapshot[1], "失效"]);
    }
    const label = (loss: number) => loss || "仍有效";
    return { steps, metrics: { vectorBaselineReallocations: lanes[0].reallocations, vectorReservedReallocations: lanes[1].reallocations,
      vectorBaselineFirstLoss: label(lanes[0].firstLoss), vectorReservedFirstLoss: label(lanes[1].firstLoss), vectorEndLoss: 1 }, report: {
      conclusion: `当前组追加扩容 ${lanes[0].reallocations} 次。预留组扩容 ${lanes[1].reallocations} 次。`,
      detail: `初始有 ${vectorInitialSize} 个元素。两组各追加 ${vectorAppendCount} 次。最终容量为 ${lanes[0].capacity} 和 ${lanes[1].capacity}。两组旧 end() 均在首步追加后失效。`,
      explanation: "先预留，再保存旧迭代器。容量不够就重分配。旧首元素迭代器随之失效。原地追加只让旧尾失效。模型用倍增示例。扩容计数从追加开始。",
      suggestion: "只降低预留容量。查首元素何时失效。再对照旧 end() 的失效步。",
    } };
  },
});

export const loopClosureLab = defineCurriculumLab({
  id: "loop-closure", domain: "programming", title: "循环闭包与逐轮绑定",
  description: "先建回调，再调用。对照 var 和 let。",
  comparison: "var 共享绑定 / let 逐轮绑定",
  topics: ["js-let-loop-binding", "js-lexical-closure"],
  input: {
    closureCount: { kind: "integer", min: 1, max: 10, label: "回调个数", hint: "1–10 个，从 0 编号" },
    closureCalls: { kind: "list", min: 0, max: 9, minItems: 1, maxItems: 20, label: "调用顺序", hint: "填有效回调编号，可重复" },
  },
  defaults: { goalLabel: "观察循环结束后回调读取的下标", closureCount: 4, closureCalls: [2, 0, 3, 2] },
  check: ({ closureCount, closureCalls }) => closureCalls.every((index) => index < closureCount),
  columns: ["阶段", "回调编号", "var 绑定或返回值", "let 绑定或返回值"],
  metricLabels: { loopVarEnd: "共享绑定最终值", loopVarReturns: "var 返回序列", loopLetReturns: "let 返回序列",
    loopDifferentCalls: "返回不同的调用数" },
  focusMetric: "loopVarEnd", alternateTrial: "回调个数改为 5。保留调用顺序。",
  run({ closureCount, closureCalls }) {
    const shared: (() => number)[] = [];
    const perIteration: (() => number)[] = [];
    for (var index = 0; index < closureCount; index++) shared.push(() => index);
    for (let iteration = 0; iteration < closureCount; iteration++) perIteration.push(() => iteration);
    const varReturns = closureCalls.map((callback) => shared[callback]());
    const letReturns = closureCalls.map((callback) => perIteration[callback]());
    const different = varReturns.filter((value, i) => value !== letReturns[i]).length;
    const steps = [
      ...perIteration.map((_, slot) => ["创建回调", slot, "共享循环变量", `独立绑定 ${slot}`] as const),
      ["循环结束", "—", index, "保留各轮绑定"] as const,
      ...closureCalls.map((slot, i) => [`调用 ${i + 1}`, slot, varReturns[i], letReturns[i]] as const),
    ];
    return { steps, metrics: { loopVarEnd: index, loopVarReturns: sequenceText(varReturns),
      loopLetReturns: sequenceText(letReturns), loopDifferentCalls: different }, report: {
      conclusion: `var 回调都读到 ${index}。let 回调读各自编号。`,
      detail: `每组建了 ${closureCount} 个回调。循环结束后才调用。实际调用 ${closureCalls.length} 次。${different} 次返回值有差异。首个回调编号是 ${closureCalls[0]}。它分别返回 ${varReturns[0]} 和 ${letReturns[0]}。`,
      explanation: "回调读的是变量绑定。var 各轮共用一个绑定。最后一次自增结束循环。let 每轮都有独立绑定。重排调用也不会换绑。",
      suggestion: "保持调用编号。增加循环轮数。对照两组返回值。再把同一回调调用两遍。",
    } };
  },
});

export const raiiCleanupLab = defineCurriculumLab({
  id: "raii-cleanup", domain: "programming", title: "RAII 与异常清理",
  description: "模拟资源申请失败。回放释放顺序。",
  comparison: "尾部手动释放 / 作用域托管",
  topics: ["cpp-raii", "cpp-unique-shared-ownership"],
  input: {
    raiiResourceIds: { kind: "list", min: 1, max: 99, minItems: 1, maxItems: 12, label: "申请资源顺序", hint: "填 1–12 个不重复的资源编号" },
    raiiFailAt: { kind: "integer", min: 0, max: 12, label: "失败的申请序号", hint: "0 表示无异常。否则填从 1 起的序号。" },
  },
  defaults: { goalLabel: "对照手动清理和作用域托管", raiiResourceIds: [10, 20, 30], raiiFailAt: 3 },
  check: ({ raiiResourceIds, raiiFailAt }) =>
    raiiFailAt <= raiiResourceIds.length && new Set(raiiResourceIds).size === raiiResourceIds.length,
  columns: ["步骤", "资源", "尾部手动释放", "作用域托管"],
  metricLabels: { raiiAcquired: "成功申请数", raiiManualLeaks: "手动组遗留数", raiiManagedLeaks: "托管组遗留数",
    raiiManualReleased: "手动释放顺序", raiiManagedReleased: "托管释放顺序" },
  focusMetric: "raiiManualLeaks", alternateTrial: "把失败序号改成 0。走正常退出。",
  run({ raiiResourceIds, raiiFailAt }) {
    const manual: number[] = [];
    const managed: number[] = [];
    const manualRelease: number[] = [];
    const managedRelease: number[] = [];
    const steps: [string, number | string, string, string][] = [];
    for (const [index, resource] of raiiResourceIds.entries()) {
      if (index + 1 === raiiFailAt) {
        steps.push(["申请失败", resource, "转到外层异常处理", "退出作用域"]);
        break;
      }
      manual.push(resource);
      managed.push(resource);
      steps.push(["取得资源", resource, `现持有 ${sequenceText(manual)}`, `现持有 ${sequenceText(managed)}`]);
    }
    const acquired = managed.length;
    steps.push([raiiFailAt ? "异常退出" : "正常退出", "—", raiiFailAt ? "跳过尾部释放" : "执行尾部释放", "按获取逆序清理"]);
    while (managed.length) {
      const resource = managed.pop()!;
      managedRelease.push(resource);
      if (!raiiFailAt) manualRelease.push(manual.pop()!);
      steps.push(["清理", resource, raiiFailAt ? "未释放" : "手动释放", "析构释放"]);
    }
    return { steps, metrics: { raiiAcquired: acquired, raiiManualLeaks: manual.length, raiiManagedLeaks: managed.length,
      raiiManualReleased: sequenceText(manualRelease), raiiManagedReleased: sequenceText(managedRelease) }, report: {
      conclusion: `手动组遗留 ${manual.length} 个资源。托管组遗留 ${managed.length} 个。`,
      detail: `计划执行 ${raiiResourceIds.length} 项申请。实际取得 ${acquired} 个。${raiiFailAt ?
        `第 ${raiiFailAt} 项申请失败。后续申请停下。` : "所有申请成功。"}手动释放顺序是 ${sequenceText(manualRelease)}。托管释放顺序是 ${sequenceText(managedRelease)}。`,
      explanation: "模型对照两种清理写法。手动组只在尾部清理。异常会绕过尾部代码。托管对象在退出时析构。已构造对象按逆序清理。失败的申请未取得资源。",
      suggestion: "先关闭失败点。看两组释放顺序。再让第一项失败。检查是否还有资源可释放。",
    } };
  },
});

export const pythonCopyLab = defineCurriculumLab({
  id: "python-copy", domain: "programming", title: "Python 别名与浅拷贝",
  description: "对照三种赋值法。检查原列表哪些位置会变。",
  topics: ["python-aliasing"],
  input: {
    copyOuterValue: { kind: "integer", min: -99, max: 99, label: "外层数值", hint: "-99–99 的整数" },
    copyInnerItems: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 8, label: "内层列表", hint: "1–8 个整数，每项 -99–99" },
    copyInnerIndex: { kind: "integer", min: 0, max: 7, label: "内层下标", hint: "从 0 开始，需落在列表内" },
    copyNewOuter: { kind: "integer", min: -99, max: 99, label: "外层写入值", hint: "-99–99 的整数" },
    copyNewInner: { kind: "integer", min: -99, max: 99, label: "内层写入值", hint: "-99–99 的整数" },
  },
  defaults: { goalLabel: "对比替换外层和修改内层的影响", copyOuterValue: 7, copyInnerItems: [1, 2, 3],
    copyInnerIndex: 1, copyNewOuter: 9, copyNewInner: 8 },
  check: ({ copyInnerItems, copyInnerIndex }) => copyInnerIndex < copyInnerItems.length,
  columns: ["做法", "操作", "原列表", "工作列表", "同一个外层", "同一个内层"],
  metricLabels: { aliasChangedParts: "别名改动原件", shallowChangedParts: "浅拷贝改动原件", deepChangedParts: "深拷贝改动原件" },
  focusMetric: "shallowChangedParts", alternateTrial: "只把内层写入值改回 2。",
  run({ copyOuterValue, copyInnerItems, copyInnerIndex, copyNewOuter, copyNewInner }) {
    type List = [number, number[]];
    const methods = [
      { name: "别名", copy: (original: List): List => original },
      { name: "浅拷贝", copy: (original: List): List => [...original] },
      { name: "深拷贝", copy: (original: List): List => [original[0], [...original[1]]] },
    ];
    const lanes = methods.map(({ name, copy }) => {
      const original: List = [copyOuterValue, [...copyInnerItems]];
      const working = copy(original);
      const snapshot = (action: string) => [name, action, JSON.stringify(original), JSON.stringify(working),
        original === working ? "是" : "否", original[1] === working[1] ? "是" : "否"] as const;
      const initial = snapshot("建立工作列表");
      working[0] = copyNewOuter;
      const outerWrite = snapshot("替换外层第 0 项");
      working[1][copyInnerIndex] = copyNewInner;
      const innerWrite = snapshot(`修改内层下标 ${copyInnerIndex}`);
      const changed = Number(original[0] !== copyOuterValue) + Number(original[1][copyInnerIndex] !== copyInnerItems[copyInnerIndex]);
      return { steps: [initial, outerWrite, innerWrite], changed, final: JSON.stringify(original) };
    });
    const [alias, shallow, deep] = lanes;
    return { steps: lanes.flatMap((lane) => lane.steps), metrics: { aliasChangedParts: alias.changed,
      shallowChangedParts: shallow.changed, deepChangedParts: deep.changed }, report: {
      conclusion: `别名改动原件 ${alias.changed} 处。浅拷贝改动 ${shallow.changed} 处。深拷贝改动 ${deep.changed} 处。`,
      detail: `三种做法从同一份数据起跑。先写外层 0，再写内层 ${copyInnerIndex}。别名的原件为 ${alias.final}。浅拷贝的原件为 ${shallow.final}。深拷贝的原件为 ${deep.final}。`,
      explanation: "别名共享外层和内层。浅拷贝只共享内层。深拷贝两层都独立。共享引用决定写入的影响。写回原值时，改动数仍为 0。",
      suggestion: "只把内层写回原值。看浅拷贝的改动数。回放仍能查到内层共享。",
    } };
  },
});

export const gcCyclesLab = defineCurriculumLab({
  id: "gc-cycles", domain: "programming", title: "引用计数与环回收",
  description: "追踪对象的引用。对照两种回收结果。",
  comparison: "朴素引用计数 / 标记清扫",
  topics: ["gc-reference-count-cycle-limit", "gc-mark-sweep-cycle"],
  input: {
    gcObjectCount: { kind: "integer", min: 1, max: 12, label: "对象数量", hint: "1–12 个对象，从 0 编号" },
    gcLinks: { kind: "rows", columns: [[0, 11], [0, 11]], minItems: 0, maxItems: 30, label: "引用边", hint: "每行填起点和终点，允许指向自己" },
    gcRootRefs: { kind: "list", min: 0, max: 11, minItems: 0, maxItems: 12, label: "根引用", hint: "填根指向的对象编号，可以留空" },
  },
  defaults: { goalLabel: "找出没有根却留在内存里的对象", gcObjectCount: 5,
    gcLinks: [[0, 1], [1, 0], [1, 2], [3, 4]], gcRootRefs: [3] },
  check({ gcObjectCount, gcLinks, gcRootRefs }) {
    return gcLinks.every((edge) => edge.every((node) => node < gcObjectCount)) &&
      gcRootRefs.every((node) => node < gcObjectCount) &&
      new Set(gcLinks.map((edge) => edge.join(","))).size === gcLinks.length &&
      new Set(gcRootRefs).size === gcRootRefs.length;
  },
  columns: ["策略", "操作", "对象", "计数或标记状态"],
  metricLabels: { rcCollected: "引用计数回收", markCollected: "标记清扫回收", unreachableRetained: "计数滞留的不可达对象", reachableCount: "根可达对象" },
  focusMetric: "unreachableRetained", alternateTrial: "清空根引用，保留原引用边。",
  run({ gcObjectCount, gcLinks, gcRootRefs }) {
    const nodes = Array.from({ length: gcObjectCount }, (_, index) => index);
    const outgoing = nodes.map(() => [] as number[]);
    const refs = nodes.map(() => 0);
    for (const [from, to] of gcLinks) {
      outgoing[from].push(to);
      refs[to]++;
    }
    for (const root of gcRootRefs) refs[root]++;
    const steps: [string, string, number | string, string][] = [["引用计数", "初始计数", "全部", sequenceText(refs)]];
    const collected = nodes.filter((node) => refs[node] === 0);
    for (const node of collected) {
      steps.push(["引用计数", "计数为零，回收", node, sequenceText(refs)]);
      for (const next of outgoing[node]) {
        refs[next]--;
        steps.push(["引用计数", `移除 ${node} 的引用`, next, `剩余 ${refs[next]}`]);
        if (refs[next] === 0) collected.push(next);
      }
    }
    const reachable = new Set(gcRootRefs);
    steps.push(["标记清扫", "从根出发", "根", sequenceText(gcRootRefs)]);
    for (const node of reachable) {
      steps.push(["标记清扫", "标记并扫描引用", node, sequenceText(outgoing[node])]);
      for (const next of outgoing[node]) reachable.add(next);
    }
    const swept = nodes.filter((node) => !reachable.has(node));
    for (const node of swept) steps.push(["标记清扫", "未标记，回收", node, "根不可达"]);
    const kept = swept.filter((node) => !collected.includes(node));
    return { steps, metrics: { rcCollected: collected.length, markCollected: swept.length, unreachableRetained: kept.length,
      reachableCount: reachable.size }, report: {
      conclusion: kept.length ? `引用计数漏收 ${kept.length} 个不可达对象。标记清扫回收了它们。` : "两种方法回收了相同对象。",
      detail: `共有 ${gcObjectCount} 个对象。根可到达 ${reachable.size} 个。计数回收 ${collected.length} 个。标记清扫回收 ${swept.length} 个。计数滞留编号为 ${sequenceText(kept)}。`,
      explanation: "朴素计数从零开始回收。移除引用会触发后续回收。不可达环可能一直有入边。环引用的对象也会滞留。标记从根追踪，只清扫未标记项。",
      suggestion: "先清空根引用。回放零计数如何传播。再断开闭环的一条边，看两法能否一致。",
    } };
  },
});

export const pointerWriteLab = defineCurriculumLab({
  id: "pointer-write", domain: "programming", title: "指针与数组写入",
  description: "观察数组指针加偏移后的目标位置。对照写入前后的数组与别名读值。",
  topics: ["c-pointer-lifetime", "c-pointer-one-past", "c-array-decay-length"],
  input: {
    memoryCells: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 12, label: "数组元素", hint: "1–12 个整数。范围 −99 至 99。" },
    pointerIndex: { kind: "integer", min: 0, max: 11, label: "指针起始下标", hint: "从 0 起。须指向数组现有元素。" },
    pointerOffset: { kind: "integer", min: -12, max: 12, label: "偏移元素数", hint: "−12 至 12 的整数。可试越界。" },
    writeValue: { kind: "integer", min: -99, max: 99, label: "要写入的值", hint: "−99 至 99 的整数。" },
  },
  defaults: { goalLabel: "顺着指针找实际修改的位置。", memoryCells: [8, 12, 19, 23], pointerIndex: 1, pointerOffset: 1, writeValue: 42 },
  check: ({ memoryCells, pointerIndex }) => pointerIndex < memoryCells.length,
  columns: ["动作", "位置", "数值", "数组内容"],
  metricLabels: { pointerTarget: "目标下标", pointerOutcome: "写入结果", changedCells: "值变化的元素数", pointerArray: "写入后的数组", pointerReadback: "别名读回的值" },
  focusMetric: "changedCells",
  alternateTrial: "把目标移到数组末尾之后一格。观察边界。",
  run({ memoryCells, pointerIndex, pointerOffset, writeValue }) {
    const pointerTarget = pointerIndex + pointerOffset;
    const after = [...memoryCells];
    const writable = pointerTarget >= 0 && pointerTarget < memoryCells.length;
    const original = writable ? memoryCells[pointerTarget] : null;
    if (writable) after[pointerTarget] = writeValue;
    const changedCells = writable && original !== writeValue ? 1 : 0;
    const pointerOutcome = writable ? "成功写入" : pointerTarget === memoryCells.length ? "尾后位置停止写入" : "越界停止写入";
    const pointerReadback = writable ? after[pointerTarget] : "未读取";
    return {
      steps: [["取得指针", pointerIndex, memoryCells[pointerIndex], sequenceText(memoryCells)],
        ["计算偏移", pointerTarget, original ?? "无元素", sequenceText(memoryCells)],
        [pointerOutcome, pointerTarget, pointerReadback, sequenceText(after)]],
      metrics: { pointerTarget, pointerOutcome, changedCells, pointerArray: sequenceText(after), pointerReadback },
      report: {
        conclusion: writable ? `写入下标 ${pointerTarget}。数值变化 ${changedCells} 项。` : `${pointerOutcome}。数组保持原值。`,
        detail: `数组有 ${memoryCells.length} 个元素。指针从下标 ${pointerIndex} 出发。偏移 ${pointerOffset} 个元素。` +
          (writable ? `原值为 ${original}。写入后读回 ${pointerReadback}。` : `目标下标为 ${pointerTarget}。本轮未读取目标。`),
        explanation: "此处按元素计算偏移。下标从 0 开始。" + (writable ? "指向同一元素的别名读到新值。" :
          pointerTarget === memoryCells.length ? "尾后指针可当结束标记。那里没有可写元素。" : "模型在越界前拦截。没有写入任何元素。"),
        suggestion: "保留数组和写入值。只改偏移。看哪个位置会变。",
      },
    };
  },
});

export const variableScopeLab = defineCurriculumLab({
  id: "variable-scope", domain: "programming", title: "C/C++ 变量作用域",
  description: "在嵌套代码块中改同名变量。比较声明内层变量和沿用外层变量的结果。",
  comparison: "有无内层同名声明时的代码块赋值",
  topics: ["symbol-table-scope"],
  input: {
    outsideValue: { kind: "integer", min: -99, max: 99, label: "外层初值", hint: "−99 至 99 的整数。" },
    insideValue: { kind: "integer", min: -99, max: 99, label: "内层声明初值", hint: "−99 至 99 的整数。仅声明内层 x 时使用。" },
    reassignedValue: { kind: "integer", min: -99, max: 99, label: "块内赋值", hint: "给可见的 x 赋值。−99 至 99。" },
  },
  defaults: { goalLabel: "确认块内赋值修改了哪一层。", outsideValue: 7, insideValue: 2, reassignedValue: 14 },
  columns: ["代码阶段", "有内层声明时读到 x", "沿用外层时读到 x"],
  metricLabels: { scopedInnerBefore: "内层声明初值", scopedInnerAfter: "块内赋值后读值", scopedOuterWith: "有声明的外层终值", scopedOuterWithout: "无声明的外层终值", scopeResultGap: "两种外层结果之差" },
  focusMetric: "scopeResultGap",
  alternateTrial: "只改内层声明初值。比较离开代码块后的值。",
  run({ outsideValue, insideValue, reassignedValue }) {
    const gap = Math.abs(outsideValue - reassignedValue);
    return {
      steps: [["进入外层", outsideValue, outsideValue], ["进入内层", insideValue, outsideValue],
        ["块内赋值", reassignedValue, reassignedValue], ["离开内层", outsideValue, reassignedValue]],
      metrics: { scopedInnerBefore: insideValue, scopedInnerAfter: reassignedValue, scopedOuterWith: outsideValue,
        scopedOuterWithout: reassignedValue, scopeResultGap: gap },
      report: {
        conclusion: gap ? `退出内层后，两种读值差 ${gap}。` : "退出后读值相同。两种赋值目标不同。",
        detail: `外层 x 从 ${outsideValue} 开始。有声明时内层从 ${insideValue} 开始。块内都赋值为 ${reassignedValue}。` +
          `离开内层后分别读到 ${outsideValue} 和 ${reassignedValue}。`,
        explanation: "查名字时先看当前块。内层同名声明遮住外层。此时赋值只改内层。退出后再读到外层。" +
          "块内未声明时直接改外层。",
        suggestion: "把块内赋值改成外层初值。对比路径和最后读值。",
      },
    };
  },
});

export const shortCircuitLab = defineCurriculumLab({
  id: "short-circuit", domain: "programming", title: "短路求值与空指针保护",
  description: "用同一批输入比较先检查引用和强制读取。模型用记录表示无效读取。",
  comparison: "短路保护与先读右侧的求值流程",
  topics: ["c-short-circuit-guard"],
  input: {
    guardCases: { kind: "rows", columns: [[0, 1], [-99, 99]], minItems: 1, maxItems: 20, label: "输入（引用有效, 值）", hint: "每行 [0 或 1, 值]。0 表示没有对象。值为 −99 至 99。" },
    guardLimit: { kind: "integer", min: -99, max: 99, label: "右侧比较门槛", hint: "有对象时判断值是否严格大于门槛。" },
  },
  defaults: { goalLabel: "观察空引用如何跳过右侧。", guardCases: [[0, 9], [1, 7], [1, -2], [0, 0]], guardLimit: 0 },
  columns: ["样本", "左边条件", "短路右侧", "短路结果", "先读右侧"],
  metricLabels: { guardedReads: "短路流程实际读取次数", guardSkips: "跳过右侧次数", forcedInvalidReads: "先读流程无效读取数", guardsPassed: "短路条件成立数" },
  focusMetric: "forcedInvalidReads",
  alternateTrial: "把一条输入的有效位改为 0。看看右侧。",
  run({ guardCases, guardLimit }) {
    let guardedReads = 0;
    let guardsPassed = 0;
    const steps = guardCases.map(([present, value], i) => {
      if (!present) return [i + 1, "假", "跳过", "假", "无效读取"] as const;
      guardedReads++;
      const comparison = value > guardLimit;
      if (comparison) guardsPassed++;
      return [i + 1, "真", `读取 ${value}`, comparison ? "真" : "假", `读取 ${value}`] as const;
    });
    const skipped = guardCases.length - guardedReads;
    return { steps, metrics: { guardedReads, guardSkips: skipped, forcedInvalidReads: skipped, guardsPassed }, report: {
      conclusion: skipped ? `短路避开 ${skipped} 次无效读取。` : "本轮引用全部有效。每次读取都安全。",
      detail: `共判断 ${guardCases.length} 条。门槛为 ${guardLimit}。检查后读取 ${guardedReads} 次。最终条件成立 ${guardsPassed} 次。`,
      explanation: "逻辑与先判断左边。左边为假就跳过右边。先读右侧会遇到空引用。" +
        `本轮右侧跳过 ${skipped} 次。模型只记录无效读取。`,
      suggestion: "固定门槛。只改一条输入的有效位。比较读取记录。",
    } };
  },
});

export const unsignedWrapLab = defineCurriculumLab({
  id: "unsigned-wrap", domain: "programming", title: "无符号整数回绕",
  description: "每步先算整数和，再写回定宽无符号存储。记录高位溢出和负向回绕。",
  topics: ["c-unsigned-modular-arithmetic", "c-allocation-size-overflow"],
  input: {
    unsignedBits: { kind: "integer", min: 2, max: 16, label: "存储位宽", hint: "2–16 位。每次写回按该位宽取模。" },
    unsignedInitial: { kind: "integer", min: 0, max: 65535, label: "初值", hint: "非负整数。须能放入选择的位宽。" },
    unsignedIncrements: { kind: "list", min: -65535, max: 65535, minItems: 1, maxItems: 20, label: "加值序列", hint: "1–20 个整数。可为负数。范围 −65535 至 65535。" },
  },
  defaults: { goalLabel: "观察写回时的取模回绕。", unsignedBits: 8, unsignedInitial: 250, unsignedIncrements: [10, -7, 20, -35] },
  check: ({ unsignedBits, unsignedInitial }) => unsignedInitial < 2 ** unsignedBits,
  columns: ["旧值", "本步加值", "取模前的和", "写回值", "二进制", "本步状态"],
  metricLabels: { wrappedFinal: "无符号终值", wrapEventCount: "发生回绕的步数", forwardWraps: "超出上界步数", backwardWraps: "低于零步数" },
  focusMetric: "wrapEventCount",
  alternateTrial: "仅增大位宽。观察回绕在哪一步消失。",
  run({ unsignedBits, unsignedInitial, unsignedIncrements }) {
    const modulus = 2 ** unsignedBits;
    let value = unsignedInitial;
    let forwardWraps = 0;
    let backwardWraps = 0;
    const steps = unsignedIncrements.map((delta) => {
      const before = value;
      const sum = before + delta;
      if (sum < 0) backwardWraps++;
      if (sum >= modulus) forwardWraps++;
      value = ((sum % modulus) + modulus) % modulus;
      return [before, delta, sum, value, value.toString(2).padStart(unsignedBits, "0"), sum === value ? "直接写回" : "取模回绕"] as const;
    });
    const wrapEventCount = forwardWraps + backwardWraps;
    return { steps, metrics: { wrappedFinal: value, wrapEventCount, forwardWraps, backwardWraps }, report: {
      conclusion: `终值为 ${value}。回绕 ${wrapEventCount} 步。`,
      detail: `位宽 ${unsignedBits} 位。模数为 ${modulus}。初值 ${unsignedInitial}。共写回 ${steps.length} 次。`,
      explanation: `有效范围为 0 到 ${modulus - 1}。超上界 ${forwardWraps} 步。低于零 ${backwardWraps} 步。` +
        "写回按位宽取模。负数也映射到非负余数。",
      suggestion: "保留初值和加值序列。只增大位宽。再数回绕步数。",
    } };
  },
});
