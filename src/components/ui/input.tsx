import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "field-input h-[40px] w-full px-3 sm:h-[42px] sm:px-3.5",
        className
      )}
      {...props}
    />
  );
}
