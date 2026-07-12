/**
 * Admin route group layout.
 * Derived from: tech-spec.md §12.1, design-doc.md §4.4, ui-design-reference.md §6
 *
 * Design considerations (design-doc.md §4.4):
 * - Signal over volume — surface exceptions, not everything
 * - Default views pre-filtered to "needs attention"
 * - 12-column desktop grid (design-doc.md §2.3)
 * - Audit trail uses same threaded-line motif as retailer tracking
 * - Full unfiltered data one click away, never the default
 */

import type { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Admin dashboard navigation shell will be added in Phase 1 */}
      <main>{children}</main>
    </div>
  );
}
