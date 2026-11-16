import { defineCurriculumLab, sequenceText } from "./curriculumLab";

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
