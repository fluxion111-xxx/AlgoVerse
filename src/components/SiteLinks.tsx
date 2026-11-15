"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteNavigation } from "@/lib/navigation";

export function SiteLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return siteNavigation.map(({ label, href }) => {
    const current = pathname === href ? "page" : href !== "/" && pathname.startsWith(href + "/") ? "location" : undefined;
    const linkClass = className && (current ? className + " active" : className);
    return <Link key={href} href={href} className={linkClass} aria-current={current} onNavigate={onNavigate}>{label}</Link>;
  });
}
