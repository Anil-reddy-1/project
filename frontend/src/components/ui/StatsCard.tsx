import { isValidElement } from 'react';
import type { ReactNode, ComponentType } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  description?: string; // Legacy alias
  icon?: ComponentType<{ className?: string }> | ReactNode;
  iconColor?: string;
  iconBg?: string;
  children?: ReactNode;
  trend?: 'up' | 'down' | 'neutral' | string;
  trendValue?: string;
}

function renderIconContent(
  icon: ComponentType<{ className?: string }> | ReactNode,
  iconColor: string
): ReactNode {
  if (!icon) return null;
  // 1. If it's already a rendered React element (e.g. <svg>...</svg> or <Users className="..." />)
  if (isValidElement(icon)) {
    return icon;
  }
  // 2. If it's a function component (standard React functional component)
  if (typeof icon === 'function') {
    const Icon = icon as ComponentType<{ className?: string }>;
    return <Icon className={`w-4 h-4 ${iconColor}`} />;
  }
  // 3. If it's a forwardRef component or object-based component (e.g. Lucide forwardRef icon)
  if (typeof icon === 'object' && icon !== null && '$$typeof' in (icon as any)) {
    const Icon = icon as any;
    return <Icon className={`w-4 h-4 ${iconColor}`} />;
  }
  // 4. Fallback for strings/numbers/other primitives
  return icon as ReactNode;
}

export function StatsCard({
  title,
  value,
  subtitle,
  description,
  icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  children,
  trend,
  trendValue,
}: StatsCardProps) {
  const displaySubtitle = subtitle || description;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Icon + Title row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          className="text-[10.5px] uppercase tracking-wider text-slate-400 font-semibold leading-tight line-clamp-1 min-w-0"
          title={title}
        >
          {title}
        </span>
        {icon && (
          <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
            {renderIconContent(icon, iconColor)}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-0.5">
        <span className="text-[22px] font-bold text-slate-800 tabular-nums leading-none">
          {value}
        </span>
      </div>

      {/* Subtitle */}
      {displaySubtitle && (
        <p className="text-[11.5px] text-slate-500 mt-1 leading-tight line-clamp-1">{displaySubtitle}</p>
      )}

      {/* Trend */}
      {trend && trendValue && trend !== 'neutral' && (
        <div className="flex items-center gap-1.5 text-[11px] mt-2">
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold ${
              trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        </div>
      )}

      {children && (
        <div className="mt-2 pt-2 border-t border-slate-100">{children}</div>
      )}
    </div>
  );
}
