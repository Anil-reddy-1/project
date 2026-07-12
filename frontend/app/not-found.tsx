/**
 * Global 404 Not Found page.
 * Follows design-doc.md §5 — Component Patterns:
 * Empty states always name what's missing and give the one action that fills it.
 */

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="text-center">
        <p className="font-data text-ink-muted text-sm tracking-wider">
          404
        </p>
        <h1 className="font-display text-ink mt-2 text-2xl">
          Page not found
        </h1>
        <p className="text-ink-muted mt-2 text-base">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-signal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-signal/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
