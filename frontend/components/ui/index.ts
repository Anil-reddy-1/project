/**
 * Reusable UI components directory.
 * Derived from: design-doc.md §5 (Component Patterns)
 *
 * Base design system components will be built here as features require them.
 * Each component follows the design doc's principle:
 * "One visual pattern, one job, everywhere."
 *
 * Planned components (from design-doc.md §5):
 * - StatusBadge — pill shape, semantic color, always with text label
 * - ThreadedTimeline — the platform's signature status line
 * - OrderCard — triage-oriented, single primary CTA
 * - OtpInput — 6 individually boxed digits, auto-advance, monospace
 * - LedgerRow — tabular monospace amounts, inline status + action
 * - EmptyState — always names what's missing with corrective action
 */

// Loading States
export {
  CheckoutSkeleton,
  OrderListSkeleton,
  OrderDetailsSkeleton,
  PaymentProcessingSkeleton,
  AddressListSkeleton,
  LoadingSpinner,
  PageLoader,
} from './LoadingStates';

// Empty States
export {
  EmptyState,
  EmptyOrders,
  EmptyAddresses,
  EmptyCart,
  EmptySearchResults,
  NoOrdersForStatus,
} from './EmptyStates';

// Error States
export {
  ErrorDisplay,
  InlineError,
  InlineWarning,
  InlineSuccess,
  InlineInfo,
  ErrorBoundaryFallback,
  NetworkError,
  NotFoundError,
  UnauthorizedError,
} from './ErrorDisplay';
