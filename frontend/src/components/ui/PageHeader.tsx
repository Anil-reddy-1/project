import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string; // Legacy alias for subtitle
  badge?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, description, badge, actions }: PageHeaderProps) {
  const displaySub = subtitle || description;
  return (
    <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[26px] font-bold text-slate-800 leading-tight">{title}</h1>
          {badge && (
            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-mono font-bold tracking-wide">
              {badge}
            </span>
          )}
        </div>
        {displaySub && (
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{displaySub}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </section>
  );
}

