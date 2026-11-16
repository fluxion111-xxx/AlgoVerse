import { defineCurriculumLab, sequenceText } from "./curriculumLab";

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
