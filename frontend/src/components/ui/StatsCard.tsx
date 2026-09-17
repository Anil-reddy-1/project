import { ReactNode, ComponentType } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode; // Changed from ComponentType to ReactNode to accept JSX
  iconColor?: string;
  children?: ReactNode;
  trend?: 'up' | 'down' | 'neutral' | string; // Support string for simple trend
  trendValue?: string; // For trend percentage
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'text-blue-600',
  children,
  trend,
  trendValue,
}: StatsCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-gray-600 font-semibold">
          {title}
        </span>
        {icon && (
          <div className={`${iconColor}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <span className="text-2xl font-bold text-gray-900">
          {value}
        </span>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-gray-600 mb-3">{subtitle}</p>
      )}

      {/* Trend */}
      {trend && trendValue && trend !== 'neutral' && (
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
              trend === 'up'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        </div>
      )}
      
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
