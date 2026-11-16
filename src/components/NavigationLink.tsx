"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return <output className={pending ? "nav-pending-status" : "sr-only"}
    data-nav-pending={pending || undefined}>{pending && "正在打开页面…"}</output>;
}

export function NavigationLink({ children, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props}>{children}<NavigationStatus /></Link>;
}
