import type { Metadata } from "next";
import "./globals.css";
import "./collage.css";

export const metadata: Metadata = {
  title: "智算万象 AlgoVerse｜动手学算法",
  description: "AI 驱动的计算机科学虚拟仿真实验平台。动手实验，亲眼看见算法。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
