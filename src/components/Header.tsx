"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";

const links = [
  { label: "首页", target: "top" },
  { label: "实验中心", target: "/experiments" },
  { label: "AI 共创" },
  { label: "知识图谱" },
  { label: "学习路径", target: "process" },
  { label: "资源库" },
];

export function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function navigate(target?: string) {
    setMenuOpen(false);
    if (target?.startsWith("/")) {
      router.push(target);
      return;
    }
    if (target) {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setNotice("正在准备，先玩实验吧！");
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <>
      <header className="site-header flex items-center" id="top">
        <button className="brand" onClick={() => navigate("top")} aria-label="回到首页">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span>AlgoVerse</span>
        </button>
        <nav className="desktop-nav flex items-center" aria-label="主导航">
          {links.map((link) => (
            <button
              key={link.label}
              className={`nav-link ${link.label === "首页" ? "active" : ""}`}
              onClick={() => navigate(link.target)}
            >
              <span>{link.label}</span>
            </button>
          ))}
        </nav>
        <button
          className="menu-toggle"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? "关闭导航" : "打开导航"}
          aria-expanded={menuOpen}
        >
          <Icon icon={menuOpen ? "lucide:x" : "lucide:menu"} width={24} />
        </button>
      </header>
      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="mobile-nav"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            aria-label="移动端导航"
          >
            {links.map((link) => (
              <button key={link.label} onClick={() => navigate(link.target)}>{link.label}</button>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {notice && (
          <motion.div className="notice" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
            <Icon icon="lucide:sparkles" width={18} />{notice}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
