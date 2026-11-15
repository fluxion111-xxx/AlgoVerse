import { fullTopic as topic } from "@/content/knowledge/coverage/types";
const theory = { title: "MIT 18.404J · NP-Completeness", href: "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/c1aca7046a69c913721e5eb910a5fb21_MIT18_404f20_lec15.pdf" };
const computability = { title: "MIT 18.404J · Theory of Computation", href: "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/pages/lecture-notes/" };

export const theoryTopics = [
  topic(["formal-languages", "complexity-classes"], ["clique-certificate-check", "团判定问题的验证证书", "进阶"], ["polynomial-reductions", "adjacency-list"], theory,
    "给出候选顶点集就能验证。", "团里任意两个不同顶点都相邻。判定是否存在大小至少 k 的团时，证书只需列出 k 个不同顶点。检查每对之间是否有边即可。",
    "写出团证书需要通过的检查。", "顶点 {A,B,C,D} 中缺少 A→D 对应的无向边。即使其余五条边齐全，也不是四点团。", "能快速查证给定答案，不等于能快速找到答案。",
    ["核对五点团，需要验证多少个无序顶点对？", ["5", "10", "20"], 1, "配对数是 5×4÷2=10，每对只检查一次。"]),
  topic(["formal-languages", "complexity-classes"], ["three-sat-clique-literal-choice", "从 3-SAT 归约到团", "拓展"], ["clique-certificate-check", "np-hardness-reduction-direction"], theory,
    "用顶点表示各子句中的文字。", "每个文字出现建一个顶点。只连接来自不同子句且不互相否定的顶点。若有 m 个子句，大小 m 的团恰好给每个子句选出一个相容文字。",
    "说明边的规则为何限制相互矛盾。", "子句一选 x，子句二选 ¬x。它们无法同时成立，所以两点之间不连边。", "不能连同一子句的两个顶点，否则团可能漏选某个子句。",
    ["相邻子句各含一个正文字 x。对应顶点可以相连吗？", ["不可以，因为都用同一变量", "可以", "不可以，因为两点同号"], 1, "跨子句且同号，不会要求同一变量同时真假。"]),
  topic(["formal-languages", "computability"], ["undecidable-reduction-halting-accepts", "用识别器归约停机问题", "拓展"], ["halting-problem", "recognizer-versus-decider"], computability,
    "把停不停变成接不接受。", "给定机器 M 和输入 w，新建机器 N，在任意输入上模拟 M(w)。若模拟完毕，无论 M 接受还是拒绝，N 都接受。若有通用接受判定器，就能据此判定停机。",
    "区分原程序拒绝和新程序的接受。", "M 在 w 上跑三步后拒绝。N 看见模拟结束后接受，因此仍能标记 M 已停机。", "不能让 N 直接转发 M 的结果。否则 M 拒绝和不停止都无法标记为接受。",
    ["若 M(w) 永远运行，N 会怎样？", ["不停止，因而不接受", "立即拒绝", "在未知步数后接收"], 0, "N 没有基于有限等待时间得出结论的方式，所以继续模拟。"]),
];
