import Image from "next/image";
import Link from "next/link";
import { CatalogIcon } from "@/components/experiments/CatalogEffects";
import { chapterFilters, type curriculumChapters, type CurriculumGroup } from "@/lib/curriculum";

type Chapter = (typeof curriculumChapters)[number];
type Course = CurriculumGroup["courses"][number];
type Diagram = { caption: string; nodes: readonly string[]; flow?: boolean };

const diagrams: Record<string, Diagram> = {
  "algorithms/algorithm-basics/cost-model": { caption: "扫描两遍，再做 7 步。", nodes: ["输入 n 项", "计数 2n + 7", "紧确阶 Θ(n)"], flow: true },
  "algorithms/algorithm-basics/ordered-lookup": { caption: "在有序数组中找 8。", nodes: ["[2, 4, 6, 8, 10]", "中点是 6", "只留 [8, 10]"], flow: true },
  "algorithms/algorithm-basics/comparison-sorting": { caption: "冒泡排序的一次交换。", nodes: ["3, 1, 2", "比较 3 和 1", "1, 3, 2"], flow: true },
  "algorithms/algorithm-basics/graph-search": { caption: "图搜索中的三种选点方式。", nodes: ["BFS · 先到先出", "Dijkstra · 最小 g", "A* · 最小 g + h"] },
  "algorithms/linear-structures/stacks": { caption: "栈按后进先出读取。", nodes: ["压入 A", "压入 B", "先弹出 B"], flow: true },
  "algorithms/trees-and-heaps/binary-trees": { caption: "用中序遍历二叉树。", nodes: ["左子树", "根节点", "右子树"], flow: true },
  "operating-systems/computer-architecture/pipeline": { caption: "经典五级流水线。", nodes: ["取指", "译码", "执行", "访存", "写回"], flow: true },
  "operating-systems/computer-architecture/memory-hierarchy": { caption: "按访问层次看存储。", nodes: ["寄存器", "缓存", "DRAM", "持久存储"], flow: true },
  "networks/internet/layered-models": { caption: "发送端逐层封装。", nodes: ["应用数据", "TCP 段", "IP 包", "以太网帧"], flow: true },
  "networks/internet/transport-layer": { caption: "传输层的两种交付方式。", nodes: ["TCP · 字节流", "UDP · 数据报"] },
  "networks/internet/network-layer": { caption: "路由器按目的地址转发。", nodes: ["读目的 IP", "最长前缀匹配", "交给下一跳"], flow: true },
  "programming/runtime-memory/function-calls": { caption: "以递归求阶乘为例。", nodes: ["factorial(3)", "factorial(2)", "factorial(1)"], flow: true },
  "programming/runtime-memory/build-and-link": { caption: "源文件到可执行程序。", nodes: ["源文件", "编译成目标文件", "链接生成程序"], flow: true },
  "databases/storage-and-query/index-structures": { caption: "B+ 树做范围查询。", nodes: ["定位起始键", "沿叶节点向后", "越过上界即停"], flow: true },
  "databases/relational-databases/joins-and-aggregation": { caption: "看 SQL 的逻辑处理顺序。", nodes: ["连接行", "按键分组", "用 HAVING 筛组"], flow: true },
  "ai/ai-foundations/agents-and-environments": { caption: "一次感知和行动循环。", nodes: ["观察环境", "选择动作", "环境改变"], flow: true },
  "foundations/linear-algebra/eigenvalues": { caption: "特征向量经变换仍共线。", nodes: ["输入向量 v ≠ 0", "施加变换 A", "Av = λv"], flow: true },
  "foundations/probability-and-statistics/conditional-probability": { caption: "已知 B，再问 A。", nodes: ["限定在 B", "找交集 A ∩ B", "P(A|B) = P(A ∩ B) / P(B)"], flow: true },
};

const photos = {
  board: { src: "/phase-two/board.webp", alt: "主板与芯片" },
  cpu: { src: "/phase-two/processor.webp", alt: "计算机处理器" },
  network: { src: "/phase-two/switch.webp", alt: "连接网线的网络设备" },
  code: { src: "/lab/laptop.jpg", alt: "工作台上打开代码的笔记本" },
  disk: { src: "/phase-two/storage.webp", alt: "拆开的机械硬盘" },
  gpu: { src: "/phase-two/gpu.webp", alt: "图形处理器" },
  server: { src: "/phase-one/server-workbench.webp", alt: "机房里的服务器机柜" },
};

const groupPhotos: Record<CurriculumGroup["id"], keyof typeof photos> = {
  algorithms: "board", "operating-systems": "cpu", networks: "network", programming: "code",
  databases: "disk", ai: "gpu", foundations: "board",
};

const coursePhotos: Partial<Record<string, keyof typeof photos>> = {
  "digital-logic": "board", "computer-organization": "board", "file-systems": "disk",
  "distributed-systems": "server", "parallel-computing": "server", "network-programming": "code",
  "computer-graphics": "gpu", "distributed-databases": "server",
};

export function CourseCover({ group, course }: { group: CurriculumGroup; course: Course }) {
  const photo = photos[coursePhotos[course.id] ?? groupPhotos[group.id]];
  return <div className="study-course-cover">
    <div className="study-course-cover-copy">
      <p>{group.title} <span aria-hidden="true">/</span> {course.chapters.length} 章</p>
      <h3>{course.title}</h3>
    </div>
    <div className="study-course-photo">
      <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 760px) 32vw, 260px" />
    </div>
  </div>;
}

export function StudyChapter({ chapter, previous, next, studied }: {
  chapter: Chapter; previous?: { href: string; title: string }; next?: { href: string; title: string }; studied: number;
}) {
  const diagram: Diagram = diagrams[chapter.key] ?? {
    caption: chapter.lessons.length ? "本章概念" : "目录要点",
    nodes: chapter.coverage.split(/[、，；]/u).map((item) => item.trim()).filter(Boolean),
  };
  return <>
    <header className="study-chapter-cover" key={chapter.key}>
      <div className="study-chapter-copy">
        <p className="study-chapter-status">{chapterFilters[chapter.status]}{chapter.hasLab && " · 可运行实验"}</p>
        <h4 id="study-chapter-title" tabIndex={-1}><span>{chapter.title}</span></h4>
        <p>{chapter.coverage}</p>
        {chapter.lessons.length > 0 && <div className="study-chapter-progress">
          <label htmlFor="study-chapter-progress">有学习记录 {studied} / {chapter.lessons.length}</label>
          <progress id="study-chapter-progress" value={studied} max={chapter.lessons.length} />
        </div>}
      </div>
      <figure className="study-chapter-diagram" data-flow={!!diagram.flow} data-chapter={chapter.key}>
        <figcaption>{diagram.caption}</figcaption>
        <ol>{diagram.nodes.map((node, index) => <li key={index}>
          {diagram.flow && index > 0 && <span aria-hidden="true">↓</span>}
          <div>{node}</div>
        </li>)}</ol>
      </figure>
    </header>
    {(previous || next) && <nav className="study-chapter-turn" aria-label="相邻章节">
      {previous && <Link href={previous.href} aria-label={`上一章 · ${previous.title}`}>
        <CatalogIcon icon="lucide:arrow-left" width={16} /><span><small>上一章</small>{previous.title}</span>
      </Link>}
      {next && <Link href={next.href} aria-label={`下一章 · ${next.title}`}>
        <span><small>下一章</small>{next.title}</span><CatalogIcon icon="lucide:arrow-right" width={16} />
      </Link>}
    </nav>}
  </>;
}
