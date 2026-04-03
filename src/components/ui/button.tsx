import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-pine-800 text-white shadow-[0_16px_28px_-20px_rgba(27,45,36,0.42)] hover:bg-pine-900",
  secondary:
    "border border-slatewarm-200 bg-white/95 text-slatewarm-800 shadow-[0_1px_2px_rgba(31,26,23,0.04),inset_0_1px_0_rgba(255,255,255,0.84)] hover:border-slatewarm-300 hover:bg-sand-50",
  ghost: "bg-transparent text-slatewarm-700 hover:bg-white/80 hover:text-slatewarm-900",
  soft: "bg-sand-100/95 text-slatewarm-800 hover:bg-sand-200/85",
  danger: "bg-sunrise-600 text-white hover:bg-sunrise-700"
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
        "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[0.95rem] px-3 py-2 text-[12.5px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine-200 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px] sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm",
        variantStyles[variant],
        fullWidth && "w-full",
        className
      )}
      type={type}
      {...props}
    />
  );
}
