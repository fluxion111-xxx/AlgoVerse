"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";
import { NavigationLink } from "./NavigationLink";
import { SiteLinks } from "./SiteLinks";

export function Header({ children, action }: { children?: ReactNode; action?: { href: string; label: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const toggle = useRef<HTMLButtonElement>(null);
  const actionHref = action?.href ?? "#process";
  const actionLabel = <>{action?.label ?? "发起实验"} <Icon icon="lucide:arrow-up-right" width={15} aria-hidden="true" /></>;

  return <header id="top" className="editorial-header" onKeyDown={(event) => {
    if (open && event.key === "Escape" && !event.defaultPrevented) {
      setOpen(false);
      toggle.current?.focus();
    }
  }}>
    <div className="editorial-header-inner editorial-frame">
      <NavigationLink className="editorial-brand" href="/" aria-label="AlgoVerse 智算万象，首页"
        onNavigate={pathname === "/" ? () => setOpen(false) : undefined}>
        <Icon icon="lucide:triangle" width={22} aria-hidden="true" />
        <span><b lang="en">AlgoVerse</b><small>智算万象</small></span>
      </NavigationLink>
      <nav className="editorial-nav" aria-label="主导航"><SiteLinks /></nav>
      <div className="editorial-header-actions">
        {children}
        {actionHref.startsWith("#")
          ? <a className="editorial-nav-cta" href={actionHref}>{actionLabel}</a>
          : <NavigationLink className="editorial-nav-cta" href={actionHref}>{actionLabel}</NavigationLink>}
        <button type="button" ref={toggle} className="editorial-nav-toggle" aria-expanded={open}
          aria-controls="editorial-mobile-navigation" onClick={() => setOpen(!open)}>
          {open ? "关闭" : "菜单"} <Icon icon={open ? "lucide:x" : "lucide:menu"} width={19} aria-hidden="true" />
        </button>
      </div>
    </div>
    <nav className="editorial-mobile-nav editorial-frame" id="editorial-mobile-navigation" aria-label="主导航" hidden={!open}>
      <SiteLinks onNavigate={() => setOpen(false)} />
    </nav>
  </header>;
}
