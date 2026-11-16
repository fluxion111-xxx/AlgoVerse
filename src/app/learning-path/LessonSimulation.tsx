"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { PathfindingMapEditor, ResultSheet } from "@/components/PathfindingWorkbench";
import { KnnReplay, MemoryReplay } from "@/components/experiments/DomainReplay";
import { ExpandedLabFields } from "@/components/experiments/ExpandedLabFields";
import { GradientReplay, HashCollisionsReplay, KMeansReplay, PageReplacementReplay } from "@/components/experiments/ExpandedLabReplay";
import { RoutingMemoryTransactionFields } from "@/components/experiments/RoutingMemoryTransactionFields";
import { DynamicRoutingReplay, HeapReplay, TransactionReplay } from "@/components/experiments/RoutingMemoryTransactionReplay";
import { FactorialFields, KnnFields, NetworkFields, SchedulingFields } from "@/components/experiments/SimulationFields";
import { Controls, NetworkReplay, SchedulingReplay, useReplay } from "@/components/experiments/SimulationReplay";
import { TraversalLabFields } from "@/components/experiments/TraversalLabFields";
import { BankerReplay, GraphReplay, TcpReplay, TreeReplay } from "@/components/experiments/TraversalLabReplay";
import { pathfindingEngine, type PathfindingConfig } from "@/lib/experimentEngines";
import { deadlockAvoidanceEngine } from "@/lib/experiments/deadlockAvoidance";
import { dynamicRoutingEngine } from "@/lib/experiments/dynamicRouting";
import { gradientDescentEngine } from "@/lib/experiments/gradientDescent";
import { graphTraversalEngine } from "@/lib/experiments/graphTraversal";
import { hashCollisionsEngine } from "@/lib/experiments/hashCollisions";
import { kMeansEngine } from "@/lib/experiments/kMeans";
import { knnEngine } from "@/lib/experiments/knn";
import { memoryEngine } from "@/lib/experiments/memory";
import { memoryAllocationEngine } from "@/lib/experiments/memoryAllocation";
import { networkEngine } from "@/lib/experiments/network";
import { pageReplacementEngine } from "@/lib/experiments/pageReplacement";
import { schedulingEngine } from "@/lib/experiments/scheduling";
import { tcpCongestionEngine } from "@/lib/experiments/tcpCongestion";
import { transactionConcurrencyEngine } from "@/lib/experiments/transactionConcurrency";
import { treeTraversalEngine } from "@/lib/experiments/treeTraversal";
import { GOAL, initialWalls, START } from "@/lib/pathfinding";

const demos = {
  scheduling: SchedulingLessonDemo,
  memory: MemoryAllocationLessonDemo,
  network: NetworkTransmissionLessonDemo,
  "k-means": KMeansLessonDemo,
  "page-replacement": PageReplacementLessonDemo,
  "tcp-congestion": TcpCongestionLessonDemo,
  "transaction-concurrency": TransactionConcurrencyLessonDemo,
  "gradient-descent": GradientDescentLessonDemo,
  "hash-collisions": HashCollisionsLessonDemo,
  "tree-traversal": TreeTraversalLessonDemo,
  "graph-traversal": GraphTraversalLessonDemo,
  "deadlock-avoidance": DeadlockAvoidanceLessonDemo,
  pathfinding: PathfindingLessonDemo,
  "dynamic-routing": DynamicRoutingLessonDemo,
  "recursion-stack": RecursionStackLessonDemo,
  "knn-classification": KnnClassificationLessonDemo,
};

export function SimulationLessonDemo({ id }: { id: keyof typeof demos }) {
  const Demo = demos[id];
  return <Demo />;
}

type Parameters = Record<string, unknown>;

function LessonSimulation<Config, Result>({ title, hint, runLabel, initial, configure, run, Replay, fields,
  invalidMessage = "请检查参数范围和格式。" }: {
  title: string;
  hint: string;
  runLabel: string;
  invalidMessage?: string;
  initial: Parameters;
  configure: (value: Parameters) => Config | null;
  run: (config: Config) => Result;
  Replay: ComponentType<{ config: Config; results: Result }>;
  fields: (parameters: Parameters, update: (next: Parameters) => void) => ReactNode;
}) {
  const [parameters, setParameters] = useState(initial);
  const [current, setCurrent] = useState<{ id: number; config: Config; result: Result }>();
  const config = configure(parameters);
  return <section id="lesson-demo" className="lesson-section lesson-demonstration lesson-engine-demo creator-canvas" aria-labelledby="lesson-demo-title">
    <h6 id="lesson-demo-title">{title}</h6>
    <p>{hint}</p>
    <form className="lesson-engine-form" onSubmit={(event) => {
      event.preventDefault();
      if (config) setCurrent({ id: (current?.id ?? 0) + 1, config, result: run(config) });
    }}>
      {fields(parameters, (next) => {
        setParameters(next);
        setCurrent(undefined);
      })}
      {!config && <p role="status">{invalidMessage}</p>}
      <button className="catalog-jump" type="submit" disabled={!config}>{runLabel}</button>
    </form>
    {current && <Replay key={current.id} config={current.config} results={current.result} />}
    <p>本页试跑。要保存结果，请打开下方实验。</p>
  </section>;
}

const schedulingPreset = schedulingEngine.preset(0);
const memoryPreset = memoryAllocationEngine.preset(0);
const networkSeed = 101;
const networkPreset = networkEngine.preset(networkSeed);
const kMeansPreset = kMeansEngine.preset(0);
const pagePreset = pageReplacementEngine.preset(0);
const tcpPreset = tcpCongestionEngine.preset(0);
const transactionPreset = transactionConcurrencyEngine.preset(0);
const gradientPreset = gradientDescentEngine.preset(0);
const hashPreset = hashCollisionsEngine.preset(0);
const treePreset = treeTraversalEngine.preset(0);
const graphPreset = graphTraversalEngine.preset(0);
const bankerPreset = deadlockAvoidanceEngine.preset(0);
const pathfindingPreset = { goalLabel: "对照寻路代价与访问量。", map: { kind: "custom", start: START, goal: GOAL, walls: initialWalls } };
const routingPreset = dynamicRoutingEngine.preset(0);
const recursionPreset = memoryEngine.preset(0);
const knnPreset = knnEngine.preset(0);

export function SchedulingLessonDemo() {
  return <LessonSimulation title="让三个进程轮流跑" hint="先试时间片 2。再换成先来先服务。"
    runLabel="运行调度" initial={schedulingPreset} configure={(value) => schedulingEngine.configure(value, 0)}
    run={schedulingEngine.run} Replay={SchedulingReplay}
    fields={(parameters, update) => <SchedulingFields parameters={parameters} update={update} />} />;
}

export function MemoryAllocationLessonDemo() {
  return <LessonSimulation title="给同一组请求分配内存" hint="先看 E 选哪块。再找 F 的去处。"
    runLabel="运行分配" initial={memoryPreset} configure={(value) => memoryAllocationEngine.configure(value, 0)}
    run={memoryAllocationEngine.run} Replay={HeapReplay}
    fields={(parameters, update) => <RoutingMemoryTransactionFields config={memoryPreset} parameters={parameters} update={update} />} />;
}

export function NetworkTransmissionLessonDemo() {
  const { links, goalLabel } = networkPreset;
  const initial = { packets: 6, goalLabel, links: { ...links, AB: { ...links.AB, loss: 0 } } };
  return <LessonSimulation title="发一批包，逐跳看结果" hint={`固定种子 ${networkSeed}，方便复跑。先让 BD 必丢。`}
    runLabel="发送数据包" initial={initial} configure={(value) => networkEngine.configure(value, networkSeed)}
    run={networkEngine.run} Replay={NetworkReplay}
    fields={(parameters, update) => <NetworkFields parameters={parameters} update={update} />} />;
}

export function KMeansLessonDemo() {
  return <LessonSimulation title="看看中心怎样移动" hint="先跑默认样本。再把第二个中心移到 (2, 1)。"
    runLabel="运行聚类" initial={kMeansPreset} configure={(value) => kMeansEngine.configure(value, 0)}
    run={kMeansEngine.run} Replay={KMeansReplay}
    fields={(values, onChange) => <ExpandedLabFields initial={kMeansPreset} values={values} onChange={onChange} />} />;
}

export function PageReplacementLessonDemo() {
  return <LessonSimulation title="用三种策略回放缺页" hint="先跑默认序列。再把页框从 3 改成 4。"
    runLabel="运行置换" initial={pagePreset} configure={(value) => pageReplacementEngine.configure(value, 0)}
    run={pageReplacementEngine.run} Replay={PageReplacementReplay}
    fields={(values, onChange) => <ExpandedLabFields initial={pagePreset} values={values} onChange={onChange} />} />;
}

export function TcpCongestionLessonDemo() {
  return <LessonSimulation title="跟踪拥塞窗口" hint="单步看第 8 步的快重传。再看第 11 步的超时。"
    runLabel="运行拥塞控制" initial={tcpPreset} configure={(value) => tcpCongestionEngine.configure(value, 0)}
    run={tcpCongestionEngine.run} Replay={TcpReplay}
    fields={(parameters, update) => <TraversalLabFields config={tcpPreset} parameters={parameters} update={update} />} />;
}

export function TransactionConcurrencyLessonDemo() {
  return <LessonSimulation title="重读同一行，比较版本" hint="先看 A 第二次读取。再把 B 的提交改为回滚。"
    runLabel="运行事务" initial={transactionPreset} configure={(value) => transactionConcurrencyEngine.configure(value, 0)}
    run={transactionConcurrencyEngine.run} Replay={TransactionReplay}
    fields={(parameters, update) => <RoutingMemoryTransactionFields config={transactionPreset} parameters={parameters} update={update} />} />;
}

export function GradientDescentLessonDemo() {
  return <LessonSimulation title="换个学习率再走两步" hint="用 0.25 跑一轮。再换到 1.25，看损失会怎样。"
    runLabel="运行下降" initial={gradientPreset} configure={(value) => gradientDescentEngine.configure(value, 0)}
    run={gradientDescentEngine.run} Replay={GradientReplay}
    fields={(values, onChange) => <ExpandedLabFields initial={gradientPreset} values={values} onChange={onChange} />} />;
}

export function HashCollisionsLessonDemo() {
  return <LessonSimulation title="删掉一个键，再找下一个" hint="到第 5 步看探测路径。再换表容量或操作。"
    runLabel="运行哈希操作" initial={hashPreset} configure={(value) => hashCollisionsEngine.configure(value, 0)}
    run={hashCollisionsEngine.run} Replay={HashCollisionsReplay}
    fields={(values, onChange) => <ExpandedLabFields initial={hashPreset} values={values} onChange={onChange} />} />;
}

export function TreeTraversalLessonDemo() {
  return <LessonSimulation title="让四种顺序同场对照" hint="先观察根何时出现。再输入 4、9、2。"
    runLabel="运行树遍历" initial={treePreset} configure={(value) => treeTraversalEngine.configure(value, 0)}
    run={treeTraversalEngine.run} Replay={TreeReplay}
    fields={(parameters, update) => <TraversalLabFields config={treePreset} parameters={parameters} update={update} />} />;
}

export function GraphTraversalLessonDemo() {
  return <LessonSimulation title="同一起点，两种走法" hint="先从 0 出发。再改有向图，从 4 出发。"
    runLabel="运行图遍历" initial={graphPreset} configure={(value) => graphTraversalEngine.configure(value, 0)}
    run={graphTraversalEngine.run} Replay={GraphReplay}
    fields={(parameters, update) => <TraversalLabFields config={graphPreset} parameters={parameters} update={update} />} />;
}

export function DeadlockAvoidanceLessonDemo() {
  return <LessonSimulation title="这笔请求能发吗？" hint="先看 P1 的请求。再让 P4 申请 [3, 3, 0]。"
    runLabel="运行安全检查" initial={bankerPreset} configure={(value) => deadlockAvoidanceEngine.configure(value, 0)}
    run={deadlockAvoidanceEngine.run} Replay={BankerReplay}
    fields={(parameters, update) => <TraversalLabFields config={bankerPreset} parameters={parameters} update={update} />} />;
}

function PathfindingReplay({ config, results }: { config: PathfindingConfig; results: ReturnType<typeof pathfindingEngine.run> }) {
  const replay = useReplay(Math.max(results.dijkstra.visited.length, results.astar.visited.length), 135);
  return <div className="simulation-view" aria-label="寻路回放">
    <Controls replay={replay} />
    <div className="experiment-sheets">
      <ResultSheet algorithm="dijkstra" map={config} result={results.dijkstra} frame={replay.step} />
      <ResultSheet algorithm="astar" map={config} result={results.astar} frame={replay.step} />
    </div>
  </div>;
}

export function PathfindingLessonDemo() {
  return <LessonSimulation title="两种搜索走同一张图" hint="可挪起终点，也可改障碍。"
    runLabel="运行寻路" initial={pathfindingPreset} configure={(value) => pathfindingEngine.configure(value, 0)}
    invalidMessage="起点到不了终点。请调整地图。"
    run={pathfindingEngine.run} Replay={PathfindingReplay}
    fields={(parameters, update) => <PathfindingMapEditor map={parameters.map as typeof pathfindingPreset.map}
      onChange={(map) => update({ ...parameters, map: { kind: "custom", ...map } })} />} />;
}

export function DynamicRoutingLessonDemo() {
  return <LessonSimulation title="断链后，第一跳去哪？" hint="先看断开的结果。再把新成本改成 3。"
    runLabel="重算路由" initial={routingPreset} configure={(value) => dynamicRoutingEngine.configure(value, 0)}
    run={dynamicRoutingEngine.run} Replay={DynamicRoutingReplay}
    fields={(parameters, update) => <RoutingMemoryTransactionFields config={routingPreset} parameters={parameters} update={update} />} />;
}

export function RecursionStackLessonDemo() {
  return <LessonSimulation title="跟着阶乘压栈再返回" hint="先走完 4!。再用 0 试一次。"
    runLabel="运行阶乘" initial={recursionPreset} configure={(value) => memoryEngine.configure(value, 0)}
    run={memoryEngine.run} Replay={({ config, results }) => <MemoryReplay input={config.factorialInput} results={results} />}
    fields={(parameters, update) => <FactorialFields parameters={parameters} update={update} />} />;
}

export function KnnClassificationLessonDemo() {
  return <LessonSimulation title="让最近的点投票" hint="先跑 K = 3。再比较 K = 1。"
    runLabel="运行分类" initial={knnPreset} configure={(value) => knnEngine.configure(value, 0)}
    run={knnEngine.run} Replay={KnnReplay}
    fields={(parameters, update) => <KnnFields initial={knnPreset} parameters={parameters} update={update} />} />;
}
