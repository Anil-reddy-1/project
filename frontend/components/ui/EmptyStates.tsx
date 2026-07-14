/**
 * Empty State Components
 * Task #19: Empty state components
 * 
 * Display when no data is available
 */

'use client';

import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>

      {actionLabel && (actionHref || onAction) && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {actionLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function EmptyOrders() {
  return (
    <EmptyState
      icon={
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      }
      title="No Orders Yet"
      description="You haven't placed any orders. Browse products and add items to your cart to get started."
      actionLabel="Browse Products"
      actionHref="/retailer/shops"
    />
  );
}

export function EmptyAddresses() {
  return (
    <EmptyState
      icon={
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      }
      title="No Saved Addresses"
      description="Add a delivery address to complete your order. You can save multiple addresses for faster checkout."
      actionLabel="Add Address"
    />
  );
}

export function EmptyCart() {
  return (
    <EmptyState
      icon={
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      }
      title="Your Cart is Empty"
      description="Add products to your cart to place an order. Browse our catalog to find products you need."
      actionLabel="Browse Products"
      actionHref="/retailer/shops"
    />
  );
}

export function EmptySearchResults({ query }: { query: string }) {
  return (
    <EmptyState
      icon={
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="No Results Found"
      description={`We couldn't find any results for "${query}". Try searching with different keywords.`}
    />
  );
}

export function NoOrdersForStatus({ status }: { status: string }) {
  const statusTitles: Record<string, string> = {
    PENDING_APPROVAL: 'No Pending Orders',
    APPROVED: 'No Approved Orders',
    PACKED: 'No Packed Orders',
    SHIPPED: 'No Shipped Orders',
    DELIVERED: 'No Delivered Orders',
    CANCELLED: 'No Cancelled Orders',
  };

  return (
    <EmptyState
      icon={
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
      title={statusTitles[status] || 'No Orders'}
      description={`You don't have any orders with ${status.toLowerCase().replace('_', ' ')} status.`}
    />
  );
}
