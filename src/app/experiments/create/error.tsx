"use client";

import Link from "next/link";
import { agentWorkbenchLink } from "@/lib/navigation";
import "./agent-workbench.css";

export default function WorkbenchError({ reset }: { reset: () => void }) {
  return <main className="algoverse-workbench wb-history-error">
    <section aria-labelledby="wb-restore-error">
      <h1 id="wb-restore-error">研究读取失败</h1>
      <p role="alert">请重试，或查看其他研究。</p>
      <div className="wb-actions">
        <button type="button" className="wb-button wb-primary" onClick={reset}>重试</button>
        <Link href={agentWorkbenchLink({ fresh: true })} className="wb-button">打开工作台</Link>
      </div>
    </section>
  </main>;
}
