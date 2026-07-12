/**
 * Retailer route group layout.
 * Derived from: tech-spec.md §12.1, design-doc.md §4.1, ui-design-reference.md §6
 *
 * Design considerations (design-doc.md §4.1):
 * - Optimized for a single question at a time
 * - Generous whitespace, large status displays
 * - Minimal simultaneous information
 * - Single-column, thumb-first layout below 768px
 * - Should feel closer to a well-designed consumer app
 */

import type { ReactNode } from "react";

interface RetailerLayoutProps {
  children: ReactNode;
}

export default function RetailerLayout({ children }: RetailerLayoutProps) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Navigation and shell components will be added in Phase 1 */}
      <main>{children}</main>
    </div>
  );
}
