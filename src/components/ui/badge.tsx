import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "default" | "warm" | "success" | "critical" | "muted";

const toneStyles: Record<BadgeTone, string> = {
  default: "border border-pine-200 bg-pine-50 text-pine-900",
  warm: "border border-sand-300 bg-sand-100 text-slatewarm-900",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  critical: "border border-rose-200 bg-rose-50 text-rose-800",
  muted: "border border-slatewarm-100 bg-slatewarm-50 text-slatewarm-800"
};

export function Badge({
  className,
  children,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em]",
        toneStyles[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
