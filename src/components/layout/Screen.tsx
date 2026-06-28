import { type ReactNode } from "react";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  // Bottom padding accounts for mini player (~72px) + bottom nav (~64px) + safe area
  return (
    <div className="mx-auto w-full max-w-3xl pb-[180px]">
      {children}
    </div>
  );
}
