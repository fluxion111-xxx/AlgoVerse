import { fullTopic as topic } from "@/content/knowledge/coverage/types";

const discrete = { title: "MIT 6.042J · Mathematics for Computer Science", href: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/" };
const linear = { title: "MIT 18.06SC · Linear Algebra", href: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/" };
const probability = { title: "MIT 6.041SC · Applied Probability", href: "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/" };
const calculus = { title: "MIT 18.02SC · Multivariable Calculus", href: "https://ocw.mit.edu/courses/18-02sc-multivariable-calculus-fall-2010/" };
const numerical = { title: "MIT 18.330 · Numerical Analysis", href: "https://ocw.mit.edu/courses/18-330-introduction-to-numerical-analysis-spring-2012/" };
const theory = { title: "MIT 18.404J · Theory of Computation", href: "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/" };

export const foundationDepth = [
  topic(["discrete-mathematics", "logic"], ["nested-quantifier-order", "嵌套量词的顺序", "基础"], ["predicate-quantifiers"], discrete,
    "先选谁，决定后续能依赖什么。", "先全称后存在时，每个对象可有自己的见证。先存在后全称时，要有同一个见证服务全部对象。",
    "把量词顺序翻成选择规则。", "每人都有自己的密码。不能推出有一个密码对所有人都有效。", "交换两个不同量词常会改变真假。要看见证是否能随对象变化。",
    ["每个整数都有更大的整数。能推出存在一个整数比所有整数都大吗？", ["不能", "能，只要选偶数", "能，只要选 0"], 0, "前一句允许对不同输入选不同见证。后一句要求同一个整数胜过所有整数。"]),
  topic(["discrete-mathematics", "proofs"], ["contrapositive-proof", "逆否命题与反向证明", "基础"], ["predicate-quantifiers"], discrete,
    "证明结论不成立时，前提也不成立。", "P⇒Q 与非 Q⇒非 P 等价。逆命题 Q⇒P 则不一定同真同假。",
    "准确写出一条蕴含的逆否。", "若 n² 为奇数，则 n 为奇数。可证明 n 偶时，n² 必为偶数。", "逆否同时交换方向与取反。只交换方向会得到逆命题。",
    ["P⇒Q 的逆否命题是什么？", ["Q⇒P", "非 Q⇒非 P", "非 P⇒非 Q"], 1, "先取反结论作为前提，再取反原前提作为结论。"]),
  topic(["discrete-mathematics", "combinatorics"], ["pigeonhole-guarantee", "鸽巢原理的下界", "基础"], ["inclusion-exclusion"], discrete,
    "对象比盒子多时，总有盒子重叠。", "分配 n 个对象到 k 个盒子。至少一盒含不小于向上取整 n/k 的对象，否则总数装不下。",
    "算出可保证的最少拥挤量。", "13 个人按生日月份分成 12 组。至少一组两人。", "鸽巢原理保证存在。它不告诉你具体是哪一组。",
    ["25 个对象放进 8 个盒子。至少有一盒达到几个？", ["2", "3", "4"], 2, "若每盒最多 3 个，只能放 24 个，因此至少一盒有 4 个。"]),
  topic(["linear-algebra", "linear-systems"], ["null-space-rank-nullity", "零空间与秩零度定理", "进阶"], ["matrix-rank", "linear-independence"], linear,
    "输入维度分成可见方向与核。", "A 的秩等于像空间维数。零空间维数等于输入维数减秩，描述 Ax=0 的自由方向。",
    "由列数与秩算出自由维数。", "矩阵有 5 列，秩为 3。齐次方程有 2 维零空间。", "用输入维数，也就是列数。不要误用输出维数。",
    ["4×6 矩阵的秩为 4。零空间维数是多少？", ["2", "0", "6"], 0, "输入有 6 维。按定理，零空间维数为 6−4=2。"]),
  topic(["linear-algebra", "orthogonality"], ["least-squares-normal-equation", "最小二乘与正交残差", "进阶"], ["dot-product-projection", "matrix-rank"], linear,
    "让误差垂直于列空间。", "最小二乘寻找最接近 b 的 Ax。残差 b−Ax 与 A 的列正交，得到 AᵀAx=Aᵀb。",
    "判断残差与设计矩阵的关系。", "只拟合一个常数给 2、4、6。最佳常数为 4，三个残差之和是零。", "正规方程可解释原理。数值计算时应留意病态和稳定性。",
    ["只拟合一个常数给 2、4、6。最小二乘解是多少？", ["2", "4", "6"], 1, "常数模型的残差和应为零。满足这一点的值是均值 4。"]),
  topic(["probability-and-statistics", "conditional-probability"], ["probability-independence-exclusive", "独立事件与互斥事件", "基础"], ["bayes-rule"], probability,
    "一起发生与互不影响是两件事。", "互斥表示交集为空。独立要求联合概率等于边际概率乘积。两个正概率事件互斥时不能独立。",
    "用一次掷骰判断两个事件关系。", "一次掷骰出 1 与出 2 互斥。知道出了 1 后，出 2 的概率降为零。", "互斥并非相互无关。知道其中之一发生，会排除另一项。",
    ["A 和 B 互斥且都为正概率。它们独立吗？", ["总是独立", "只有等概率才独立", "不独立"], 2, "联合概率为零，两边概率的乘积却大于零。"]),
  topic(["probability-and-statistics", "inference"], ["p-value-null-model", "p 值与零假设", "进阶"], ["confidence-interval"], { title: "American Statistical Association · Statement on p-Values", href: "https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf" },
    "它衡量数据与指定模型的相容性。", "按零假设和检验模型，计算出现至少同样极端统计量的概率。p 值依赖检验统计量及极端方向。",
    "正确解释一次 p=0.03 的检验。", "若零假设成立，同样或更极端的统计量约有 3% 概率。", "p 值不是零假设为真的概率，也不直接给出效果大小。",
    ["p=0.03 直接表达什么？", ["在零假设下同样或更极端结果的概率", "零假设为真的概率", "实际效果大小为 3%"], 0, "p 值把零假设当作计算前提。它不是对假设本身的后验概率。"]),
  topic(["calculus", "multivariable"], ["gradient-zero-saddle-point", "驻点与鞍点", "进阶"], ["gradient-direction"], calculus,
    "梯度为零只给出候选点。", "可微函数内部的极值通常要求梯度为零。若不同方向一升一降，该点可能是鞍点。",
    "用两个方向区分极小点与鞍点。", "f=x²−y²。原点梯度为零。沿 x 轴增大，沿 y 轴减小。", "梯度为零不保证最小。还需检查二阶信息或局部变化。",
    ["f=x²−y² 的原点是什么？", ["局部极小点", "鞍点", "局部极大点"], 1, "在原点附近可找到正值和负值，故既非极小也非极大。"]),
  topic(["numerical-analysis", "root-finding"], ["newton-root-iteration", "牛顿求根的切线迭代", "进阶"], ["root-bisection", "chain-rule"], numerical,
    "用切线的零点更新猜测。", "在当前点线性近似函数，令近似值为零。斜率接近零时，步长可能很大。初值也影响收敛。",
    "手算一次牛顿更新。", "求 x²−2 的根，从 2 开始。函数值为 2，斜率为 4，下一个点为 1.5。", "局部收敛快不代表任意初值都成功。必要时保留包围区间。",
    ["对 x²−2，从 x=2 做一次牛顿迭代，得到什么？", ["1", "2.5", "1.5"], 2, "更新量为 f/f'=2/4=0.5。从 2 减去 0.5 得 1.5。"]),
  topic(["formal-languages", "regular-languages"], ["nfa-subset-construction", "NFA 到 DFA 的子集构造", "进阶"], ["finite-automaton"], theory,
    "用一个集合记录所有可能状态。", "每次读字符，从当前集合的每个状态取可达后继，再合并。含空边时还要取空闭包。",
    "判断确定化状态何时接受。", "当前集合为 {q1,q2}。若 q2 是接受态，集合状态就接受。", "确定化并不直接求最小 DFA。可达子集的数量也可能很多。",
    ["DFA 的子集状态含一个 NFA 接受态。该子集应怎样标记？", ["接受", "只有全部成员都接受才接受", "必为死状态"], 0, "NFA 只需存在一条接受路径。有一个可能状态接受就足够。"]),
];
