import type { ReactNode, ComponentType } from 'react';
import { ActionButton } from './ActionButton';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  // Legacy props
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, action, actionLabel, onAction }: EmptyStateProps) {
  const resolvedAction =
    action ?? (actionLabel && onAction ? (
      <ActionButton variant="primary" onClick={onAction}>
        {actionLabel}
      </ActionButton>
    ) : null);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      )}
      <h3 className="text-[17px] font-semibold text-slate-700 mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-slate-400 text-center max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}
      {resolvedAction && <div className="mt-1">{resolvedAction}</div>}
    </div>
  );
}
