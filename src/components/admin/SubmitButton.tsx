"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils/cn";

export function SubmitButton({ children, className, pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("inline-flex h-10 items-center justify-center rounded-full bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-soft disabled:opacity-60", className)}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
