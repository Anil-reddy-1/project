# Design Document
## B2B Wholesale Marketplace — Visual & Interaction Design Language

**Version:** 1.0
**Status:** Draft — Pre-Build
**Purpose:** Define a design system that makes a fundamentally operational, trust-sensitive platform (goods, cash, delivery custody) feel clear, fast, and calm to use — for four very different users, often under real-world pressure (a shop owner mid-rush, a delivery partner on a phone in daylight, an admin scanning for problems).

---

## 1. Design Thesis

This is not a marketing site — it's a working tool for people moving goods and money. The design's single job is to make **state legible at a glance**: where is this order right now, whose turn is it to act, and is anything overdue. Every screen should answer "what do I do next?" in under two seconds.

The platform's real subject matter is **custody and motion** — goods change hands (retailer → wholesaler → partner → retailer again), cash changes hands, and trust is transferred at each handoff via OTP. The design should visually reflect that idea of a chain of custody rather than borrow the generic look of a food-delivery app or a SaaS dashboard template.

**Signature element:** a **threaded status line** — a single connected line that runs through every order's lifecycle (Placed → Approved → Packed → Picked Up → Delivered), rendered as a physical-feeling thread that visibly "draws forward" as state changes, rather than a row of disconnected icons lighting up. This same thread motif reappears as the live delivery route line on the map. It's the one visual idea that repeats everywhere or der state is shown, so all four roles learn to read it the same way.

---

## 2. Design Tokens

### 2.1 Color Palette
Avoiding both the "warm cream + terracotta" and "near-black + neon" defaults — this platform runs in daylight, in shops, on delivery routes, so it leans toward a **cool, high-clarity, paper-and-ink base** with a confident single accent, plus a disciplined semantic set for order states (the semantic colors carry real meaning here — they are not decoration, they are the interface's primary language).

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F6F7F5` | App background — cool off-white, not cream |
| `ink` | `#12161C` | Primary text |
| `ink-muted` | `#5B6270` | Secondary text, captions |
| `line` | `#E1E4E1` | Hairline borders, dividers |
| `signal` | `#1F4E8C` | Primary accent — actions, links, active states (a deep, confident "wholesale ledger blue," not a startup-purple) |
| `signal-soft` | `#E8EEF7` | Signal tint for backgrounds/badges |
| `amber` | `#B8790A` | Pending / awaiting action |
| `green` | `#1B7A4A` | Delivered / confirmed / success |
| `red` | `#B5402C` | Rejected / disputed / overdue |
| `violet` | `#5B4B8A` | In-transit / active delivery |

**Rule:** semantic colors (`amber`, `green`, `red`, `violet`) are reserved *exclusively* for order/ledger state — never reused decoratively elsewhere, so a color always means the same thing everywhere in the product.

### 2.2 Typography

| Role | Typeface | Notes |
|---|---|---|
| Display / headings | **Fraunces** (or similar humanist serif with some warmth), used sparingly at large sizes only | Gives the platform a trace of trade/ledger-book character without becoming decorative — used for page titles and section headers only, never body copy |
| Body / UI text | **Inter** | Neutral, extremely legible at small sizes, built for dense dashboards |
| Data / numerals | **IBM Plex Mono** (tabular figures) | Used for prices, quantities, order IDs, OTPs — anything that needs to be scanned digit-by-digit without ambiguity (a monospace `0` vs `O`, `1` vs `l` distinction matters when someone is reading an OTP aloud) |

**Type scale (base 16px):** 
`12 / 14 / 16 / 20 / 24 / 32 / 40` — used consistently across all four role dashboards so density stays predictable.

### 2.3 Spacing & Grid
- 8px base spacing unit throughout.
- 12-column responsive grid on desktop (Wholesaler/Admin dashboards); single-column, thumb-first layout below 768px (Retailer/Delivery Partner, who are primarily mobile-web users).
- Minimum tap target: 44×44px everywhere — non-negotiable for the Delivery Partner role, who will be tapping while walking/holding goods.

### 2.4 Elevation & Shape
- Flat by default (`line` borders, not shadows) for dashboard density — shadows reserved only for transient layers: modals, toasts, the assignment-offer card.
- Corner radius: 8px for cards/inputs, 999px (full pill) only for status badges — this distinction itself is meaningful: pills are *always* a state indicator, rectangles are *always* content.

---

## 3. Motion Principles (Framer Motion)

Motion here has a job: **make state change felt, not just seen.** Three deliberate uses, nothing scattered beyond them:

1. **The threaded status line draws forward** — when an order transitions state, the line animates from the previous node to the new one (300–400ms, ease-out), rather than the new step simply appearing. This is the platform's one orchestrated, memorable motion moment — used identically in the Retailer's tracking screen, the Wholesaler's order detail, and the Admin's audit view.
2. **Live position interpolation** — the delivery partner's map marker eases between location pings rather than snapping, so movement reads as continuous travel, not a series of jumps.
3. **Arrival/urgency feedback** — new items entering a queue (Wholesaler's incoming orders, Delivery Partner's assignment offer) slide/fade in at the top; an assignment countdown gently pulses only in its final 20% of remaining time, so urgency is earned, not constant.

Everything else — buttons, modals, tabs — uses fast, quiet transitions (150–200ms) that get out of the way. **Reduced-motion preference is respected everywhere**: the threaded line still updates instantly, just without the draw animation.

---

## 4. Role-Specific Design Considerations

### 4.1 Retailer — Clarity over density
- Optimized for a single question at a time: "what's happening with my order."
- Generous whitespace, large status displays, minimal simultaneous information.
- Shop browsing uses real photography-forward cards (shop photo, not icon), since trust in a physical shop is built visually.

### 4.2 Wholesaler — Density with triage
- This is a working queue, used all day — density is a feature, not a flaw, but **triage must be instant**: incoming orders are visually distinct by urgency (a new PLACED order and an overdue COD confirmation should never look like the same weight of item in a list).
- Approve/Reject are the two highest-frequency actions on the whole platform — they get the largest, highest-contrast buttons on every relevant screen, always in the same position, so the action becomes muscle memory.

### 4.3 Delivery Partner — Outdoor-readable, one-hand
- Highest contrast ratios on the platform (this role is used in direct sunlight, in motion).
- One primary action per screen, always bottom-anchored within thumb reach (Navigate / Confirm Pickup / Confirm Delivery / Mark Cash Collected) — never more than one high-emphasis CTA visible at once, to prevent a mis-tap mid-delivery.
- OTP entry uses large, individually-boxed digit inputs (monospace, auto-advancing) — legible and error-resistant when typed quickly at a doorstep.

### 4.4 Admin — Signal over volume
- The busiest surface, but its job is to surface *exceptions*, not to display everything. Default views are pre-filtered to "needs attention" (escalations, disputes, pending approvals) — the full unfiltered data is one click away, never the default.
- The audit trail view uses the same threaded-line motif as the retailer's tracking screen — deliberately, so an admin investigating a dispute is reading the *exact same visual object* the retailer saw, just with more detail exposed.

---

## 5. Component Patterns

| Component | Behavior |
|---|---|
| **Status Badge** | Pill shape, semantic color, always paired with a plain-language label (never color alone — colorblind-safe by design) |
| **Threaded Timeline** | Horizontal (desktop) / vertical (mobile) line connecting state nodes; completed segments solid, current node emphasized, future segments dotted/muted |
| **Order Card** | Shop/retailer name, item count, total value, status badge, single primary action — never more than one competing CTA per card |
| **OTP Input** | 6 individually boxed digits, auto-advance, monospace, large touch targets, paste-friendly |
| **Ledger Row** | Amount in tabular monospace, status pill, "Confirm" action inline for wholesaler view |
| **Empty State** | Always names what's missing and gives the one action that fills it (e.g., "No items yet — add your first product" not "No data") |
| **Error / Rejection Reason** | Stated plainly, in the interface's voice, with the corrective action immediately visible (e.g., "Rejected — stock unavailable. The retailer has been notified.") |

---

## 6. Writing & Tone

- **Plain, active, specific.** A button says exactly what happens: "Confirm pickup," not "Submit." A confirmation echoes the same verb: "Pickup confirmed."
- **Named by what people do, not how the system works.** "Cash collected" not "COD state updated." "Assign delivery partner" not "trigger dispatch engine."
- **Errors state fact and fix, never apologize vaguely.** "This order can't be cancelled — it's already been packed. Raise a dispute instead of cancelling." 
- **Numbers are never rounded away from precision** in ledger/payment contexts — exact amounts, always in the monospace numeral style, always with currency unit shown.

---

## 7. Accessibility & Quality Floor

- WCAG AA contrast minimum across all text, higher for the Delivery Partner surface specifically (outdoor use).
- Visible keyboard focus states on every interactive element (Wholesaler/Admin dashboards are desktop-capable and may be keyboard-navigated).
- Color never the sole carrier of meaning — every status pill carries a text label.
- Reduced-motion respected platform-wide (see §3).
- Responsive down to a 360px-wide mobile viewport for Retailer and Delivery Partner surfaces.

---

## 8. What This Design Deliberately Avoids
- No decorative gradients, no glassmorphism, no dashboard-template card shadows — this is a working tool, not a landing page.
- No numbered-step badges (01/02/03) used decoratively — the *only* sequential/numbered device on the platform is the threaded status line itself, because that is the one place where order genuinely carries information.
- No single component reused for two different meanings — one visual pattern, one job, everywhere.
