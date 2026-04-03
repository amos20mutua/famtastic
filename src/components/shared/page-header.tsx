import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="space-y-1.5 sm:space-y-2.5">
        {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
        <h1 className="max-w-3xl text-balance font-display text-[1.72rem] font-semibold leading-[1.01] tracking-[-0.03em] text-slatewarm-900 sm:text-[2.25rem] md:text-[2.8rem]">
          {title}
        </h1>
        <p className="max-w-2xl text-[13px] leading-[1.55] text-slatewarm-700 sm:text-[15px] sm:leading-6 md:text-base md:leading-7">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">{actions}</div> : null}
    </div>
  );
}
