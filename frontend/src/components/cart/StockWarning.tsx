import React from 'react';
import { AlertTriangle, AlertCircle, Info, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import type { StockStatus } from '../../types/cart.types';

interface StockWarningProps {
  stockStatus: StockStatus;
  availableQuantity: number;
  requestedQuantity: number;
  minOrderQuantity: number;
  productName: string;
  variant?: 'inline' | 'alert';
  className?: string;
}

/**
 * StockWarning Component
 * Displays stock availability warnings with appropriate severity
 */
export const StockWarning: React.FC<StockWarningProps> = ({
  stockStatus,
  availableQuantity,
  requestedQuantity,
  minOrderQuantity,
  productName,
  variant = 'alert',
  className = '',
}) => {
  // Determine warning configuration based on stock status
  const getWarningConfig = () => {
    switch (stockStatus) {
      case 'out':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          title: 'Out of Stock',
          message: `${productName} is currently out of stock and cannot be ordered.`,
          severity: 'critical' as const,
        };
      
      case 'insufficient':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          title: 'Insufficient Stock',
          message: `Only ${availableQuantity} ${availableQuantity === 1 ? 'unit' : 'units'} available. You requested ${requestedQuantity}.`,
          severity: 'high' as const,
        };
      
      case 'low':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Low Stock',
          message: `Only ${availableQuantity} ${availableQuantity === 1 ? 'unit' : 'units'} remaining. Order soon!`,
          severity: 'medium' as const,
        };
      
      case 'healthy':
      default:
        return null;
    }
  };

  const config = getWarningConfig();

  // No warning needed for healthy stock
  if (!config) {
    return null;
  }

  const { icon: Icon, color, bgColor, borderColor, title, message, severity } = config;

  // Inline variant (compact, for cart items)
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm ${color} ${className}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
    );
  }

  // Alert variant (full-width, for cart summary)
  return (
    <Alert 
      variant={severity === 'critical' ? 'destructive' : 'default'}
      className={`${bgColor} ${borderColor} ${className}`}
    >
      <Icon className={`h-4 w-4 ${color}`} />
      <AlertDescription className={color}>
        <span className="font-semibold">{title}:</span> {message}
      </AlertDescription>
    </Alert>
  );
};

interface MOQWarningProps {
  currentQuantity: number;
  minOrderQuantity: number;
  productName: string;
  variant?: 'inline' | 'alert';
  className?: string;
}

/**
 * MOQWarning Component
 * Displays minimum order quantity warnings
 */
export const MOQWarning: React.FC<MOQWarningProps> = ({
  currentQuantity,
  minOrderQuantity,
  productName,
  variant = 'alert',
  className = '',
}) => {
  // Only show if below MOQ
  if (currentQuantity >= minOrderQuantity) {
    return null;
  }

  const message = `${productName} has a minimum order quantity of ${minOrderQuantity}. You have ${currentQuantity}.`;

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-sm text-blue-600 ${className}`}>
        <Info className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">MOQ: {minOrderQuantity} (Current: {currentQuantity})</span>
      </div>
    );
  }

  // Alert variant
  return (
    <Alert className={`bg-blue-50 border-blue-200 ${className}`}>
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-600">
        <span className="font-semibold">Below MOQ:</span> {message}
      </AlertDescription>
    </Alert>
  );
};

interface CartStockSummaryProps {
  hasStockIssues: boolean;
  hasMOQViolations: boolean;
  outOfStockCount: number;
  insufficientStockCount: number;
  lowStockCount: number;
  moqViolationCount: number;
  className?: string;
}

/**
 * CartStockSummary Component
 * Summary of all stock issues in the cart
 */
export const CartStockSummary: React.FC<CartStockSummaryProps> = ({
  hasStockIssues,
  hasMOQViolations,
  outOfStockCount,
  insufficientStockCount,
  lowStockCount,
  moqViolationCount,
  className = '',
}) => {
  // No issues, no summary
  if (!hasStockIssues && !hasMOQViolations) {
    return null;
  }

  const issues: string[] = [];

  if (outOfStockCount > 0) {
    issues.push(`${outOfStockCount} out of stock`);
  }
  if (insufficientStockCount > 0) {
    issues.push(`${insufficientStockCount} with insufficient stock`);
  }
  if (lowStockCount > 0) {
    issues.push(`${lowStockCount} with low stock`);
  }
  if (moqViolationCount > 0) {
    issues.push(`${moqViolationCount} below MOQ`);
  }

  // Determine severity
  const hasCritical = outOfStockCount > 0 || insufficientStockCount > 0;
  const icon = hasCritical ? XCircle : AlertTriangle;
  const IconComponent = icon;
  const color = hasCritical ? 'text-red-600' : 'text-orange-600';
  const bgColor = hasCritical ? 'bg-red-50' : 'bg-orange-50';
  const borderColor = hasCritical ? 'border-red-200' : 'border-orange-200';

  return (
    <Alert 
      variant={hasCritical ? 'destructive' : 'default'}
      className={`${bgColor} ${borderColor} ${className}`}
    >
      <IconComponent className={`h-4 w-4 ${color}`} />
      <AlertDescription className={color}>
        <span className="font-semibold">Cart Issues:</span> {issues.join(', ')}
        {hasCritical && (
          <p className="mt-1 text-sm">
            Please adjust quantities or remove items before checkout.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface StockBadgeProps {
  stockStatus: StockStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * StockBadge Component
 * Compact badge showing stock status
 */
export const StockBadge: React.FC<StockBadgeProps> = ({
  stockStatus,
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const config = {
    out: {
      label: 'Out of Stock',
      classes: 'bg-red-100 text-red-700 border border-red-200',
    },
    insufficient: {
      label: 'Insufficient',
      classes: 'bg-orange-100 text-orange-700 border border-orange-200',
    },
    low: {
      label: 'Low Stock',
      classes: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    },
    healthy: {
      label: 'In Stock',
      classes: 'bg-green-100 text-green-700 border border-green-200',
    },
  };

  const { label, classes } = config[stockStatus];

  return (
    <span
      className={`inline-flex items-center justify-center font-medium rounded ${sizeClasses[size]} ${classes} ${className}`}
    >
      {label}
    </span>
  );
};

/**
 * Helper function to calculate stock statistics from cart items
 */
export function calculateStockStats(cartItems: any[]) {
  let outOfStockCount = 0;
  let insufficientStockCount = 0;
  let lowStockCount = 0;
  let moqViolationCount = 0;
  let hasStockIssues = false;
  let hasMOQViolations = false;

  cartItems.forEach(item => {
    const { stockStatus, availableQuantity } = item.product;
    const { quantity } = item;
    const moq = item.product.minOrderQuantity || 0;

    // Count stock issues
    switch (stockStatus) {
      case 'out':
        outOfStockCount++;
        hasStockIssues = true;
        break;
      case 'insufficient':
        insufficientStockCount++;
        hasStockIssues = true;
        break;
      case 'low':
        lowStockCount++;
        break;
    }

    // Count MOQ violations
    if (quantity < moq) {
      moqViolationCount++;
      hasMOQViolations = true;
    }
  });

  return {
    outOfStockCount,
    insufficientStockCount,
    lowStockCount,
    moqViolationCount,
    hasStockIssues,
    hasMOQViolations,
  };
}
