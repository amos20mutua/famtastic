import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-[0_16px_28px_-20px_rgba(31,61,43,0.34)] hover:bg-brand-strong hover:shadow-[0_18px_30px_-20px_rgba(31,61,43,0.3)]",
  secondary:
    "border border-border bg-canvas-surface text-ink-secondary shadow-[0_1px_2px_rgba(26,34,29,0.04),inset_0_1px_0_rgba(255,255,255,0.84)] hover:border-slatewarm-200 hover:bg-canvas-muted hover:text-ink-primary hover:shadow-[0_10px_22px_-20px_rgba(26,34,29,0.12)]",
  ghost: "bg-transparent text-ink-secondary hover:bg-canvas-surface hover:text-ink-primary",
  soft: "bg-brand-soft text-brand-strong hover:bg-pine-100 hover:shadow-[0_10px_18px_-18px_rgba(31,61,43,0.12)]",
  danger: "bg-danger text-white hover:bg-danger-700 hover:shadow-[0_14px_24px_-18px_rgba(201,74,74,0.28)]"
};

export function Button({
  className,
  variant = "primary",
  fullWidth,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[0.9rem] px-3 py-2 text-[12px] font-semibold transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-out motion-safe:hover:-translate-y-[1px] motion-safe:active:translate-y-[1px] motion-safe:active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none sm:min-h-[42px] sm:gap-2 sm:rounded-[1rem] sm:px-3.5 sm:py-2 sm:text-[13px]",
        variantStyles[variant],
        fullWidth && "w-full",
        className
      )}
      type={type}
      {...props}
    />
  );
}
