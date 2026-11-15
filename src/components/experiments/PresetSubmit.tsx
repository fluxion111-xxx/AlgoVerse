"use client";

import { useFormStatus } from "react-dom";

export function PresetSubmit({ children, pending, className }: {
  children: string;
  pending: string;
  className: string;
}) {
  const status = useFormStatus();
  return <button className={className} type="submit" disabled={status.pending}>{status.pending ? pending : children}</button>;
}
