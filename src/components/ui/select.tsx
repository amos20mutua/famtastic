import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "field-input h-11 w-full appearance-none px-4",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
