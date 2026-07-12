/**
 * Delivery Partner route group layout.
 * Derived from: tech-spec.md §12.1, design-doc.md §4.3, ui-design-reference.md §6
 *
 * Design considerations (design-doc.md §4.3):
 * - Outdoor-readable, one-hand operation
 * - Highest contrast ratios on the platform (direct sunlight)
 * - One primary action per screen, bottom-anchored
 * - Never more than one high-emphasis CTA visible at once
 * - Minimum tap target: 44×44px everywhere (non-negotiable)
 * - Responsive down to 360px viewport
 */

import type { ReactNode } from "react";

interface DeliveryLayoutProps {
  children: ReactNode;
}

export default function DeliveryLayout({ children }: DeliveryLayoutProps) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Simplified navigation shell will be added in Phase 1 */}
      <main>{children}</main>
    </div>
  );
}
