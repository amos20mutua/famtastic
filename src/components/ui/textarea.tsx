import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "field-input min-h-[112px] w-full px-4 py-3",
        className
      )}
      {...props}
    />
  );
}
