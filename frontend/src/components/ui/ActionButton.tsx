import { ReactNode, ComponentType } from 'react';

interface ActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
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
}: ActionButtonProps) {
  const baseStyles = 'h-9 px-4 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-primary-container hover:bg-primary text-on-primary',
    secondary: 'bg-surface-container-lowest hover:bg-surface-container-low text-on-surface',
    ghost: 'bg-transparent hover:bg-surface-container-low text-on-surface',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-[18px] h-[18px]" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon className="w-[18px] h-[18px]" />}
    </button>
  );
}
