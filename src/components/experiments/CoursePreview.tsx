"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useInView, useReducedMotion } from "motion/react";
import type { Course } from "@/lib/courses";

const sortOrders = [
  [4, 0, 3, 1, 2], [0, 4, 3, 1, 2], [0, 3, 4, 1, 2], [0, 3, 1, 4, 2], [0, 3, 1, 2, 4],
];
const barHeights = [28, 52, 65, 43, 94];
const processes = ["P1", "P2", "P1", "P3", "P2"];
const networkNodes = [[40, 91], [112, 48], [194, 48], [263, 91], [194, 117], [112, 118]];
const packetRoute = [0, 1, 2, 3, 3];
const clusterPoints = [[53, 52], [74, 89], [99, 44], [114, 104], [49, 114], [173, 45], [198, 86], [243, 48], [226, 112], [255, 95]];

function Sorting({ frame }: { frame: number }) {
  const order = sortOrders[frame];
  return <>
    <path className="diagram-rule" d="M30 125H273 M30 91H273 M30 57H273 M30 23H273" />
    {barHeights.map((height, index) => {
      const position = order.indexOf(index);
      const comparing = frame < lastFrame && (position === frame || position === frame + 1);
      return <g key={index} className="diagram-shift" style={{ transform: `translateX(${49 + position * 45}px)` }}>
        <rect x="0" y={124 - height} width="29" height={height} rx="3" className={comparing ? "diagram-solid" : "diagram-wash"} />
        <text x="14.5" y={117 - height} textAnchor="middle">{height}</text>
      </g>;
    })}
  </>;
}

function Scheduling({ frame }: { frame: number }) {
  return <>
    <text x="24" y="29" className="diagram-title">CPU</text>
    <rect x="63" y="12" width="53" height="24" rx="4" className="diagram-solid" />
    <text x="89.5" y="28" textAnchor="middle" className="diagram-reverse">{processes[frame]}</text>
    <path className="diagram-rule" d="M24 109H278" />
    {processes.map((process, index) => (
      <g key={index}>
        <rect x={24 + index * 51} y="58" width="47" height="39" rx="4" className={index === frame ? "diagram-solid" : "diagram-wash"} />
        <text x={47.5 + index * 51} y="82" textAnchor="middle" className={index === frame ? "diagram-reverse" : undefined}>{process}</text>
        <text x={24 + index * 51} y="126">{index * 2}</text>
      </g>
    ))}
    <text x="269" y="126">10</text>
    <circle className="diagram-solid diagram-shift" cx="47.5" cy="109" r="4" style={{ transform: `translateX(${frame * 51}px)` }} />
  </>;
}

function Networking({ frame }: { frame: number }) {
  const [x, y] = networkNodes[packetRoute[frame]];
  return <>
    <path className="diagram-rule" d="M40 91L112 48H194L263 91L194 117H112L40 91 M112 48V118 M194 48V117" />
    <path className="diagram-link" d="M40 91L112 48H194L263 91" />
    {networkNodes.map(([cx, cy], index) => (
      <g key={cx + cy}>
        <circle cx={cx} cy={cy} r="12" className={packetRoute[frame] === index ? "diagram-solid" : "diagram-wash"} />
        <text x={cx} y={cy + 4} textAnchor="middle" className={packetRoute[frame] === index ? "diagram-reverse" : undefined}>{"ABCDEF"[index]}</text>
      </g>
    ))}
    <g className="diagram-shift" style={{ transform: `translate(${x}px, ${y - 24}px)` }}>
      <rect x="-9" y="-5" width="18" height="11" rx="2" className="diagram-solid" />
      <path d="M-6 -2L0 1L6 -2" className="diagram-packet" />
    </g>
  </>;
}

function Programming({ frame }: { frame: number }) {
  const line = [0, 1, 2, 3, 0][frame];
  const stack = frame === 0 || frame === 4 ? ["main()"] : ["sum(3)", "main()"];
  return <>
    <rect x="16" y="15" width="157" height="113" rx="6" className="diagram-terminal" />
    <rect x="24" y="28" width="141" height="18" rx="3" className="diagram-code-highlight diagram-shift" style={{ transform: `translateY(${line * 22}px)` }} />
    {["main()", "  sum(3);", "  int n = 3;", "  return n;"].map((code, index) => (
      <text key={code} x="32" y={41 + index * 22} className="diagram-code">{`${index + 1}  ${code}`}</text>
    ))}
    <text x="194" y="41" className="diagram-title">调用栈</text>
    <path className="diagram-rule" d="M190 123H282" />
    {stack.map((item, index) => (
      <g key={item} className="diagram-shift" style={{ transform: `translateY(${(index + 2 - stack.length) * 29}px)` }}>
        <rect x="192" y="61" width="89" height="24" rx="3" className={index === 0 ? "diagram-solid" : "diagram-wash"} />
        <text x="236" y="77" textAnchor="middle" className={index === 0 ? "diagram-reverse" : undefined}>{item}</text>
      </g>
    ))}
  </>;
}

function IndexTree({ frame }: { frame: number }) {
  const nodes = [
    { x: 150, y: 29, key: "24 · 48" }, { x: 59, y: 73, key: "12" }, { x: 150, y: 73, key: "36" },
    { x: 241, y: 73, key: "60" }, { x: 117, y: 117, key: "32" }, { x: 183, y: 117, key: "42" },
  ];
  const active = [0, 2, 4, 4, 4][frame];
  return <>
    <path className="diagram-rule" d="M150 38L59 63 M150 38V63 M150 38L241 63 M150 82L117 106 M150 82L183 106" />
    {frame > 0 && <path className="diagram-link" d={frame === 1 ? "M150 38V63" : "M150 38V73L117 106"} />}
    {nodes.map(({ x, y, key }, index) => (
      <g key={key}>
        <rect x={x - 27} y={y - 11} width="54" height="22" rx="3" className={index === active ? "diagram-solid" : "diagram-wash"} />
        <text x={x} y={y + 4} textAnchor="middle" className={index === active ? "diagram-reverse" : undefined}>{key}</text>
      </g>
    ))}
  </>;
}

function Clustering({ frame }: { frame: number }) {
  return <>
    <path className="diagram-rule" d="M29 22V125H274 M29 91H274 M29 57H274" />
    {frame > 0 && <path className="diagram-link" d="M155 20L145 123" />}
    {clusterPoints.map(([x, y], index) => {
      const center = index < 5 ? 80 : 220;
      const progress = Math.min(frame, 2) * 0.19;
      return <circle key={x} cx={x} cy={y} r="6" className={`diagram-shift ${frame === 0 ? "diagram-wash" : index < 5 ? "diagram-solid" : "diagram-leaf"}`} style={{ transform: `translate(${(center - x) * progress}px, ${(78 - y) * progress}px)` }} />;
    })}
    <rect x="157" y="82" width="10" height="10" rx="2" transform="rotate(45 162 87)" className={frame >= 3 ? "diagram-leaf" : "diagram-query"} />
    <text x="158" y="108">?</text>
  </>;
}

const diagrams = {
  algorithms: Sorting,
  "operating-systems": Scheduling,
  networks: Networking,
  programming: Programming,
  databases: IndexTree,
  ai: Clustering,
};

const lastFrame = 4;

export function CoursePreview({ course, interactive = false }: { course: Course; interactive?: boolean }) {
  const canvas = useRef<SVGSVGElement>(null);
  const isInView = useInView(canvas, { once: true, amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const [manual, setManual] = useState(false);
  const Diagram = diagrams[course.slug];

  useEffect(() => {
    if (!isInView || reduceMotion || manual || frame === lastFrame) return;
    const timer = window.setTimeout(() => setFrame((value) => Math.min(value + 1, lastFrame)), 560);
    return () => window.clearTimeout(timer);
  }, [frame, isInView, manual, reduceMotion]);

  return (
    <figure className="course-preview">
      <svg ref={canvas} className="course-diagram" viewBox="0 0 300 145" role="img" aria-label={course.preview}>
        <Diagram frame={frame} />
      </svg>
      <figcaption><span>概念预览</span>{interactive && (
        <button type="button" className="course-preview-step" onClick={() => { setManual(true); setFrame((value) => (value + 1) % (lastFrame + 1)); }}>
          <Icon icon="lucide:step-forward" width={15} aria-hidden="true" />下一帧
        </button>
      )}</figcaption>
    </figure>
  );
}
