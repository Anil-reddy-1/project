import type { ReactNode, ComponentType } from 'react';

interface ActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  size?: 'sm' | 'md';
  title?: string;
}

export function ActionButton({
  children,
  onClick,
  variant = 'secondary',
  icon: Icon,
  iconPosition = 'left',
  disabled = false,
  type = 'button',
  className = '',
  size = 'md',
  title,
}: ActionButtonProps) {
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
  };

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-200 hover:shadow-md hover:shadow-blue-200',
    secondary:
      'bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 shadow-sm',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-800',
    danger:
      'bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 text-red-700',
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && iconPosition === 'left' && <Icon className={iconSize} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon className={iconSize} />}
    </button>
  );
}
