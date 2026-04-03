import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "field-input min-h-[96px] w-full px-3.5 py-2.5 sm:min-h-[112px] sm:px-4 sm:py-3",
        className
      )}
      {...props}
    />
  );
}
