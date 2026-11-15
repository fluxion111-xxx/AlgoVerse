"use client";

import { memo, useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element, Root } from "hast";
import type { TutorCodeBlock } from "@/lib/tutorReply";
import { CatalogIcon } from "./CatalogEffects";

export function TutorCode({ language, code }: { language: string; code: string }) {
  const [copy, setCopy] = useState<"idle" | "copied" | "error">("idle");

  return <figure className="tutor-code">
    <figcaption>
      <span>{language || "代码"}</span>
      <button type="button" onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopy("copied");
        } catch { setCopy("error"); }
      }} aria-label="复制代码">
        <CatalogIcon icon={copy === "copied" ? "lucide:check" : "lucide:copy"} width={15} />
        {copy === "copied" ? "已复制" : "复制"}
      </button>
    </figcaption>
    <pre tabIndex={0} aria-label="代码片段"><code>{code}</code></pre>
    <span className={copy === "error" ? "tutor-copy-error" : "sr-only"} role="status">
      {copy === "error" ? "复制失败，请选择代码。" : copy === "copied" ? "已复制代码。" : ""}
    </span>
  </figure>;
}

const markdownComponents: Components = {
  pre({ node, children }) {
    const code = node?.children.find((child): child is Element => child.type === "element" && child.tagName === "code");
    if (!code) return <pre tabIndex={0}>{children}</pre>;
    const classes = code.properties.className;
    const tag = Array.isArray(classes) ? classes.find((name) => typeof name === "string" && name.startsWith("language-")) : "";
    const text = code.children.map((child) => child.type === "text" ? child.value : "").join("");
    return <TutorCode language={typeof tag === "string" ? tag.slice("language-".length) : ""} code={text.replace(/\n$/, "")} />;
  },
  a({ href, children }) {
    return <a href={href || undefined} target={href && !href.startsWith("#") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>;
  },
  table({ children }) {
    return <div className="tutor-markdown-table" tabIndex={0} aria-label="表格"><table>{children}</table></div>;
  },
};

// Reveal text in the parsed tree so links and Markdown delimiters stay intact.
function revealText(limit: number) {
  return (tree: Root) => {
    let remaining = limit;
    function visit(node: Root | Element) {
      for (let index = 0; index < node.children.length;) {
        const child = node.children[index];
        if (remaining <= 0 || (child.type === "element" && child.tagName === "pre")) {
          node.children.splice(index, 1);
          continue;
        }
        if (child.type === "text") {
          const size = child.value.length;
          let end = Math.min(remaining, size);
          if (/^[\uDC00-\uDFFF]/.test(child.value.slice(end))) end--;
          child.value = child.value.slice(0, end);
          remaining = end < size ? 0 : remaining - end;
        } else if (child.type === "element") visit(child);
        index++;
      }
    }
    visit(tree);
  };
}

export const TutorReply = memo(function TutorReply({ answer, codeBlocks, reveal }: {
  answer: string;
  codeBlocks?: TutorCodeBlock[];
  reveal: boolean;
}) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(0);
  const revealing = reveal && !reduce && visible < answer.length;

  useEffect(() => {
    if (!reveal || reduce || !answer.length) return;
    const started = performance.now();
    const duration = Math.max(450, Math.min(1500, answer.length * 8));
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      setVisible(Math.round(answer.length * progress));
      if (progress === 1) window.clearInterval(timer);
    }, 42);
    return () => window.clearInterval(timer);
  }, [answer, reduce, reveal]);

  return <div className="tutor-answer-text" data-revealing={revealing || undefined}>
    <Markdown components={markdownComponents} remarkPlugins={[remarkGfm]} skipHtml disallowedElements={["img"]}
      rehypePlugins={revealing ? [[revealText, visible]] : undefined}>{answer}</Markdown>
    {!revealing && codeBlocks?.map(({ language, lines }, index) => <TutorCode key={index} language={language} code={lines.join("\n")} />)}
  </div>;
});
