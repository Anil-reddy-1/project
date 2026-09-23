import { ReactNode } from 'react';

interface StatusBadgeProps {
  status: string;
  // New API: explicit variant + status as display text
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  dot?: boolean;
  size?: 'sm' | 'md';
  // Legacy API: label overrides status text
  label?: string;
}

const variantStyles = {
  default:  'bg-slate-100 text-slate-600 border border-slate-200',
  success:  'bg-emerald-50 text-emerald-700 border border-emerald-100',
  warning:  'bg-amber-50 text-amber-700 border border-amber-100',
  danger:   'bg-red-50 text-red-600 border border-red-100',
  info:     'bg-blue-50 text-blue-700 border border-blue-100',
  neutral:  'bg-slate-50 text-slate-500 border border-slate-100',
};

const dotColors = {
  default:  'bg-slate-400',
  success:  'bg-emerald-500',
  warning:  'bg-amber-500',
  danger:   'bg-red-500',
  info:     'bg-blue-500',
  neutral:  'bg-slate-400',
};

// Map old status strings → variants for backwards compat
function resolveVariant(
  status: string,
  explicitVariant?: StatusBadgeProps['variant']
): NonNullable<StatusBadgeProps['variant']> {
  if (explicitVariant) return explicitVariant;
  const s = status.toLowerCase();
  if (s === 'success' || s === 'active' || s === 'in stock' || s === 'available') return 'success';
  if (s === 'warning' || s === 'low stock' || s === 'on task' || s === 'pending') return 'warning';
  if (s === 'danger' || s === 'inactive' || s === 'out of stock' || s === 'critical' || s === 'critical delivery' || s === 'overdue') return 'danger';
  if (s === 'info') return 'info';
  if (s === 'neutral') return 'neutral';
  return 'default';
}

export function StatusBadge({
  status,
  variant,
  dot = false,
  size = 'md',
  label,
}: StatusBadgeProps) {
  const resolvedVariant = resolveVariant(status, variant);
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
  const displayText = label ?? status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide ${sizeClass} ${variantStyles[resolvedVariant]}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[resolvedVariant]}`} />}
      {displayText}
    </span>
  );
}
