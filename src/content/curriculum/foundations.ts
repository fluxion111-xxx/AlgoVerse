import { hainan, cs2023, sdjzu, mitMath } from "./sources";
import { curriculumCourse as course } from "./types";

export const foundationCurriculum = [
  course("discrete-mathematics", "离散数学", [hainan, sdjzu, cs2023], [
    ["logic", "命题与谓词逻辑", "联结词、量词、推理规则"],
    ["proofs", "证明方法", "直接证明、反证法、数学归纳法"],
    ["sets-and-relations", "集合、关系与函数", "等价关系、偏序、映射"],
    ["combinatorics", "组合计数", "排列组合、容斥、鸽巢原理"],
    ["graphs-and-recurrences", "图论与递推", "连通、树、递推关系"],
  ]),
  course("linear-algebra", "线性代数", [sdjzu, mitMath, cs2023], [
    ["linear-systems", "线性方程组", "消元、矩阵、主元与秩"],
    ["vector-spaces", "向量空间", "子空间、基、维数、线性变换"],
    ["orthogonality", "正交与投影", "内积、正交基、最小二乘"],
    ["eigenvalues", "特征值与对角化", "特征向量、对称矩阵、谱分解"],
    ["matrix-decompositions", "矩阵分解", "LU、QR、SVD、低秩近似"],
  ]),
  course("probability-and-statistics", "概率统计", [sdjzu, cs2023], [
    ["conditional-probability", "事件与条件概率", "独立性、全概率、贝叶斯公式"],
    ["random-variables", "随机变量与分布", "离散、连续、期望、方差"],
    ["joint-distributions", "联合分布", "边缘与条件分布、协方差、相关"],
    ["sampling", "抽样与极限定理", "大数定律、中心极限定理、抽样分布"],
    ["inference", "统计推断", "估计、置信区间、假设检验、效应量"],
    ["interval-coverage", "置信区间覆盖率", "重复抽样、均值与比例区间、覆盖率模拟与选择偏差"],
    ["dependent-heavy-tail-inference", "相关与重尾样本推断", "长期方差、分块重抽、中位数区间与稳健估计"],
    ["nonstationary-heavy-tails", "非平稳重尾推断", "变化中心、稳健窗口、变点扫描、局部分块与滚动验证"],
    ["real-heavy-tail-backtesting", "真实重尾序列回测", "事件目录、代理量、时间切分、滚动基准与尾日损失"],
    ["heavy-tail-interval-replay", "真实重尾序列的区间覆盖", "预测区间、滚动校准、分组覆盖、宽度与时间切分"],
    ["nonfinancial-tail-coverage", "非金融重尾区间回测", "日均流量、连续日期、预测区间、条件覆盖与样本范围"],
    ["cross-domain-conditional-coverage", "跨域条件覆盖与重尾回测", "流量、降水、地震代理、活动分组与回退"],
    ["station-forward-coverage", "多站点条件覆盖与前推验证", "时间留出、观测首见、站点分组与预测可用率"],
    ["auditable-station-forecasting", "多站前瞻预测与首见审计", "预测承诺、外部时间戳、观测首见与修订"],
    ["public-forecast-revision", "公开前瞻与观测修订", "提前读回、分站条件覆盖、版本评分"],
    ["cross-day-approved-coverage", "跨日高水与批准值", "日期分块、站点条件覆盖、观测审批与版本配对"],
    ["live-high-flow-verification", "跨日高水实时预测", "公开发报、观测补见、审批配对"],
  ]),
  course("calculus", "微积分", [sdjzu, mitMath], [
    ["limits", "极限与连续", "数列极限、函数极限、连续性"],
    ["differentiation", "导数与变化率", "链式法则、切线、局部近似"],
    ["integration", "积分及其应用", "定积分、微积分基本定理、面积"],
    ["series", "级数与泰勒展开", "收敛判别、幂级数、余项"],
    ["multivariable", "多元微积分", "偏导、梯度、Hessian、约束极值"],
  ]),
  course("numerical-analysis", "数值分析", [{
    title: "MIT OpenCourseWare · Introduction to Numerical Analysis",
    href: "https://ocw.mit.edu/courses/18-330-introduction-to-numerical-analysis-spring-2012/",
  }], [
    ["floating-point", "浮点误差与稳定性", "舍入、误差传播、条件数"],
    ["root-finding", "方程求根", "二分、牛顿法、收敛与停止准则"],
    ["interpolation", "插值与逼近", "拉格朗日插值、样条、最小二乘"],
    ["quadrature", "数值积分", "复合梯形、辛普森法、误差估计"],
    ["numerical-systems", "数值线性方程组", "选主元、迭代法、残差与误差"],
  ]),
  course("formal-languages", "自动机与形式语言", [cs2023, {
    title: "MIT OpenCourseWare · Theory of Computation",
    href: "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/",
  }], [
    ["regular-languages", "正则语言与有限自动机", "正则表达式、DFA、NFA、等价转换"],
    ["regular-limits", "正则语言的边界", "闭包性质、抽引引理、自动机最小化"],
    ["context-free", "上下文无关文法", "推导、语法树、二义性、下推自动机"],
    ["computability", "图灵机与可计算性", "机器模型、归约、停机问题"],
    ["complexity-classes", "计算复杂性类", "P、NP、验证、多项式归约"],
  ]),
];
