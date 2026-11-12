"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";

const links = [
  { label: "首页", target: "top" },
  { label: "实验中心", target: "/experiments" },
  { label: "学习路径", target: "process" },
  { label: "AI 助教", target: "/experiments#creator-title" },
];

export function Header() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(target: string) {
    setMenuOpen(false);
    if (target.startsWith("/")) {
      router.push(target);
      return;
    }
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <>
      <header className="site-header flex items-center" id="top">
        <button className="brand" onClick={() => navigate("top")} aria-label="回到首页">
          <span className="brand-mark" aria-hidden="true"><i /><i /></span>
          <span>AlgoVerse</span>
          <span className="brand-name-cn">智算万象</span>
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
    </>
  );
}
