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
    <Panel className="space-y-4 px-5 py-6 text-center">
      <div className="mx-auto h-12 w-12 rounded-full border border-slatewarm-100 bg-white shadow-[0_12px_24px_-24px_rgba(27,45,36,0.2)]" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slatewarm-900">{title}</h3>
        <p className="mx-auto max-w-md text-sm leading-6 text-slatewarm-700">{description}</p>
      </div>
      {action}
    </Panel>
  );
}
