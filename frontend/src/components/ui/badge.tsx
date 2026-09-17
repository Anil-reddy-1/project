import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary-100 text-secondary-900 hover:bg-secondary-200",
        success:
          "border-success-200 bg-success-50 text-success-800",
        warning:
          "border-warning-200 bg-warning-50 text-warning-800",
        danger:
          "border-danger-200 bg-danger-50 text-danger-800",
        outline: "text-foreground border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Status Badge with Indicator Dot
interface StatusBadgeProps extends BadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'failed' | 'low-stock' | 'out-of-stock'
}

function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const statusConfig = {
    active: { variant: 'success' as const, label: 'Active', dotColor: 'bg-success-500' },
    inactive: { variant: 'secondary' as const, label: 'Inactive', dotColor: 'bg-secondary-400' },
    pending: { variant: 'warning' as const, label: 'Pending', dotColor: 'bg-warning-500' },
    completed: { variant: 'success' as const, label: 'Completed', dotColor: 'bg-success-500' },
    failed: { variant: 'danger' as const, label: 'Failed', dotColor: 'bg-danger-500' },
    'low-stock': { variant: 'warning' as const, label: 'Low Stock', dotColor: 'bg-warning-500' },
    'out-of-stock': { variant: 'danger' as const, label: 'Out of Stock', dotColor: 'bg-danger-500' },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={className} {...props}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
      {config.label}
    </Badge>
  )
}

export { Badge, StatusBadge, badgeVariants }
