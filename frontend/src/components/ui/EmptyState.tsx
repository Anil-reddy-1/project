import { ReactNode, ComponentType } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-on-surface-variant" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-on-surface mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant text-center max-w-md mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
