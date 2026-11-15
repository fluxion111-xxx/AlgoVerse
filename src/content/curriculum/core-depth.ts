import { curriculumCourse as course } from "./types";

export const randomProcessesSource = {
  title: "MIT 6.041SC · Random Processes",
  href: "https://ocw.mit.edu/courses/6-041sc-probabilistic-systems-analysis-and-applied-probability-fall-2013/pages/unit-iii/",
};
export const stochasticProcessesSource = {
  title: "MIT 6.262 · Discrete Stochastic Processes",
  href: "https://ocw.mit.edu/courses/6-262-discrete-stochastic-processes-spring-2011/",
};
export const convexOptimizationSource = {
  title: "Stanford · Boyd and Vandenberghe, Convex Optimization",
  href: "https://web.stanford.edu/~boyd/cvxbook/",
};
export const optimizationMethodsSource = {
  title: "MIT 15.093J · Optimization Methods",
  href: "https://ocw.mit.edu/courses/15-093j-optimization-methods-fall-2009/",
};

export const coreDepthFoundations = [
  course("stochastic-processes", "随机过程", [randomProcessesSource, stochasticProcessesSource], [
    ["process-basics", "随机过程的表示", "样本路径、平稳性、自相关、随机游走"],
    ["arrival-processes", "伯努利与泊松到达", "到达间隔、独立增量、合并与拆分"],
    ["markov-transitions", "马尔可夫链的转移", "状态、转移矩阵、多步分布、吸收概率"],
    ["markov-long-run", "马尔可夫链的长期行为", "可约性、周期、平稳分布、细致平衡"],
    ["renewal-and-queues", "更新过程与排队", "更新率、Little 定律、M/M/1、利用率"],
    ["continuous-time-chains", "连续时间马尔可夫链", "生成矩阵、驻留时间、矩阵指数、均匀化与生灭过程"],
  ]),
  course("optimization-methods", "优化方法", [convexOptimizationSource, optimizationMethodsSource], [
    ["convex-models", "优化建模与凸性", "可行解、目标函数、凸集、凸函数、二阶判据"],
    ["unconstrained-methods", "无约束优化算法", "步长、回溯线搜索、牛顿法、病态性"],
    ["constrained-methods", "约束优化与对偶", "投影、拉格朗日、弱对偶、KKT"],
    ["linear-programming", "线性规划", "资源分配、松弛变量、单纯形法、对偶证书"],
    ["integer-optimization", "整数优化", "0–1 变量、LP 松弛、分支定界、最优性差距"],
    ["numerical-error-and-stopping", "数值优化误差与停止", "梯度残差、条件数、可行性、对偶间隙、尺度与浮点停滞"],
  ]),
];
