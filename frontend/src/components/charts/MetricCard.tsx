import React from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  subtitle?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';
  format?: 'number' | 'currency' | 'percentage';
}

const colorStyles = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  gray: 'bg-gray-50 text-gray-600 border-gray-200',
};

const formatValue = (value: string | number, format?: 'number' | 'currency' | 'percentage'): string => {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  color = 'blue',
  format,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.value > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend.value < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-green-600';
    if (trend.value < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {Icon && (
          <div className={`p-2 rounded-lg border ${colorStyles[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="text-3xl font-bold text-gray-900">
          {formatValue(value, format)}
        </p>
        
        {(trend || subtitle) && (
          <div className="flex items-center gap-2 text-sm">
            {trend && (
              <div className={`flex items-center gap-1 font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>
                  {Math.abs(trend.value)}%
                </span>
                {trend.label && (
                  <span className="text-gray-500 font-normal">{trend.label}</span>
                )}
              </div>
            )}
            
            {!trend && subtitle && (
              <span className="text-gray-500">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
