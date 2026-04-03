import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "field-input min-h-[88px] w-full px-3 py-2.5 sm:min-h-[100px] sm:px-3.5 sm:py-2.5",
        className
      )}
      {...props}
    />
  );
}
