interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  dot?: boolean;
}

const variantStyles = {
  default: 'bg-surface-container-high text-primary',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-secondary-100 text-secondary-700',
};

export function StatusBadge({ status, variant = 'default', dot = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wide ${variantStyles[variant]}`}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current"></span>}
      {status}
    </span>
  );
}
