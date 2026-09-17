# Notice & Consent Engineering

This reference backs **Phase 3** of the main `SKILL.md`. It gives the agent the drafting spec for a section 5 notice, the just-in-time/layered notice patterns, the consent-engineering requirements (FISU-UW), a dark-pattern catalog, and the consent-record schema. Every item is tied to its DPDPA section or DPDP Rule.

---

## 1. The Section 5 Notice

Section 5 requires a Data Fiduciary to give the Data Principal a notice at or before the commencement of processing, in clear and plain language, informing her of:

| # | Item | Source | What the product must show |
|---|------|--------|---------------------------|
| 1 | The personal data sought to be processed and the purpose of such processing | Sec 5(a) | A specific list of fields collected and a specific purpose per field (no vague "to improve our services") |
| 2 | How she may exercise rights to access and correction | Sec 5(b), 11, 12 | URL/email to request access, request correction; response timeline |
| 3 | How she may make a complaint to the Board | Sec 5(c) | Right to complain to the Data Protection Board of India, with the Board's contact route |
| 4 | How she may exercise rights to erasure/grievance and nomination | Sec 5(d), 13, 14 | Withdraw-consent and erasure path; nomination mechanism |
| 5 | Any other information prescribed | Sec 5(e) | Additional items as the Rules may prescribe (e.g., transfer/retention details where notified) |

**Language requirement (Sec 5(3)):** The Data Fiduciary must give the Data Principal the option to access the notice in English or any language specified in the Eighth Schedule to the Constitution. For an India-facing product, provide English plus Hindi at minimum; where feasible, the notice should be available in the Eighth Schedule languages your users actually speak.

**Clear and plain language:** write for an 8th-grade reader — active voice, short sentences (15–20 words), no jargon, concrete examples. Replace "we process your personally identifiable information" with "we collect your name and email to send you your order confirmation." No buried fine print; important conditions must be prominent.

### Section 5 notice template (product-ready)

```
PRIVACY NOTICE — last updated [date]

1. WHAT WE COLLECT AND WHY
   • [field] — collected for [specific purpose]
   • [field] — collected for [specific purpose]

2. YOUR RIGHTS
   • Access: [URL or email] — we respond within [days]
   • Correction: update in account settings or [email]
   • Erasure / withdraw consent: [URL or email]
   • Nominate a representative: [URL or email]
   • Response timeline for rights requests: [days]

3. COMPLAINTS TO THE BOARD
   You may also complain to the Data Protection Board of India at [Board route].

4. GRIEVANCE / CONTACT
   Grievance officer / DPO: [name], [email], [address]
```

## 2. Just-in-Time (JIT) and Layered Notices

The proviso to section 5 allows consent to be obtained by a just-in-time notice alongside a mechanism to access the full notice. This is the pattern to implement at every collection point.

**A valid JIT notice needs:**
1. Core info — what data and why, in 2–4 short bullets (Sec 5(a)).
2. A link/button to the full section 5 notice.
3. A clear, non-coerced consent or decline control (Sec 6).
4. Correct timing — shown before or at the moment of data collection, before any data leaves the device.

**Layered structure:**

| Layer | Content | When | Length |
|-------|---------|------|--------|
| JIT notice | essential data + purpose + choice | at collection point | 50–150 words |
| Short notice | summary of all 5(a)–(e) items | on "Learn more" | 300–500 words |
| Full notice | complete disclosure | on "Full privacy policy" | any |

**Timing is non-negotiable.** Collection is the first act of processing. A banner that appears after cookies have already been set, or an "accept by continuing to browse" pattern, violates sections 5 and 6 because notice and consent come after processing started. The cookie banner must appear immediately and block all non-essential trackers until the user affirmatively consents.

## 3. Consent Engineering (FISU-UW)

Section 6(1) — consent must be **Free, Informed, Specific, Unconditional, Unambiguous, Withdrawable**. All six are cumulative; failing any one invalidates consent.

- **Free (6(1)(a)):** no deception, no manipulation, no making consent a precondition for provision of a good/service, no differential treatment. If the service genuinely cannot function without a piece of data (e.g., a delivery address for a food delivery), bundling that necessary data is permissible; bundling unrelated data is not.
- **Informed (6(1)(c)):** the section 5 notice must be provided *before* consent is requested. Order: notice → consent → processing.
- **Specific (6(1)(b)):** consent is limited to the specified purpose and the data necessary for it. A purpose change requires fresh consent and a fresh notice.
- **Unconditional (6(1)(d)):** no hidden terms or conditions buried in fine print; no conditions that constitute a manipulative practice.
- **Unambiguous (6(1)(e)):** expressed by a clear affirmative action — an "I agree" button, an unchecked checkbox the user checks, a toggle. Silence, inaction, pre-checked boxes, scrolling, or continued use are NOT consent.
- **Withdrawable (6(1)(f) + (4)):** withdrawal must be as easy as giving consent, and processed within a comparable timeline. One-click in → one-click out. A checkbox+submit in → a settings toggle out. Never make withdrawal require phone calls or mail.

**Consent record schema** (to satisfy the burden of proof under section 6(10), the Data Fiduciary must be able to prove notice was given and consent obtained):

```
consent_record {
  data_principal_id,
  consent_id,              // unique per grant
  notice_version,          // links to the exact notice shown
  purposes[],              // the specific purposes consented to
  data_fields[],           // the data covered
  granted_at_utc,
  mechanism,               // e.g. "unchecked_checkbox_submit", "button_click"
  ip, user_agent,
  revoked_at_utc,          // null until withdrawn
  consent_manager_id       // if consent given via a Consent Manager (Sec 6(7))
}
```

Persist consent records immutably (append-only log or audit table), keep the notice version referenced, and make the record retrievable per data principal.

## 4. Dark-Pattern Catalog (must audit against these)

Rule 8 of the DPDP Rules prohibits dark patterns. Section 6(1)(a) invalidates consent obtained through deceptive or manipulative design. Audit every consent surface for:

| Pattern | What it looks like | Why it fails |
|---------|-------------------|--------------|
| Confirm-shaming | "No, I don't care about my privacy" as the decline option | manipulative (6(1)(a)) |
| Roach motel | one-click consent, onerous multi-step withdrawal | asymmetric withdrawal (6(1)(f)) |
| Interface interference | large green "Accept all", tiny grey "Reject" | manipulative design (6(1)(a)) |
| Pre-checked boxes | "☑ I consent to marketing" pre-ticked | not affirmative action (6(1)(e)) |
| Bundling | accept tracking or you can't use the app | precondition coercion (6(1)(a), (d)) |
| Continued-use consent | "by continuing you agree to our privacy policy" | implied consent, no affirmative action (6(1)(e)); late notice (Sec 5) |
| Nagging | repeat the consent prompt until the user relents | coercive persistence (6(1)(a)) |
| Urgency/scarcity | "accept now or the offer expires" | manipulative time pressure (6(1)(a)) |
| Hidden fine print | key conditions buried in terms | unconditional fails (6(1)(d)) |
| Trick questions | double negatives that confuse choice | not unambiguous (6(1)(e)) |

## 5. Consent Manager Route (Sec 6(7)–(9))

Data Principals may give, manage, review, or withdraw consent through a Consent Manager registered with the Board. If the product opts into the consent-manager model, integrate with a registered consent manager so users can manage consent there; the consent manager is accountable to the Data Principal. Consent-manager registration provisions come into force one year after gazette notification; build the integration capability now.

## 6. Section 5 / 6 Compliance Checklist

- [ ] Notice drafted covering all five items in the section 5 table above.
- [ ] Notice available in English and at least Hindi (or the Eighth Schedule languages relevant to your users).
- [ ] Notice is plain language (8th-grade readable, no jargon, concrete examples).
- [ ] JIT notice + full-notice link at every collection point.
- [ ] Notice shown before any data is collected; trackers blocked until consent.
- [ ] No pre-checked boxes; every consent requires affirmative action.
- [ ] No bundling of unrelated processing as a service precondition.
- [ ] Withdrawal is as easy as giving consent and processed on a comparable timeline.
- [ ] Consent records stored immutably with notice version, purposes, timestamp, mechanism.
- [ ] Dark-pattern audit passed (no items from the catalog present).
- [ ] Consent Manager integration considered for the model under section 6(7).
