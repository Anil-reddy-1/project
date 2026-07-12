/**
 * Wholesaler route group layout.
 * Derived from: tech-spec.md §12.1, design-doc.md §4.2, ui-design-reference.md §6
 *
 * Design considerations (design-doc.md §4.2):
 * - Density with triage — a working queue used all day
 * - 12-column desktop grid (design-doc.md §2.3)
 * - Incoming orders visually distinct by urgency
 * - Approve/Reject are the highest-frequency actions
 */

import type { ReactNode } from "react";

interface WholesalerLayoutProps {
  children: ReactNode;
}

export default function WholesalerLayout({ children }: WholesalerLayoutProps) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Dashboard navigation shell will be added in Phase 1 */}
      <main>{children}</main>
    </div>
  );
}
