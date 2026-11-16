import { defineCurriculumLab, sequenceText } from "./curriculumLab";

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
