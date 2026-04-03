import type { ReactNode } from "react";
import { Panel } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Panel className="space-y-3.5 px-4 py-5 text-center sm:px-5 sm:py-6">
      <div className="mx-auto h-10 w-10 rounded-full border border-slatewarm-100 bg-white shadow-[0_12px_24px_-24px_rgba(27,45,36,0.2)] sm:h-12 sm:w-12" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slatewarm-900">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-6 text-slatewarm-700">{description}</p>
      </div>
      {action}
    </Panel>
  );
}
