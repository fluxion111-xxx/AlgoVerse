import { answerKnowledgeExercise } from "@/app/learning-path/actions";
import type { KnowledgeTopic } from "@/lib/knowledge";
import { KnowledgeExercise } from "./KnowledgeExercise";
import "@/app/knowledge-reading.css";

export function KnowledgeReadingActions({ topic, read, updateReading, outline }: {
  topic: KnowledgeTopic;
  read: boolean;
  updateReading: (form: FormData) => Promise<void>;
  outline?: boolean;
}) {
  return <div className="knowledge-reading-actions">
    {topic.teaching?.exercises.length ? <a className="catalog-direct" href="#knowledge-practice">跳到练习</a> : null}
    {outline && <a className="catalog-direct" href="#knowledge-outline">查看目录</a>}
    <form className="knowledge-reading-mark" action={updateReading}>
      <button className={read ? "catalog-direct" : "catalog-jump"} type="submit" name="read" value={read ? "no" : "yes"}>
        {read ? "撤销已读" : "标记已读"}
      </button>
      {read && <span>已读</span>}
    </form>
  </div>;
}

export function KnowledgeTeaching({ topic }: { topic: KnowledgeTopic }) {
  const { teaching } = topic;
  if (!teaching) return null;
  const groups = [
    { title: "学完能做什么", entries: teaching.objectives },
    { title: "看个例子", entries: teaching.examples },
    { title: "容易踩的坑", entries: teaching.misconceptions },
  ];
  return <>
    {groups.map(({ title, entries }) => <section className="knowledge-copy" key={title}>
      <h3>{title}</h3>
      {entries.map((entry) => <p key={entry}>{entry}</p>)}
    </section>)}
    {teaching.reference && <section className="knowledge-copy">
      <h3>{teaching.reference.kind === "code" ? "代码片段" : "关键公式"}</h3>
      <pre className="knowledge-reference"><code>{teaching.reference.text}</code></pre>
    </section>}
    <section className="knowledge-copy knowledge-practice" id="knowledge-practice" tabIndex={-1} aria-label="练习与解析">
      <h3>练习与解析</h3>
      {teaching.exercises.map(({ id, prompt, options }) => <KnowledgeExercise key={id} id={`${topic.id}-${id}`}
        prompt={prompt} options={options} submit={answerKnowledgeExercise.bind(null, topic.id, id)} />)}
    </section>
  </>;
}
