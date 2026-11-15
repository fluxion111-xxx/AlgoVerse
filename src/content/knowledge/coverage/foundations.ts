import { fullTopic as topic } from "./types";

const discrete = { title: "MIT 6.042J · Mathematics for Computer Science", href: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/" };
const linear = { title: "MIT 18.06SC · Linear Algebra", href: "https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/" };
const probability = { title: "MIT 6.041SC · Applied Probability", href: "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/" };
const theory = { title: "MIT 18.404J · Theory of Computation", href: "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/" };

export const foundationCoverage = [
  topic(["discrete-mathematics", "sets-and-relations"], ["partial-order-incomparability", "偏序与不可比较", "基础"], ["equivalence-relations"], discrete,
    "偏序允许两项互不在前。", "偏序具备自反、反对称、传递。若两项都不小于对方，就不可比较。全序则要求任意两项可比。",
    "用集合包含关系找不可比较项。", "{1} 与 {2} 都是 {1,2} 的子集。但二者互不包含。",
    "反对称允许相等。它只要求双向关系同时成立时两项相同。",
    ["在子集偏序下，{1} 与 {2} 的关系是？", ["{1} 真包含 {2}", "相等", "不可比较"], 2, "集合元素不同，两边都不包含另一边。"]),
  topic(["linear-algebra", "linear-systems"], ["gaussian-elimination-row-ops", "高斯消元与初等行变换", "基础"], ["matrix-rank"], linear,
    "用等价的方程简化求解。", "可交换两行，乘非零常数，或把一行的倍数加到另一行。对增广矩阵做这些操作保持解集。",
    "选择能消掉一项的行变换。", "x+y=3，2x+y=4。用第二行减第一行得 x=1。",
    "常数列也要随整行一起变化。只改左边会换成另一个问题。",
    ["把第二行减第一行，右侧常数应怎样？", ["同样相减", "保持第二行常数", "总设为零"], 0, "整行代表一个等式。两边都要做同样的线性组合。"]),
  topic(["probability-and-statistics", "random-variables"], ["variance-independent-sum", "独立变量之和的方差", "进阶"], ["covariance"], probability,
    "独立时可直接相加方差。", "和的方差包括两项方差和两倍协方差。独立且方差有限时，协方差为零。",
    "判断何时必须考虑协方差。", "两次独立测量的方差都为 4。相加方差为 8。若相加的是同一次测量的两份拷贝，方差为 16。",
    "均值可直接相加。方差只有满足条件才可这样做。",
    ["X 的方差为 4。X+X 的方差是多少？", ["8", "16", "4"], 1, "X+X=2X，缩放后的方差乘 2²。同一变量的两份拷贝并不独立。"]),
  topic(["probability-and-statistics", "sampling"], ["central-limit-sample-mean", "中心极限定理与样本均值", "进阶"], ["law-of-large-numbers", "variance-independent-sum"], probability,
    "大样本的标准化均值近似正态。", "独立同分布且方差有限时，标准化的样本均值收敛到标准正态。原始观测值仍可明显偏斜。",
    "区分单个观测与均值的分布。", "掷很多枚公平硬币。单次只有正反。多次正面比例的分布却可接近钟形。",
    "样本量大不能修复强依赖或无限方差。先检查所用版本的条件。",
    ["中心极限定理让什么趋近正态？", ["每个原始观测值", "样本量本身", "标准化样本均值"], 2, "定理描述均值经过中心化和缩放后的分布。原始值分布可不变。"]),
  topic(["formal-languages", "regular-limits"], ["dfa-distinguishable-states", "DFA 等价状态与最小化", "进阶"], ["finite-automaton"], theory,
    "用后续输入判断两态能否合并。", "若对每个后缀，两态的接受结果都相同，就可合并。只要存在一个区分后缀，两态就须分开。",
    "用一个后缀证明状态可区分。", "状态 A 接受，状态 B 拒绝。即使不再输入符号，两态结果已不同。",
    "当前都接受也不保证等价。某个后续符号可使结果不同。",
    ["一态接受，一态拒绝。哪个后缀已足以区分？", ["空串", "必须长度为三", "不存在后缀"], 0, "空串不移动状态。当前一收一拒，结果已经不同。"]),
];
