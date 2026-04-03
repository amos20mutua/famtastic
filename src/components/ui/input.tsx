import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "field-input h-[42px] w-full px-3.5 sm:h-11 sm:px-4",
        className
      )}
      {...props}
    />
  );
}
