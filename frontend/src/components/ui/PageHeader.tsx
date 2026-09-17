import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-on-surface">{title}</h1>
          {badge && (
            <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-primary text-xs font-mono font-semibold">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </section>
  );
}
