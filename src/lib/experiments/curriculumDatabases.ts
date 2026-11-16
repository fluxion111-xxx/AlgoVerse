import { defineCurriculumLab, sequenceText } from "./curriculumLab";

export const outerJoinFilterLab = defineCurriculumLab({
  id: "outer-join-filter", domain: "databases", title: "左连接中的 ON 与 WHERE",
  description: "只挪过滤条件。检查哪些左表行消失。",
  comparison: "右表条件放 ON / 放 WHERE",
  topics: ["outer-join-on-where-predicate", "sql-inner-left-join"],
  input: {
    outerJoinKeys: { kind: "list", min: 1, max: 30, minItems: 1, maxItems: 12, label: "左表主键", hint: "填不重复的整数。" },
    outerJoinRight: { kind: "rows", columns: [[1, 30], [0, 1]], minItems: 0, maxItems: 20, label: "右表键与状态", hint: "每行填关联键和状态 0/1。允许一键多行。" },
    outerJoinStatus: { kind: "integer", min: 0, max: 1, label: "要筛出的状态", hint: "比较右侧状态等于 0 或 1。" },
  },
  defaults: { goalLabel: "找出条件移到 WHERE 后失去的左表键", outerJoinKeys: [1, 2, 3], outerJoinRight: [[1, 0], [1, 1], [2, 0]], outerJoinStatus: 1 },
  check: ({ outerJoinKeys }) => new Set(outerJoinKeys).size === outerJoinKeys.length,
  columns: ["左表键", "等键的右状态", "ON 结果", "WHERE 结果", "去留原因"],
  metricLabels: { outerJoinOnRows: "条件放 ON 的行数", outerJoinWhereRows: "条件放 WHERE 的行数",
    outerJoinPadded: "ON 补 NULL 的行数", outerJoinLostKeys: "WHERE 消失的左键数" },
  focusMetric: "outerJoinLostKeys", alternateTrial: "把要筛的状态从 1 改为 0。",
  run({ outerJoinKeys, outerJoinRight, outerJoinStatus }) {
    let onRows = 0;
    let padded = 0;
    let whereRows = 0;
    const steps = outerJoinKeys.map((key) => {
      const matches = outerJoinRight.filter(([right]) => key === right).map(([, status]) => status);
      const qualified = matches.filter((status) => status === outerJoinStatus);
      const on = qualified.length ? qualified : [null];
      const joined = matches.length ? matches : [null];
      const where = joined.filter((status) => status === outerJoinStatus);
      padded += Number(on[0] === null);
      onRows += on.length;
      whereRows += where.length;
      return [key, sequenceText(matches), on.map((value) => value ?? "NULL").join("、"), where.join("、") || "无行",
        where.length ? "右侧状态符合" : "WHERE 过滤该键"] as const;
    });
    return { steps, metrics: { outerJoinOnRows: onRows, outerJoinWhereRows: whereRows, outerJoinPadded: padded, outerJoinLostKeys: padded }, report: {
      conclusion: `ON 保留 ${onRows} 行。WHERE 保留 ${whereRows} 行，少了 ${padded} 个左键。`,
      detail: `左表 ${outerJoinKeys.length} 行。右表 ${outerJoinRight.length} 行。筛选状态 ${outerJoinStatus}。ON 为 ${padded} 行补 NULL。回放可核对每个左键。`,
      explanation: "ON 先决定哪些右行能匹配。没匹配仍保留左行。WHERE 晚于左连接。补出的 NULL 比较结果是未知。只留下为真的行。",
      suggestion: "只换筛选状态。找出依然消失的键。再清空右表重测。",
    } };
  },
});

export const lsmCompactionLab = defineCurriculumLab({
  id: "lsm-compaction", domain: "databases", title: "LSM 压实与删除标记",
  description: "合并版本。查看旧记录会不会复活。",
  comparison: "保留必要墓碑 / 提前丢弃墓碑",
  topics: ["lsm-compaction-tombstones"],
  input: {
    compactBaseRows: { kind: "rows", columns: [[0, 30], [-99, 99]], minItems: 0, maxItems: 14, label: "下层键值", hint: "每行键和值。键不重复。" },
    compactOperations: { kind: "rows", columns: [[0, 1], [0, 30], [-99, 99]], minItems: 1, maxItems: 18, label: "上层操作",
      hint: "每行填类型、键、值。0 写入；1 删除，值填 0。按从旧到新输入。" },
    compactIncludeBase: { kind: "integer", min: 0, max: 1, label: "是否合并全部下层", hint: "0 下层仍在；1 把下层纳入本次压实。" },
  },
  defaults: { goalLabel: "对照仍有旧版本时的删除语义", compactBaseRows: [[1, 10], [2, 20], [3, 30]],
    compactOperations: [[1, 1, 0], [0, 2, 99], [0, 4, 40]], compactIncludeBase: 0 },
  check: ({ compactBaseRows, compactOperations }) => new Set(compactBaseRows.map(([key]) => key)).size === compactBaseRows.length &&
    compactOperations.every(([type, , value]) => type === 0 || value === 0),
  columns: ["键", "下层", "最新操作", "安全读值", "提前丢标记后读值", "安全压实动作"],
  metricLabels: { compactSafeVisible: "安全策略可见键数", compactUnsafeVisible: "丢墓碑策略可见键数",
    compactResurrected: "错误复活键数", compactTombstones: "安全策略保留墓碑数" },
  focusMetric: "compactResurrected", alternateTrial: "只开启合并全部下层。",
  run({ compactBaseRows, compactOperations, compactIncludeBase }) {
    const base = new Map(compactBaseRows.map(([key, value]) => [key, value]));
    const top = new Map<number, number | null>();
    for (const [type, key, value] of compactOperations) top.set(key, type ? null : value);
    const keys = [...new Set([...base.keys(), ...top.keys()])].sort((a, b) => a - b);
    let resurrected = 0;
    let safeVisible = 0;
    let unsafeVisible = 0;
    let tombstones = 0;
    const steps = keys.map((key) => {
      const before = base.get(key);
      const change = top.get(key);
      const safe = change === undefined ? before : change ?? undefined;
      const unsafe = change === null && !compactIncludeBase ? before : safe;
      const preserve = change === null && !compactIncludeBase && before !== undefined;
      tombstones += Number(preserve);
      resurrected += Number(safe === undefined && unsafe !== undefined);
      safeVisible += Number(safe !== undefined);
      unsafeVisible += Number(unsafe !== undefined);
      return [key, before ?? "无", change === null ? "删除" : change ?? "无修改", safe ?? "不存在", unsafe ?? "不存在",
        change === null ? preserve ? "保留墓碑" : "清理删除标记" : change === undefined ? "保留下层值" : "保留最新值"] as const;
    });
    return { steps, metrics: { compactSafeVisible: safeVisible, compactUnsafeVisible: unsafeVisible,
      compactResurrected: resurrected, compactTombstones: tombstones }, report: {
      conclusion: `提前丢墓碑让 ${resurrected} 个键复活。安全组留 ${tombstones} 个墓碑。`,
      detail: `下层有 ${base.size} 个键。上层做了 ${compactOperations.length} 次操作。安全组可见 ${safeVisible} 个键。对照组可见 ${unsafeVisible} 个。回放按键核对旧值。`,
      explanation: "写入只看同键最新操作。墓碑挡住更旧的值。下层仍有旧值时要保留。全层压实可一起去掉旧值。模型只有两层，无活跃快照。",
      suggestion: "只开启全层压实。核对复活计数。再追加同键写入，检查谁可见。",
    } };
  },
});

export const consistentRingLab = defineCurriculumLab({
  id: "consistent-ring", domain: "databases", title: "一致性哈希与迁移",
  description: "增加一个节点。逐键核对归属。",
  comparison: "节点数取模 / 顺时针哈希环",
  topics: ["consistent-hash-ring-remap"],
  input: {
    ringNodeSlots: { kind: "list", min: 0, max: 99, minItems: 2, maxItems: 8, label: "现有节点位置", hint: "在 0–99 的环上填不重复位置。取模组用输入顺序。" },
    ringAddedSlot: { kind: "integer", min: 0, max: 99, label: "新增节点位置", hint: "不可与现有节点重合。" },
    ringKeySlots: { kind: "list", min: 0, max: 99, minItems: 1, maxItems: 24, label: "各键哈希位置", hint: "每个位置代表一个键。多个键可同位置。" },
  },
  defaults: { goalLabel: "比较新增节点后两种分配方式的迁移数", ringNodeSlots: [20, 60, 90], ringAddedSlot: 40, ringKeySlots: [5, 20, 25, 40, 50, 60, 75, 90, 95] },
  check: ({ ringNodeSlots, ringAddedSlot }) => new Set(ringNodeSlots).size === ringNodeSlots.length && !ringNodeSlots.includes(ringAddedSlot),
  columns: ["键位置", "取模旧→新", "哈希环旧→新", "取模迁移", "哈希环迁移"],
  metricLabels: { ringModuloMoved: "取模迁移数", ringConsistentMoved: "哈希环迁移数",
    ringMovedToAdded: "哈希环迁到新节点数", ringKeyCount: "统计的键数" },
  focusMetric: "ringConsistentMoved", alternateTrial: "把新增节点位置从 40 改为 80。",
  run({ ringNodeSlots, ringAddedSlot, ringKeySlots }) {
    const expanded = [...ringNodeSlots, ringAddedSlot];
    const before = [...ringNodeSlots].sort((a, b) => a - b);
    const after = [...expanded].sort((a, b) => a - b);
    const owner = (nodes: number[], key: number) => nodes.find((node) => node >= key) ?? nodes[0];
    let modulo = 0;
    let ring = 0;
    let adopted = 0;
    const steps = ringKeySlots.map((key) => {
      const oldModulo = ringNodeSlots[key % ringNodeSlots.length];
      const newModulo = expanded[key % expanded.length];
      const oldOwner = owner(before, key);
      const newOwner = owner(after, key);
      modulo += Number(oldModulo !== newModulo);
      ring += Number(oldOwner !== newOwner);
      adopted += Number(newOwner === ringAddedSlot);
      return [key, `${oldModulo}→${newModulo}`, `${oldOwner}→${newOwner}`, oldModulo === newModulo ? "否" : "是",
        oldOwner === newOwner ? "否" : "是"] as const;
    });
    return { steps, metrics: { ringModuloMoved: modulo, ringConsistentMoved: ring, ringMovedToAdded: adopted, ringKeyCount: steps.length }, report: {
      conclusion: `取模迁移 ${modulo} 个键。哈希环迁移 ${ring} 个键。`,
      detail: `节点从 ${before.length} 增至 ${after.length}。新增位置为 ${ringAddedSlot}。核对 ${steps.length} 个键。哈希环有 ${adopted} 个键迁往新节点。回放给出具体归属。`,
      explanation: "环上顺时针找首个节点。超过末尾就回到开头。加节点只截走相邻区段。取模则改变全体的除数。模型每个节点只放一个位置。",
      suggestion: "只改新节点位置。看迁移落在哪段。再试把新节点放到环的两端。",
    } };
  },
});

export const coveringIndexLab = defineCurriculumLab({
  id: "covering-index", domain: "databases", title: "覆盖索引与回表读取",
  description: "查同一范围。测哪些记录仍要回表。",
  comparison: "普通索引 / 含所需列的覆盖索引",
  topics: ["postgres-covering-index", "explain-index-only-heap-fetches"],
  input: {
    coveringRows: { kind: "rows", columns: [[0, 30], [0, 8], [-99, 99]], minItems: 1, maxItems: 18, label: "键、所在页和结果值", hint: "每行为一条索引记录。键可重复。" },
    coveringVisiblePages: { kind: "list", min: 0, max: 8, minItems: 0, maxItems: 9, label: "全可见页号", hint: "填已在可见性映射中标记的页。" },
    coveringMinimum: { kind: "integer", min: 0, max: 30, label: "键的查询下界", hint: "找大于等于此值的键。" },
  },
  defaults: { goalLabel: "对照索引含值后仍需访问堆的原因", coveringRows: [[2, 0, 20], [5, 0, 50], [7, 1, 70], [8, 2, 80]],
    coveringVisiblePages: [0, 2], coveringMinimum: 5 },
  columns: ["键", "页号", "是否全可见", "普通索引", "覆盖索引", "输出值"],
  metricLabels: { coveringMatches: "命中的记录", coveringPlainFetches: "普通索引回表条数", coveringIndexFetches: "覆盖索引回表条数",
    coveringSavedFetches: "少回表的记录数", coveringValues: "输出值序列" },
  focusMetric: "coveringIndexFetches", alternateTrial: "把页 1 加入全可见页。",
  run({ coveringRows, coveringVisiblePages, coveringMinimum }) {
    const visible = new Set(coveringVisiblePages);
    const matching = coveringRows.filter(([key]) => key >= coveringMinimum).sort((a, b) => a[0] - b[0]);
    let heap = 0;
    const steps = matching.map(([key, page, value]) => {
      const skip = visible.has(page);
      heap += Number(!skip);
      return [key, page, skip ? "是" : "否", "回表取值", skip ? "直接从索引取" : "回表查可见", value] as const;
    });
    const saved = matching.length - heap;
    const values = sequenceText(matching.map(([, , value]) => value));
    return { steps: steps.length ? steps : [["无匹配", "—", "—", "—", "—", "—"]],
      metrics: { coveringMatches: matching.length, coveringPlainFetches: matching.length, coveringIndexFetches: heap, coveringSavedFetches: saved,
        coveringValues: values }, report: {
      conclusion: `命中 ${matching.length} 条记录。覆盖索引仍回表 ${heap} 条。`,
      detail: `下界为 ${coveringMinimum}。全可见页有 ${visible.size} 个。普通索引回表 ${matching.length} 条。覆盖索引少回表 ${saved} 条。两组输出值为 ${values}。`,
      explanation: "普通索引不包含结果列。覆盖索引有值可取。页全可见时可跳过堆。否则仍要查版本。本轮按记录计访问，忽略缓存。",
      suggestion: "只把一个页标成全可见。核对回表数和输出。再提高查询下界。",
    } };
  },
});

export const bufferPoolLab = defineCurriculumLab({
  id: "buffer-pool", domain: "databases", title: "缓冲池的固定页与脏页",
  description: "固定、修改、释放。看谁能被换出。",
  topics: ["buffer-pool-pin-dirty", "buffer-pool-pages"],
  input: {
    bufferPageValues: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 8, label: "磁盘各页初值", hint: "填 1–8 个数。从第 0 页起。" },
    bufferFrameLimit: { kind: "integer", min: 1, max: 6, label: "缓冲槽数", hint: "1–6 个槽。初始为空。" },
    bufferPageOps: { kind: "rows", columns: [[0, 2], [0, 7], [-99, 99]], minItems: 1, maxItems: 24, label: "页操作",
      hint: "每行填操作、页号、值。0 固定并读取、1 解固定、2 修改固定页。非修改的值填 0。" },
  },
  defaults: { goalLabel: "验证固定页阻塞和脏页换出前的写盘", bufferPageValues: [10, 20, 30], bufferFrameLimit: 2,
    bufferPageOps: [[0, 0, 0], [2, 0, 99], [0, 1, 0], [0, 2, 0], [1, 0, 0], [0, 2, 0], [1, 1, 0], [0, 0, 0]] },
  check: ({ bufferPageValues, bufferPageOps }) => bufferPageOps.every(([op, page, value]) =>
    page < bufferPageValues.length && (op === 2 || value === 0)),
  columns: ["动作", "页号", "结果", "缓冲槽状态", "磁盘各页"],
  metricLabels: { bufferDiskReads: "磁盘读入次数", bufferDirtyWrites: "换出前写盘次数", bufferAllPinned: "全固定导致的失败",
    bufferEvictions: "换出页数", bufferPendingDirty: "末尾未刷脏页数", bufferDiskResult: "磁盘页值" },
  focusMetric: "bufferAllPinned", alternateTrial: "只把缓冲槽数改为 3。",
  run({ bufferPageValues, bufferFrameLimit, bufferPageOps }) {
    const disk = [...bufferPageValues];
    const pool = new Map<number, { pins: number; value: number; dirty: boolean; last: number }>();
    let reads = 0;
    let writes = 0;
    let blocked = 0;
    let evictions = 0;
    const snapshot = () => [...pool].map(([page, frame]) => `${page}:${frame.value} / 固定 ${frame.pins}${frame.dirty ? " / 脏" : ""}`).join(" · ") || "空";
    const steps = bufferPageOps.map(([op, page, value], index) => {
      let frame = pool.get(page);
      let result: string;
      if (op === 0) {
        const hit = frame !== undefined;
        let eviction = "";
        if (!frame && pool.size === bufferFrameLimit) {
          const victim = [...pool].filter(([, entry]) => entry.pins === 0).sort((a, b) => a[1].last - b[1].last)[0];
          if (!victim) {
            blocked++;
            return ["固定并读取", page, "全部固定 · 无法装入", snapshot(), sequenceText(disk)] as const;
          }
          const [removedPage, removed] = victim;
          if (removed.dirty) {
            disk[removedPage] = removed.value;
            writes++;
          }
          pool.delete(removedPage);
          evictions++;
          eviction = `${removed.dirty ? "先写盘再" : ""}换出 ${removedPage} · `;
        }
        if (!frame) {
          frame = { pins: 0, value: disk[page], dirty: false, last: index };
          pool.set(page, frame);
          reads++;
        }
        frame.pins++;
        frame.last = index;
        result = `${eviction}${hit ? "命中" : "读盘"} · 值 ${frame.value}`;
      } else if (!frame?.pins) {
        result = "没有固定该页";
      } else if (op === 1) {
        frame.pins--;
        result = `剩余固定 ${frame.pins} 次`;
      } else {
        frame.value = value;
        frame.dirty = true;
        frame.last = index;
        result = `更新为 ${value} · 标脏`;
      }
      return [["固定并读取", "解固定", "修改"][op], page, result, snapshot(), sequenceText(disk)] as const;
    });
    const dirty = [...pool.values()].filter((frame) => frame.dirty).length;
    return { steps, metrics: { bufferDiskReads: reads, bufferDirtyWrites: writes, bufferAllPinned: blocked,
      bufferEvictions: evictions, bufferPendingDirty: dirty, bufferDiskResult: sequenceText(disk) }, report: {
      conclusion: `全固定导致 ${blocked} 次失败。换出前写盘 ${writes} 次。`,
      detail: `本轮有 ${bufferFrameLimit} 个槽。磁盘读入 ${reads} 次。共换出 ${evictions} 页。结束仍有 ${dirty} 个脏页。磁盘页值为 ${sequenceText(disk)}。`,
      explanation: "固定数大于零就不能换出。只在可换页中找最久未读写的页。修改先留在缓冲池。换出脏页前须写盘。结束时不额外刷盘。",
      suggestion: "只加一个缓冲槽。核对失败和写盘数。再把解固定提前，观察可换页。",
    } };
  },
});

export const mvccVersionsLab = defineCurriculumLab({
  id: "mvcc-versions", domain: "databases", title: "MVCC 快照与版本回收",
  description: "让两个快照并存。再比较读值和回收。",
  comparison: "固定快照读取 / 当前已提交值",
  topics: ["mvcc-row-versions"],
  input: {
    mvccSeedValue: { kind: "integer", min: -99, max: 99, label: "行的初始值", hint: "填写 -99–99 的整数，版本从 0 起。" },
    mvccTrace: { kind: "rows", columns: [[0, 4], [-99, 99]], minItems: 1, maxItems: 24, label: "快照操作",
      hint: "0 开快照、2 读取、3 关闭，第二列填会话 0–3。1 提交，第二列填新值。4 回收，第二列填 0。" },
  },
  defaults: { goalLabel: "查看旧快照如何留下历史行版本", mvccSeedValue: 10,
    mvccTrace: [[0, 0], [1, 20], [0, 1], [1, 30], [2, 0], [2, 1], [4, 0], [3, 0], [4, 0], [3, 1], [4, 0]] },
  check: ({ mvccTrace }) => mvccTrace.every(([op, arg]) => op === 1 || (op === 4 ? arg === 0 : arg >= 0 && arg <= 3)),
  columns: ["动作", "结果", "活跃快照", "保留版本", "当前已提交值"],
  metricLabels: { mvccHistoricalReads: "读取历史版本次数", mvccReclaimed: "回收版本数", mvccRetained: "结束保留版本数",
    mvccLatestValue: "当前已提交值", mvccPeak: "版本链峰值长度" },
  focusMetric: "mvccRetained", alternateTrial: "只删掉最后一个回收操作。",
  run({ mvccSeedValue, mvccTrace }) {
    let versions = [{ stamp: 0, value: mvccSeedValue }];
    const sessions = new Map<number, number>();
    let historical = 0;
    let reclaimed = 0;
    let peak = versions.length;
    const visible = (stamp: number) => versions.findLast((row) => row.stamp <= stamp)!;
    const steps = mvccTrace.map(([op, argument]) => {
      const latest = versions.at(-1)!;
      let result: string;
      if (op === 0) {
        result = "已有活跃快照";
        if (!sessions.has(argument)) {
          sessions.set(argument, latest.stamp);
          result = `会话 ${argument} 固定在 v${latest.stamp}`;
        }
      } else if (op === 1) {
        const stamp = latest.stamp + 1;
        versions.push({ stamp, value: argument });
        peak = Math.max(peak, versions.length);
        result = `提交 v${stamp} · 值 ${argument}`;
      } else if (op === 2) {
        const stamp = sessions.get(argument);
        result = `会话 ${argument} 未打开`;
        if (stamp !== undefined) {
          const row = visible(stamp);
          historical += Number(row !== latest);
          result = `会话 ${argument} 读 v${row.stamp} · 值 ${row.value}`;
        }
      } else if (op === 3) {
        result = sessions.delete(argument) ? `会话 ${argument} 关闭` : `会话 ${argument} 未打开`;
      } else {
        const kept = new Set([latest, ...[...sessions.values()].map(visible)]);
        const removed = versions.filter((row) => !kept.has(row));
        versions = versions.filter((row) => kept.has(row));
        reclaimed += removed.length;
        result = removed.length ? `移走 ${removed.map(({ stamp }) => `v${stamp}`).join("、")}` : "无可回收版本";
      }
      return [["开快照", "提交", "快照读取", "关快照", "回收"][op], result,
        [...sessions].map(([id, stamp]) => `${id}→v${stamp}`).join("、") || "空",
        versions.map(({ stamp, value }) => `v${stamp}=${value}`).join("、"), versions.at(-1)!.value] as const;
    });
    const latest = versions.at(-1)!.value;
    return { steps, metrics: { mvccHistoricalReads: historical, mvccReclaimed: reclaimed, mvccRetained: versions.length,
      mvccLatestValue: latest, mvccPeak: peak }, report: {
      conclusion: `历史版本被读 ${historical} 次。回收 ${reclaimed} 个版本。`,
      detail: `版本链最多有 ${peak} 项。结束保留 ${versions.length} 项。仍打开 ${sessions.size} 个快照。最新值是 ${latest}。回放能查每个会话读到的版本。`,
      explanation: "开快照时记住当前提交号。随后读取固定版本。提交会追加新版本。模型回收无人可见的旧版。最新版本始终保留。",
      suggestion: "去掉最后一次回收。对照结束版本数。再把旧会话提前关闭。",
    } };
  },
});

export const notInNullLab = defineCurriculumLab({
  id: "not-in-null", domain: "databases", title: "NOT IN 遇到 NULL",
  description: "对照两种排除查询。查看哪些行留下。",
  comparison: "NOT IN / 等值 NOT EXISTS",
  topics: ["sql-not-in-null", "sql-exists"],
  input: {
    exclusionOuter: { kind: "text", maxLength: 240, label: "外表键值", hint: "1–24 个值。用逗号分隔整数或 NULL。" },
    exclusionInner: { kind: "text", maxLength: 240, label: "内表键值", hint: "同外表。单独填 - 表示空表。" },
  },
  defaults: { goalLabel: "用同一批键核对空值对两种查询的影响", exclusionOuter: "1, 2, 3, 4", exclusionInner: "2, NULL" },
  check: ({ exclusionOuter, exclusionInner }) => readNullableNumbers(exclusionOuter) !== null &&
    (exclusionInner.trim() === "-" || readNullableNumbers(exclusionInner) !== null),
  columns: ["外表行", "键", "等值匹配行数", "NOT IN", "NOT EXISTS"],
  metricLabels: { notInKept: "NOT IN 保留行", notExistsKept: "NOT EXISTS 保留行", notInUnknown: "NOT IN 未知行",
    exclusionDelta: "两种查询保留差", subqueryNullCount: "内表 NULL 行数" },
  focusMetric: "notInKept", alternateTrial: "内表只保留 2。去掉 NULL。",
  run({ exclusionOuter, exclusionInner }) {
    const outer = readNullableNumbers(exclusionOuter)!;
    const inner = exclusionInner.trim() === "-" ? [] : readNullableNumbers(exclusionInner)!;
    const nulls = inner.filter((value) => value === null).length;
    let inKept = 0;
    let existsKept = 0;
    let unknown = 0;
    const steps = outer.map((value, index) => {
      const matches = inner.filter((other) => value !== null && other === value).length;
      const uncertain = !matches && inner.length > 0 && (value === null || nulls > 0);
      if (uncertain) unknown++;
      if (!matches && !uncertain) inKept++;
      if (!matches) existsKept++;
      return [index + 1, value ?? "NULL", matches, matches ? "假 · 筛掉" : uncertain ? "未知 · 筛掉" : "真 · 保留",
        matches ? "假 · 筛掉" : "真 · 保留"] as const;
    });
    return { steps, metrics: { notInKept: inKept, notExistsKept: existsKept, notInUnknown: unknown,
      exclusionDelta: existsKept - inKept, subqueryNullCount: nulls }, report: {
      conclusion: `NOT IN 留 ${inKept} 行。NOT EXISTS 留 ${existsKept} 行。`,
      detail: `外表有 ${outer.length} 行。内表有 ${inner.length} 行。内表含 ${nulls} 个 NULL。NOT IN 有 ${unknown} 行未知。回放逐行展示真假和去留。`,
      explanation: "能等值匹配时，两边都筛掉。遇到 NULL，比等号得未知。NOT IN 需确认全都不相等。等值 NOT EXISTS 只找真匹配。WHERE 只留真。内表为空时两边都为真。",
      suggestion: "先去掉内表的 NULL。再改为空表。外表也可放一个 NULL 复核。",
    } };
  },
});

export const walCheckpointLab = defineCurriculumLab({
  id: "wal-checkpoint", domain: "databases", title: "预写日志与检查点重做",
  description: "模拟断电。对照两条恢复路径。",
  comparison: "从初始页重做 / 从检查点重做",
  topics: ["write-ahead-logging", "checkpoint-redo-start"],
  input: {
    walInitialPages: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 8, label: "初始磁盘页值", hint: "1–8 个整数，从第 0 页编号。" },
    walUpdates: { kind: "rows", columns: [[0, 7], [-99, 99]], minItems: 1, maxItems: 20, label: "页号、更新值",
      hint: "每行是一次独立写入。先从前往后写日志。" },
    walDurableCount: { kind: "integer", min: 0, max: 20, label: "断电前已持久日志数", hint: "前 N 条日志持久并确认提交，其余尚未落盘。" },
    walCheckpointCount: { kind: "integer", min: 0, max: 20, label: "检查点覆盖日志数", hint: "前 N 条已刷页。不能超过持久日志数。" },
  },
  defaults: { goalLabel: "核对重做范围和最终恢复值", walInitialPages: [0, 0, 0], walUpdates: [[0, 10], [1, 20], [0, 12], [2, 30], [1, 25]],
    walDurableCount: 4, walCheckpointCount: 2 },
  check: ({ walInitialPages, walUpdates, walDurableCount, walCheckpointCount }) =>
    walCheckpointCount <= walDurableCount && walDurableCount <= walUpdates.length && walUpdates.every(([page]) => page < walInitialPages.length),
  columns: ["阶段", "日志号", "事件", "无检查点页值", "有检查点页值"],
  metricLabels: { walScannedAll: "无检查点重做条数", walScannedTail: "有检查点重做条数", walLostPending: "丢失的未确认记录",
    walRecoveredPages: "恢复后的页值", walRedoSaved: "少重做条数" },
  focusMetric: "walScannedTail", alternateTrial: "把检查点覆盖数从 2 改为 3。",
  run({ walInitialPages, walUpdates, walDurableCount, walCheckpointCount }) {
    const plain = [...walInitialPages];
    const checkpoint = [...walInitialPages];
    const steps: [string, number | string, string, string, string][] = [];
    const record = (stage: string, index: number | string, event: string) =>
      steps.push([stage, index, event, sequenceText(plain), sequenceText(checkpoint)]);
    record("初始", "—", "两组从相同磁盘页起跑");
    for (const [index, [page, value]] of walUpdates.entries()) {
      const number = index + 1;
      record("写日志", number, `页 ${page}→${value} · ${number <= walDurableCount ? "日志持久，确认提交" : "暂在内存"}`);
      if (number === walCheckpointCount) {
        for (const [checkpointPage, savedValue] of walUpdates.slice(0, number)) checkpoint[checkpointPage] = savedValue;
        record("检查点", number, "持久日志覆盖的页刷盘");
      }
    }
    const lost = walUpdates.length - walDurableCount;
    record("断电", "—", `丢弃 ${lost} 条未持久日志`);
    for (let index = 0; index < walDurableCount; index++) {
      const [page, value] = walUpdates[index];
      plain[page] = value;
      if (index >= walCheckpointCount) checkpoint[page] = value;
      record("恢复", index + 1, `页 ${page}→${value} · ${index < walCheckpointCount ? "检查点组跳过" : "两组重做"}`);
    }
    const remaining = walDurableCount - walCheckpointCount;
    return { steps, metrics: { walScannedAll: walDurableCount, walScannedTail: remaining, walLostPending: lost,
      walRecoveredPages: sequenceText(checkpoint), walRedoSaved: walCheckpointCount }, report: {
      conclusion: `检查点让重做少 ${walCheckpointCount} 条。两组恢复页值一致。`,
      detail: `持久日志有 ${walDurableCount} 条。检查点覆盖 ${walCheckpointCount} 条。从头重做 ${walDurableCount} 条。从检查点后重做 ${remaining} 条。断电丢失 ${lost} 条未确认更新。最终页值为 ${sequenceText(checkpoint)}。`,
      explanation: "日志先持久才确认提交。检查点刷出已提交页。恢复只读持久日志。重做写入日志里的新值。模型每条各自提交。未提交页不会刷出。",
      suggestion: "只推进检查点。观察重做量和最终值。再调持久日志数，比较断电损失。",
    } };
  },
});

export const sqlUnionLab = defineCurriculumLab({
  id: "sql-union", domain: "databases", title: "UNION 与重复行",
  description: "合并两张表。逐行查看去重依据。",
  comparison: "UNION / UNION ALL",
  topics: ["sql-union-all-duplicates"],
  input: {
    unionLeftRows: { kind: "rows", columns: [[0, 99], [-99, 99]], minItems: 0, maxItems: 16, label: "左表编号、金额",
      hint: "每行两列。编号 0–99，金额 -99–99。" },
    unionRightRows: { kind: "rows", columns: [[0, 99], [-99, 99]], minItems: 0, maxItems: 16, label: "右表编号、金额",
      hint: "列顺序和左表相同。允许重复行。" },
  },
  defaults: { goalLabel: "验证去重检查的是整行", unionLeftRows: [[1, 10], [1, 10], [2, 20]], unionRightRows: [[1, 10], [1, 15], [3, 30]] },
  columns: ["来源", "编号", "金额", "UNION", "UNION ALL"],
  metricLabels: { unionUniqueCount: "UNION 行数", unionAllCount: "UNION ALL 行数", unionDeduplicated: "去掉的行数",
    unionSharedRows: "两表共有的不同整行数" },
  focusMetric: "unionDeduplicated", alternateTrial: "把右表的 1、10 改成 1、12。",
  run({ unionLeftRows, unionRightRows }) {
    const rowKey = (row: number[]) => row.join(",");
    const leftKeys = new Set(unionLeftRows.map(rowKey));
    const rightKeys = new Set(unionRightRows.map(rowKey));
    const seen = new Set<string>();
    const unionSharedRows = [...rightKeys].filter((row) => leftKeys.has(row)).length;
    const steps = [
      ...unionLeftRows.map((row) => ({ source: "左表", row })),
      ...unionRightRows.map((row) => ({ source: "右表", row })),
    ].map(({ source, row }) => {
      const key = rowKey(row);
      const repeat = seen.has(key);
      seen.add(key);
      return [source, row[0], row[1], repeat ? "整行重复，跳过" : "首次出现，加入", "加入"] as const;
    });
    const removed = steps.length - seen.size;
    return { steps: steps.length ? steps : [["两表为空", "—", "—", "无行", "无行"]],
      metrics: { unionUniqueCount: seen.size, unionAllCount: steps.length, unionDeduplicated: removed, unionSharedRows }, report: {
        conclusion: `UNION 保留 ${seen.size} 行。UNION ALL 保留 ${steps.length} 行。`,
        detail: `左表有 ${unionLeftRows.length} 行。右表有 ${unionRightRows.length} 行。两表共有 ${unionSharedRows} 种整行。UNION 共去掉 ${removed} 行。回放标出每次跳过。`,
        explanation: "去重会检查整行。编号和金额都相同才合并。重复可能来自同一张表。ALL 保留每一次出现。模型按来源回放。查询顺序需用 ORDER BY。",
        suggestion: "只改重复行的金额。保留原编号。检查去重行数如何变化。",
      } };
  },
});

function attributeMask(attributes: string) {
  let mask = 0;
  for (const attribute of attributes) mask |= 1 << (attribute.charCodeAt(0) - 65);
  return mask;
}

function attributeNames(mask: number, count: number) {
  return Array.from({ length: count }, (_, bit) => (mask & (1 << bit)) ? String.fromCharCode(65 + bit) : "").join("") || "∅";
}

function parseDependencies(text: string, count: number) {
  const rules = text.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!rules.length || rules.length > 20) return null;
  const full = (1 << count) - 1;
  const parsed: [number, number][] = [];
  for (const rule of rules) {
    const match = /^([A-H]+)\s*->\s*([A-H]+)$/.exec(rule);
    if (!match) return null;
    const from = attributeMask(match[1]);
    const to = attributeMask(match[2]);
    if ((from | to) & ~full) return null;
    parsed.push([from, to]);
  }
  return parsed;
}

export const candidateKeyLab = defineCurriculumLab({
  id: "candidate-keys", domain: "databases", title: "属性闭包与候选键",
  description: "逐条应用函数依赖。找最小超键。",
  topics: ["candidate-key-attribute-closure", "functional-dependency"],
  input: {
    closureAttributeCount: { kind: "integer", min: 1, max: 8, label: "属性数量", hint: "1–8 个，从 A 顺次取字母。" },
    closureSeed: { kind: "text", maxLength: 8, label: "起始属性", hint: "例 AD。用 - 表示空集。" },
    closureRules: { kind: "text", maxLength: 480, multiline: true, label: "函数依赖", hint: "每行一条，例 AB->C。用大写字母。" },
  },
  defaults: { goalLabel: "验证能覆盖全表的最小属性组合", closureAttributeCount: 4, closureSeed: "A", closureRules: "A->B\nB->C\nCD->A" },
  check: ({ closureAttributeCount, closureSeed, closureRules }) => {
    const seed = closureSeed.trim();
    return (seed === "-" || (/^[A-H]+$/.test(seed) && attributeMask(seed) < (1 << closureAttributeCount))) &&
      parseDependencies(closureRules, closureAttributeCount) !== null;
  },
  columns: ["阶段", "输入或依赖", "新增属性", "得到的闭包"],
  metricLabels: { closureSize: "闭包属性数", closureMembers: "闭包属性", closureSeedType: "起始集类型",
    closureKeyCount: "候选键数", closureKeyNames: "候选键清单" },
  focusMetric: "closureSize", alternateTrial: "起始属性改为 AD。依赖保持原样。",
  run({ closureAttributeCount, closureSeed, closureRules }) {
    const full = (1 << closureAttributeCount) - 1;
    const seed = closureSeed.trim() === "-" ? 0 : attributeMask(closureSeed.trim());
    const rules = parseDependencies(closureRules, closureAttributeCount)!;
    const display = (mask: number) => attributeNames(mask, closureAttributeCount);
    const steps: [string, string, string, string][] = [["起始", display(seed), "—", display(seed)]];
    const close = (start: number, trace = false) => {
      let closure = start;
      for (;;) {
        const previous = closure;
        for (const [from, to] of rules) {
          const added = to & ~closure;
          if (!added || (closure & from) !== from) continue;
          closure |= added;
          if (trace) steps.push(["应用依赖", `${display(from)}→${display(to)}`, display(added), display(closure)]);
        }
        if (closure === previous) return closure;
      }
    };
    const closure = close(seed, true);
    const candidates: number[] = [];
    let skipped = 0;
    for (let set = 0; set <= full; set++) {
      // Every proper subset has a smaller bitmask.
      if (candidates.some((key) => (set & key) === key)) { skipped++; continue; }
      if (close(set) !== full) continue;
      candidates.push(set);
      steps.push(["找到候选键", display(set), "—", display(full)]);
    }
    const seedType = candidates.includes(seed) ? "候选键" : closure === full ? "超键" : "未覆盖全表";
    const keyNames = candidates.map(display).join("、");
    const members = display(closure);
    const size = closure ? members.length : 0;
    return { steps, metrics: { closureSize: size, closureMembers: members, closureSeedType: seedType,
      closureKeyCount: candidates.length, closureKeyNames: keyNames }, report: {
      conclusion: `${display(seed)}${closure !== full ? "推不出全表" : `是${seedType}`}。共找到 ${candidates.length} 个候选键。`,
      detail: `全表有 ${closureAttributeCount} 个属性。起始属性为 ${display(seed)}。闭包是 ${members}，共 ${size} 项。候选键为 ${keyNames}。跳过 ${skipped} 个含已知键的组合。`,
      explanation: "先把起始属性放入闭包。凑齐依赖左侧，就加入右侧。反复检查直到无法扩展。覆盖全表就是超键。删任一项就失效才是候选键。",
      suggestion: "先往起始集补一个属性。再删掉新增的属性。观察闭包与键类型如何改变。",
    } };
  },
});

export const sqlWindowFrameLab = defineCurriculumLab({
  id: "sql-window-frame", domain: "databases", title: "SQL 窗口帧累计",
  description: "遇到并列时间点，累计值怎么算？",
  comparison: "ROWS 逐行累计 / RANGE 含并列项",
  topics: ["sql-running-total-rows-frame", "sql-window-partitions"],
  input: {
    windowRows: { kind: "rows", columns: [[1, 9], [0, 99], [-99, 99]], minItems: 1, maxItems: 24,
      label: "分组、时间、金额", hint: "每行填组号 1–9、时间 0–99、金额 -99–99" },
  },
  defaults: { goalLabel: "对比并列时间点下的两种累计值", windowRows: [[1, 1, 10], [1, 1, 20], [1, 2, 5], [2, 1, 8], [2, 1, 2]] },
  columns: ["原行号", "分组", "时间", "金额", "ROWS 累计", "RANGE 累计", "差值"],
  metricLabels: { windowGroups: "分区数", differingRows: "累计值不同的行", maxFrameGap: "最大绝对差" },
  focusMetric: "differingRows", alternateTrial: "让同组各行的时间互不相同。",
  run({ windowRows }) {
    const rows = windowRows.map(([group, clock, amount], index) => ({ group, clock, amount, number: index + 1 }));
    rows.sort((a, b) => a.group - b.group || a.clock - b.clock || a.number - b.number);
    let differingRows = 0;
    let maxFrameGap = 0;
    const groupTotals = new Map<number, number>();
    const steps = rows.map((row) => {
      const rowTotal = (groupTotals.get(row.group) ?? 0) + row.amount;
      groupTotals.set(row.group, rowTotal);
      const rangeTotal = rows.reduce((sum, item) => item.group === row.group && item.clock <= row.clock ? sum + item.amount : sum, 0);
      const gap = rangeTotal - rowTotal;
      if (gap !== 0) differingRows++;
      maxFrameGap = Math.max(maxFrameGap, Math.abs(gap));
      return [row.number, row.group, row.clock, row.amount, rowTotal, rangeTotal, gap] as const;
    });
    const firstDifference = steps.find((row) => row[6] !== 0);
    const totals = [...groupTotals].map(([group, total]) => `组 ${group} 合计 ${total}`).join("。");
    return { steps, metrics: { windowGroups: groupTotals.size, differingRows, maxFrameGap }, report: {
      conclusion: differingRows ? `两种窗口帧在 ${differingRows} 行给出不同累计值。最大相差 ${maxFrameGap}。` :
        "本轮两种窗口帧的累计值逐行相同。",
      detail: `共有 ${rows.length} 行、${groupTotals.size} 个分区。${totals}。${firstDifference ?
        `首处差异在原第 ${firstDifference[0]} 行。ROWS 为 ${firstDifference[4]}。RANGE 为 ${firstDifference[5]}。` : "回放可逐行核对两列累计值。"}`,
      explanation: "两种帧都从分区开头累计。ROWS 累计到当前行。并列时按原行号排。RANGE 累计到当前时间。它包含同区同时间的所有行。换分区就重新累计。",
      suggestion: "保持分区和金额。给每区的行错开时间。再看差异行数是否归零。",
    } };
  },
});

export const foreignKeyDeleteLab = defineCurriculumLab({
  id: "foreign-key-delete", domain: "databases", title: "外键删除策略",
  description: "删同一父键，查看三种外键动作。",
  comparison: "RESTRICT / CASCADE / SET NULL",
  topics: ["foreign-key-integrity"],
  input: {
    fkParents: { kind: "list", min: 1, max: 99, minItems: 1, maxItems: 12, label: "父表主键", hint: "1–12 个不重复的键，每项 1–99" },
    fkChildLinks: { kind: "list", min: 1, max: 99, minItems: 0, maxItems: 20, label: "子表外键", hint: "每项是一行的外键，可以重复或留空清单" },
    fkDeleteKey: { kind: "integer", min: 1, max: 99, label: "删除哪个父键", hint: "允许尝试删除不存在的键" },
  },
  defaults: { goalLabel: "对比删除父键时三种策略的结果", fkParents: [1, 2, 3], fkChildLinks: [1, 1, 2, 3, 1], fkDeleteKey: 1 },
  check({ fkParents, fkChildLinks }) {
    const keys = new Set(fkParents);
    return keys.size === fkParents.length && fkChildLinks.every((key) => keys.has(key));
  },
  columns: ["表与行", "原键", "RESTRICT", "CASCADE", "SET NULL"],
  metricLabels: { referencingRows: "目标关联行", restrictParentRows: "RESTRICT 剩余父行", cascadeChildDeletes: "CASCADE 删除子行",
    setNullWrites: "SET NULL 置空子行", cascadeChildRows: "CASCADE 剩余子行", setNullChildRows: "SET NULL 剩余子行" },
  focusMetric: "referencingRows", alternateTrial: "只把待删父键从 1 改为 2。",
  run({ fkParents, fkChildLinks, fkDeleteKey }) {
    const targetExists = fkParents.includes(fkDeleteKey);
    const childRows = fkChildLinks.map((key, index) => ({ key, index: index + 1 }));
    const referencingRows = childRows.filter(({ key }) => key === fkDeleteKey).length;
    const blocked = referencingRows > 0;
    const cascadeChildren = childRows.filter(({ key }) => key !== fkDeleteKey);
    const nullChildren = childRows.map((row) => ({ ...row, key: row.key === fkDeleteKey ? null : row.key }));
    const steps = [
      ["待删父行", fkDeleteKey, targetExists ? blocked ? "有引用，拒绝" : "删除父行" : "无匹配",
        targetExists ? "删除父行" : "无匹配", targetExists ? "删除父行" : "无匹配"] as const,
      ...childRows.map(({ key, index }) => [`子行 ${index}`, key, `保留 ${key}`,
        key === fkDeleteKey ? "删除该行" : `保留 ${key}`, `保留 ${nullChildren[index - 1].key ?? "NULL"}`] as const),
    ];
    return { steps, metrics: { referencingRows, restrictParentRows: fkParents.length - Number(targetExists && !blocked),
      cascadeChildDeletes: childRows.length - cascadeChildren.length, setNullWrites: nullChildren.filter(({ key }) => key === null).length,
      cascadeChildRows: cascadeChildren.length, setNullChildRows: nullChildren.length }, report: {
      conclusion: !targetExists ? "父表无匹配键。三种策略都没有改动。" : blocked ?
        `RESTRICT 阻止删除。CASCADE 删 ${referencingRows} 个子行。SET NULL 置空 ${referencingRows} 行。` : "父键无子行引用。三种策略都只删父行。",
      detail: `父表原有 ${fkParents.length} 行。子表原有 ${childRows.length} 行。目标父键为 ${fkDeleteKey}。级联后保留 ${cascadeChildren.length} 个子行。置空后保留 ${nullChildren.length} 个子行。回放能核对每行。`,
      explanation: "三种策略各用一份原数据。RESTRICT 有引用就拒绝。CASCADE 删掉引用行。SET NULL 只清除外键。模型只模拟一层关系。子表外键允许 NULL。",
      suggestion: "换一个被引用较少的父键。对照三种结果。再尝试删除不存在的键。",
    } };
  },
});

export const sqlGroupingLab = defineCurriculumLab({
  id: "sql-grouping", domain: "databases", title: "SQL 查询执行",
  description: "用订单模拟 WHERE、GROUP BY、SUM 和 HAVING。观察筛行与筛组。",
  topics: ["sql-having-group-filter"],
  input: {
    orders: { kind: "rows", columns: [[1, 99], [0, 999]], minItems: 1, maxItems: 24, label: "订单（组号, 金额）", hint: "1–24 行，每行 [组号, 金额]。组号 1–99，金额 0–999。" },
    minOrder: { kind: "integer", min: 0, max: 999, label: "单笔最低金额", hint: "0–999。WHERE 保留金额大于或等于它的行。" },
    minSubtotal: { kind: "integer", min: 0, max: 23976, label: "组内最低合计", hint: "0–23976。HAVING 保留合计大于或等于它的组。" },
  },
  defaults: { goalLabel: "查看筛行和筛组分别排除了什么。", orders: [[1, 25], [1, 40], [1, 60], [2, 70], [2, 15], [3, 120]], minOrder: 40, minSubtotal: 100 },
  columns: ["执行阶段", "记录或分组", "数量或金额", "处理结果"],
  metricLabels: { orderRows: "原订单行数", whereRows: "WHERE 保留行数", groupedRows: "分组数", havingGroups: "HAVING 保留组数", sqlTotals: "输出组号和合计" },
  focusMetric: "havingGroups",
  alternateTrial: "保留单笔门槛。只改组内门槛。看保留几组。",
  run({ orders, minOrder, minSubtotal }) {
    const filtered = orders.filter(([, amount]) => amount >= minOrder);
    const grouped = new Map<number, { count: number; total: number }>();
    for (const [group, amount] of filtered) {
      const row = grouped.get(group) ?? { count: 0, total: 0 };
      row.count++;
      row.total += amount;
      grouped.set(group, row);
    }
    const groups = [...grouped].sort(([a], [b]) => a - b);
    const kept = groups.filter(([, { total }]) => total >= minSubtotal);
    const sqlTotals = kept.map(([group, { total }]) => `${group} 组 ${total}`).join("、") || "无输出";
    return {
      steps: [["读表", "全部订单", orders.length, "等待筛行"],
        ...orders.map(([group, amount], i) => ["WHERE", `第 ${i + 1} 行 · ${group} 组`, amount, amount >= minOrder ? "保留" : "剔除"] as const),
        ...groups.map(([group, { count, total }]) => ["GROUP BY / SUM", `${group} 组`, count, `合计 ${total}`] as const),
        ...groups.map(([group, { total }]) => ["HAVING", `${group} 组`, total, total >= minSubtotal ? "保留" : "剔除"] as const),
        ["输出", "保留组", kept.length, sqlTotals]],
      metrics: { orderRows: orders.length, whereRows: filtered.length, groupedRows: groups.length, havingGroups: kept.length, sqlTotals },
      report: {
        conclusion: kept.length ? `查询保留 ${kept.length} 组。` : "最终没有组输出。",
        detail: `先读 ${orders.length} 行。单笔门槛为 ${minOrder}。筛后剩 ${filtered.length} 行。共得到 ${groups.length} 组。组门槛为 ${minSubtotal}。`,
        explanation: "WHERE 先过滤单笔。分组后再算金额总和。HAVING 按总和筛组。" +
          `先剔除 ${orders.length - filtered.length} 行。再剔除 ${groups.length - kept.length} 组。`,
        suggestion: "固定订单和组门槛。只改单笔门槛。看合计怎样变。",
      },
    };
  },
});

export const joinStrategiesLab = defineCurriculumLab({
  id: "join-strategies", domain: "databases", title: "嵌套循环与哈希连接",
  description: "对同样的两张键列表执行等值内连接。重复键会生成多条结果。",
  comparison: "等值内连接的嵌套循环与按键哈希分组",
  topics: ["hash-join-build-probe", "sql-inner-left-join"],
  input: {
    leftRows: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 24, label: "左表连接键", hint: "1–24 个整数。可重复，也可为负数。" },
    rightRows: { kind: "list", min: -99, max: 99, minItems: 1, maxItems: 24, label: "右表连接键", hint: "1–24 个整数。相等的键会配对。" },
  },
  defaults: { goalLabel: "比较两种连接的候选数与结果数。", leftRows: [2, 2, 3, 8], rightRows: [1, 2, 2, 3, 4] },
  columns: ["左表键", "循环候选数", "哈希取到的行数", "循环配对行号", "哈希配对行号"],
  metricLabels: { joinMatches: "输出配对数", nestedCandidates: "循环检查候选数", hashCandidates: "哈希返回候选数", hashBuildRows: "建哈希表的行数", hashLookupCount: "哈希查询次数" },
  focusMetric: "joinMatches",
  alternateTrial: "固定左表。把右表改成全不匹配的键。",
  run({ leftRows, rightRows }) {
    const buckets = new Map<number, number[]>();
    rightRows.forEach((value, index) => {
      const rows = buckets.get(value) ?? [];
      rows.push(index + 1);
      buckets.set(value, rows);
    });
    let nestedCandidates = 0;
    let hashCandidates = 0;
    let joinMatches = 0;
    const steps = leftRows.map((value) => {
      const matches: number[] = [];
      for (const [i, right] of rightRows.entries()) {
        nestedCandidates++;
        if (value === right) matches.push(i + 1);
      }
      const fromHash = buckets.get(value) ?? [];
      hashCandidates += fromHash.length;
      joinMatches += matches.length;
      return [value, rightRows.length, fromHash.length, sequenceText(matches), sequenceText(fromHash)] as const;
    });
    return { steps, metrics: { joinMatches, nestedCandidates, hashCandidates, hashBuildRows: rightRows.length, hashLookupCount: leftRows.length }, report: {
      conclusion: `两种连接都输出 ${joinMatches} 对。`,
      detail: `左表 ${leftRows.length} 行。右表 ${rightRows.length} 行。循环检查 ${nestedCandidates} 对候选。哈希取到 ${hashCandidates} 对候选。`,
      explanation: `先读取 ${rightRows.length} 行建表。再按左键查 ${leftRows.length} 次。` +
        "循环会挨个对照右表。重复键可匹配多行。计数单列建表和查表。",
      suggestion: "固定左表。只增减右表重复键。看配对数怎么变。",
    } };
  },
});

function readNullableNumbers(input: string) {
  const tokens = input.trim().split(/[\s,，]+/);
  if (tokens.length > 24 || tokens.some((value) => !/^(?:null|-?\d{1,2})$/i.test(value))) return null;
  return tokens.map((value) => /^null$/i.test(value) ? null : Number(value));
}

export const sqlNullLab = defineCurriculumLab({
  id: "sql-null", domain: "databases", title: "SQL 空值与三值逻辑",
  description: "对同一列计算等号、不等号、IS NULL 和等于 NULL，观察 WHERE 保留哪些行。",
  comparison: "相同列值下的四种 WHERE 条件",
  topics: ["sql-null-three-valued-logic"],
  input: {
    nullableColumn: { kind: "text", maxLength: 240, label: "列值", hint: "1–24 项。写 NULL 或 −99 至 99 的整数。用逗号隔开。" },
    sqlCompareValue: { kind: "integer", min: -99, max: 99, label: "比较目标", hint: "等号和不等号使用的整数。" },
  },
  defaults: { goalLabel: "辨认真、假和未知。", nullableColumn: "5, NULL, 3, NULL, 5, -1", sqlCompareValue: 5 },
  check: ({ nullableColumn }) => readNullableNumbers(nullableColumn) !== null,
  columns: ["行号", "列值", "等于目标", "不等于目标", "IS NULL", "等于 NULL"],
  metricLabels: { sqlEqualRows: "等号保留行数", sqlNotEqualRows: "不等号保留行数", sqlIsNullRows: "IS NULL 保留行数", sqlEqualNullRows: "等于 NULL 保留行数", sqlUnknownRows: "与整数比较时的未知行数" },
  focusMetric: "sqlIsNullRows",
  alternateTrial: "把一个 NULL 改成目标值。再比保留数。",
  run({ nullableColumn, sqlCompareValue }) {
    const data = readNullableNumbers(nullableColumn)!;
    const empty = data.filter((value) => value === null).length;
    const equal = data.filter((value) => value === sqlCompareValue).length;
    const different = data.length - equal - empty;
    const steps = data.map((value, i) => [i + 1, value ?? "NULL", value === null ? "未知" : value === sqlCompareValue ? "真" : "假",
      value === null ? "未知" : value !== sqlCompareValue ? "真" : "假", value === null ? "真" : "假", "未知"] as const);
    return { steps, metrics: { sqlEqualRows: equal, sqlNotEqualRows: different, sqlIsNullRows: empty, sqlEqualNullRows: 0, sqlUnknownRows: empty }, report: {
      conclusion: `IS NULL 保留 ${empty} 行。等于 NULL 保留 0 行。`,
      detail: `本轮有 ${data.length} 行。值等于 ${sqlCompareValue} 的有 ${equal} 行。不等号保留 ${different} 行。`,
      explanation: "普通比较碰到空值就未知。WHERE 只保留结果为真的行。" +
        `和整数比较时，${empty} 行为未知。IS NULL 直接检查空值。`,
      suggestion: "固定比较目标。只替换一个 NULL。再读四列结果。",
    } };
  },
});

export const compositeIndexLab = defineCurriculumLab({
  id: "composite-index", domain: "databases", title: "联合索引的范围扫描",
  description: "对比逐行查找和按 (A, B) 排序的索引。固定 A 后定位 B 的区间。",
  comparison: "同一查询的逐行扫描与索引边界查找",
  topics: ["btree-composite-prefix"],
  input: {
    compositeKeys: { kind: "rows", columns: [[-99, 99], [-99, 99]], minItems: 1, maxItems: 32, label: "键（A, B）", hint: "1–32 行。每行两个 −99 至 99 的整数。" },
    indexLeading: { kind: "integer", min: -99, max: 99, label: "A 的固定值", hint: "仅匹配 A 等于它的行。" },
    indexLower: { kind: "integer", min: -99, max: 99, label: "B 的下界", hint: "包含下界。" },
    indexUpper: { kind: "integer", min: -99, max: 99, label: "B 的上界", hint: "包含上界。须大于或等于下界。" },
  },
  defaults: { goalLabel: "看固定前导列时区间怎么缩小。", compositeKeys: [[2, 25], [1, 10], [2, 10], [3, 20], [2, 18], [1, 22], [2, 25], [2, 30]],
    indexLeading: 2, indexLower: 15, indexUpper: 25 },
  check: ({ indexLower, indexUpper }) => indexLower <= indexUpper,
  columns: ["方法或阶段", "探测位置", "键或行数", "结果"],
  metricLabels: { compositeMatches: "匹配行数", fullScanKeys: "逐行检查数", compositeProbes: "索引边界探测数", compositeRange: "索引区间行数" },
  focusMetric: "compositeMatches",
  alternateTrial: "只缩小 B 的区间。看看重复键保留几行。",
  run({ compositeKeys, indexLeading, indexLower, indexUpper }) {
    const sorted = [...compositeKeys].sort(([a, b], [x, y]) => a - x || b - y);
    const steps: [string, string | number, string | number, string][] = [];
    const boundary = (bLimit: number, includeEqual: boolean) => {
      let lo = 0;
      let hi = sorted.length;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const [a, b] = sorted[mid];
        const before = a < indexLeading || (a === indexLeading && (b < bLimit || (includeEqual && b === bLimit)));
        if (before) lo = mid + 1;
        else hi = mid;
        steps.push([includeEqual ? "找右边界" : "找左边界", mid, `(${a}, ${b})`, `新范围 [${lo}, ${hi})`]);
      }
      return lo;
    };
    const left = boundary(indexLower, false);
    const right = boundary(indexUpper, true);
    const compositeProbes = steps.length;
    let matches = 0;
    for (const [index, [a, b]] of compositeKeys.entries()) {
      const match = a === indexLeading && b >= indexLower && b <= indexUpper;
      if (match) matches++;
      steps.push(["逐行扫描", index, `(${a}, ${b})`, match ? "保留" : "跳过"]);
    }
    steps.push(["索引取出", `[${left}, ${right})`, right - left, "连续区间"]);
    return { steps, metrics: { compositeMatches: matches, fullScanKeys: compositeKeys.length, compositeProbes, compositeRange: right - left }, report: {
      conclusion: `两种方法各命中 ${matches} 行。`,
      detail: `固定 A 为 ${indexLeading}。B 从 ${indexLower} 到 ${indexUpper}。逐行检查 ${compositeKeys.length} 键。索引探测 ${compositeProbes} 次。`,
      explanation: "索引先按 A 排，再按 B 排。固定 A 后，范围连续。左界含下限。右界在最后一项之后。" +
        `索引读取 ${right - left} 行。探测和取行分开统计。`,
      suggestion: "固定两列数据。只改 B 的上界。比较区间行数。",
    } };
  },
});
