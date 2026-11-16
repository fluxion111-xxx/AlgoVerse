"use client";

import dynamic from "next/dynamic";

export const LazyTutorReply = dynamic(() => import("./TutorReply").then((mod) => mod.TutorReply), {
  loading: () => <p role="status">正在整理回复…</p>,
});
