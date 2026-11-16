import { defineCurriculumLab, sequenceText } from "./curriculumLab";

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
