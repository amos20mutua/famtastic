import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "default" | "warm" | "success" | "critical" | "muted";

const toneStyles: Record<BadgeTone, string> = {
  default: "border border-pine-100 bg-brand-soft text-brand-strong",
  warm: "border border-warning-100 bg-warning-soft text-warning-700",
  success: "border border-success-100 bg-success-soft text-success-700",
  critical: "border border-danger-100 bg-danger-soft text-danger-700",
  muted: "border border-divider bg-canvas-muted text-ink-secondary"
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
        toneStyles[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
