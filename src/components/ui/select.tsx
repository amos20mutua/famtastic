import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "field-input h-[40px] w-full appearance-none px-3 sm:h-[42px] sm:px-3.5",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
