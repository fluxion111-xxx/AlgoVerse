import type { Metadata } from "next";
import Link from "next/link";
import { PathfindingWorkbench } from "@/components/PathfindingWorkbench";
import "../../experiments.css";

export const metadata: Metadata = {
  title: "路径搜索实验｜AlgoVerse 智算万象",
  description: "编辑地图，比较 Dijkstra 和 A* 的寻路过程。",
};

export default function PathfindingPage() {
  return (
    <main className="experiment-page">
      <header className="experiment-masthead">
        <Link className="experiment-brand" href="/" aria-label="AlgoVerse 首页">
          <span aria-hidden="true" />AlgoVerse
        </Link>
        <Link className="experiment-back" href="/experiments">返回实验中心</Link>
      </header>

      <div className="experiment-content">
        <header className="experiment-intro">
          <p className="experiment-kicker">实验中心</p>
          <h1>路径搜索实验</h1>
          <p>画一张地图，看两种算法怎么走。</p>
        </header>
        <PathfindingWorkbench />
      </div>
    </main>
  );
}
