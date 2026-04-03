import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "field-input h-[42px] w-full appearance-none px-3.5 sm:h-11 sm:px-4",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
