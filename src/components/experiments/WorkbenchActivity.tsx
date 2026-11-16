"use client";

import { getExperimentEngine } from "@/lib/experimentEngines";
import type { AgentDecision, AgentTask } from "@/lib/experimentAgent";
import { WorkbenchIcon } from "./WorkbenchIcon";
import { LazyTutorReply } from "./LazyTutorReply";
import { DecisionDetails, SchedulingDetails } from "./WorkbenchEvidence";

export const agentPhases: Record<AgentTask["phase"], string> = {
  draft: "等待指令", deciding: "分析中", confirm: "等待确认", running: "工具运行中",
  observe: "实测已保存", clarify: "需要补充", finished: "任务完成", unsupported: "暂不支持",
  cancelled: "任务已取消", limit: "已到任务上限", "ai-error": "分析失败", "tool-error": "运行失败",
};

function PlanActivity({ decision, task }: { decision: AgentDecision; task: AgentTask }) {
  return <>
    {!!decision.plan?.length && <><h3>实验计划</h3><ol>{decision.plan.map((step, index) => <li key={index}>{step}</li>)}</ol></>}
    {decision.calls?.map((call) => {
      const saved = task.runs.findIndex(({ id }) => id === call.id);
      const pending = task.pending.some(({ id }) => id === call.id);
      return <details className="wb-activity-tool" key={call.id}>
        <summary><code>{call.tool}</code>
          <span>{saved >= 0 ? `已保存第 ${saved + 1} 轮` : pending ? agentPhases[task.phase] : "方案已结束"}</span>
        </summary>
        <pre className="wb-config" tabIndex={0}>{JSON.stringify(call.config, null, 2)}</pre>
      </details>;
    })}
    <p className="wb-model">{decision.model}</p>
  </>;
}

export function WorkbenchActivity({ task, status, error, blocked, modelBlocked, inFlight, retryReply, retryAnalysis, recover, openRun }: {
  task: AgentTask | null;
  status: string;
  error: string;
  blocked: boolean;
  modelBlocked: boolean;
  inFlight: boolean;
  retryReply: () => void;
  retryAnalysis?: () => void;
  recover?: () => void;
  openRun: (id: string) => void;
}) {
  const turns = task?.dialogue?.turns ?? [];
  const pending = task?.dialogue?.pending;
  const linkedCalls = new Set(turns.flatMap(({ proposalIds }) => proposalIds ?? []));
  const decisions = task?.decisions.filter(({ calls }) => calls?.length && calls.every(({ id }) => !linkedCalls.has(id))) ?? [];
  const importedCalls = task?.pending.filter(({ id }) => !task.decisions.some(({ calls }) => calls?.some((call) => call.id === id))) ?? [];
  return <div className="wb-activity-body">
    {status && <p className="wb-live" data-live={inFlight} role="status"><i aria-hidden="true" />{status}</p>}
    {error && <div className="wb-alert">{error}</div>}
    {recover && <button type="button" className="wb-button" disabled={blocked} onClick={recover}>刷新状态</button>}
    {retryAnalysis && <button type="button" className="wb-button" disabled={modelBlocked} onClick={retryAnalysis}>继续分析</button>}
    {pending && <div className="wb-pending-message">
      <p>{pending}</p>
      {!blocked && <button type="button" className="wb-button" disabled={modelBlocked} onClick={retryReply}>重试回复</button>}
    </div>}
    {task?.question && <p className="wb-pending-message">{task.question}</p>}
    {!turns.length && !decisions.length && !importedCalls.length && !pending && !task?.runs.length && !error && !inFlight && <div className="wb-activity-empty">
      <WorkbenchIcon icon="list-start" width={25} />
      <strong>暂无活动</strong>
      <p>发送指令后，在这里看回复。</p>
    </div>}
    {task && importedCalls.map((call) => <div className="wb-activity-tool" key={call.id}>
      <code>{call.tool}</code><span>{agentPhases[task.phase]}</span>
    </div>)}
    {task && task.runs.length > 0 && <section className="wb-activity-runs" aria-label="运行结果引用">
      {task.runs.map((run, index) => <button key={run.id} type="button" onClick={() => openRun(run.id)}>
        <WorkbenchIcon icon="circle-check" width={15} />
        <span>第 {index + 1} 轮 · {getExperimentEngine(run.tool, run.version)?.creator.title ?? run.tool}</span>
        <WorkbenchIcon icon="arrow-up-right" width={14} />
      </button>).reverse()}
    </section>}
    {task && <div className="wb-timeline">
      {turns.map((turn, index) => {
        const decision = turn.proposalIds?.length
          ? task.decisions.find(({ calls }) => calls?.some(({ id }) => turn.proposalIds?.includes(id))) : undefined;
        const label = { answer: "Agent 回复", run: "方案通过校验", explain: "实测解读", clarify: "请补充条件", unsupported: "能力提示" };
        return <details key={index} className="wb-event" open={index === turns.length - 1}>
          <summary>
            <WorkbenchIcon icon={decision ? "list-checks" : "message-square"} width={15} />
            <span>{turn.action ? label[turn.action] : turn.stopped ? "已停止回复" : "未收到回复"}</span>
            <WorkbenchIcon icon="chevron-down" width={14} />
          </summary>
          <div className="wb-event-body">
            <p className="wb-request">{turn.message}</p>
            {turn.action && (turn.tutor ? <LazyTutorReply answer={turn.reply} codeBlocks={turn.tutor.codeBlocks} reveal={false} />
              : <DecisionDetails decision={{ observation: turn.reply, evidence: turn.evidence }} runs={task.runs} />)}
            {turn.scheduling && <SchedulingDetails evidence={turn.scheduling} />}
            {decision && <PlanActivity decision={decision} task={task} />}
          </div>
        </details>;
      }).reverse()}
      {decisions.map((decision) => <details key={decision.calls?.[0].id} className="wb-event" open={decision === task.decisions.at(-1)}>
        <summary>
          <WorkbenchIcon icon="list-checks" width={15} /><span>方案通过校验</span><WorkbenchIcon icon="chevron-down" width={14} />
        </summary>
        <div className="wb-event-body"><DecisionDetails decision={decision} runs={task.runs} /><PlanActivity decision={decision} task={task} /></div>
      </details>).reverse()}
    </div>}
  </div>;
}
