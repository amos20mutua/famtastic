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
      <div className="space-y-2 sm:space-y-2.5">
        {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
        <h1 className="max-w-3xl text-balance font-display text-[1.58rem] font-semibold leading-[0.98] tracking-[-0.036em] text-ink-primary sm:text-[2.02rem] md:text-[2.55rem]">
          {title}
        </h1>
        <p className="max-w-xl text-[13px] leading-[1.62] text-ink-secondary sm:text-[14px] sm:leading-[1.68] md:text-[15px] md:leading-[1.7]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">{actions}</div> : null}
    </div>
  );
}
