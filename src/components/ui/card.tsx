import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface-card p-2.5 sm:p-3.5 md:p-[1.125rem]", className)} {...props} />;
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface-panel p-3 sm:p-4 md:p-[1.375rem]", className)} {...props} />;
}
