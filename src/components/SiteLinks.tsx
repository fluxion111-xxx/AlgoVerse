"use client";

import { usePathname } from "next/navigation";
import { siteNavigation } from "@/lib/navigation";
import { NavigationLink } from "./NavigationLink";

export function SiteLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();

  return siteNavigation.map(({ label, href }) => {
    const current = pathname === href ? "page" : href !== "/" && pathname.startsWith(href + "/") ? "location" : undefined;
    const linkClass = className && (current ? className + " active" : className);
    return <NavigationLink key={href} href={href} className={linkClass} aria-current={current}
      onNavigate={current === "page" ? onNavigate : undefined}>
      {label}
    </NavigationLink>;
  });
}
