# Section-to-Control Mapping, Penalties & Enforcement Timeline

This reference backs **Phase 6 (Verify)** of the main `SKILL.md`. It is the agent's section-by-section checklist: for each applicable DPDPA section, the required control, the source rule, and the evidence that demonstrates compliance. It also records the penalty schedule and the enforcement timeline so the agent can correctly scope urgency.

---

## 1. Section-to-Control Map

| DPDPA Section | DPDP Rule | Obligation | Concrete control | Evidence |
|---------------|-----------|------------|------------------|----------|
| 4 | — | Processing only on a lawful basis: consent or a section 7 legitimate use | Per-activity lawful-basis determination; consent basis or documented legitimate-use justification | Processing-basis register |
| 5 | 3 | Notice at/before processing; clear & plain language; 5(a)–(e) content; English + Eighth Schedule option; JIT notices permitted | Privacy notice page, JIT notices at collection points, notice versioning, language selector | Notice versions, delivery logs |
| 6 | 4 (consent managers) | Consent free/specific/informed/unconditional/unambiguous; affirmative action; no pre-checked boxes; withdrawal as easy as giving; burden of proof on fiduciary | FISU-UW consent UX, no dark patterns, symmetrical opt-out, consent-record store | Consent records (who/what/version/timestamp/mechanism) |
| 7 | — | Certain legitimate uses (state functions, legal claims, employment, user-requested service, medical/emergency, etc.) | Legitimate-use justifications for non-consent processing | Per-activity justification record |
| 8 | 6, 7, 8, 9 | General obligations: security safeguards, breach intimation, retention/erasure, grievance redressal, DPO contact | Encryption, access control, breach runbook, retention schedule, grievance channel, published contact | Audit reports, retention jobs, grievance log, notice |
| 9 | 10, 11, 12 | Children (<18): verifiable parental consent; no tracking/behavioural monitoring/targeted ads to children | Age gate, verifiable parental consent flow (Rule 10 method), child-safe processing boundary | Parental consent records, no-tracker attestation |
| 10 | 13 | SDF additional obligations: DPO, DPIA, annual auditor, compliance reporting | DPO appointment, DPIA records, independent audit, reports | DPIA doc, auditor report |
| 11 | 14 | Right to access information about personal data | Access/download-my-data flow | Request log, delivered artifacts |
| 12 | 14 | Right to correction and erasure | Correction + coordinated erasure flows across stores/processors | Request log, deletion confirmations |
| 13 | 14 | Right of grievance redressal | Grievance channel, named officer, acknowledgement + resolution timelines | Acknowledged complaints, SLA record |
| 14 | — | Right to nominate | Nomination form + validation | Nomination records |
| 15 | — | Duties of Data Principal | Inform principal of duties in the notice (accuracy, lawful disclosure) | Notice text |
| 16 | 15 | Cross-border transfer only to notified countries | Transfer assessment; constraint flag for unnotified destinations | Transfer assessment record |
| 17 | — | Exemptions | Document which exemptions apply to which processing | Exemption register |
| 33 + Schedule | — | Penalties (see section 2 below) | Controls above are the mitigation | All evidence above |

## 2. Penalty Schedule (Section 33 read with the Schedule)

Penalties are determined by the Data Protection Board of India per violation. The headline figures to cite when scoping risk:

| Non-compliance | Penalty (up to) |
|----------------|-----------------|
| Failure to take reasonable security safeguards to prevent a personal data breach | ₹250 crore |
| Failure of a Data Fiduciary to comply with the Act/Rules in any other respect | ₹250 crore (schedule-linked; per-item maxima apply) |
| Additional per-instance/adjudicated penalties as the Board determines in relation to the child-related, notice, and consent obligations | As adjudged |

The agent should present penalties as risk framing ("up to ₹X per violation, adjudged by the Board") and never as legal advice. The precise per-item schedule figures should be verified against the current Schedule text before being quoted in deliverables.

## 3. Enforcement Timeline (as notified by gazette)

The DPDPA's provisions come into force in staggered phases. The agent should scope urgency accordingly while still building to the full Act:

| Effective | Provisions |
|-----------|-----------|
| On gazette notification date | Sec 1(2), Sec 2 (definitions), Secs 18–26 (Board), Secs 35, 38, 39, 40, 41, 42, 43, Sec 44(1), (3) |
| One year from gazette | Sec 6(9) and Sec 27(1)(d) (consent-manager registration and related Board powers) |
| Eighteen months from gazette | Secs 3–5, Sec 6(1)–(8) and (10), Secs 7–10, Secs 11–17, Sec 27 (except clause (d)), Secs 28–34, 36, 37, Sec 44(2) |

Consequence for the agent: core product obligations (notice, consent, rights, security, breach, retention, cross-border, children, SDF) are enforceable at the eighteen-month mark, but the controls should be implemented now so the product is ready when enforcement arrives. Rules under the DPDP Rules, 2025 follow the enforcement of the parent section.

## 4. Verification Checklist (Phase 6 output)

- [ ] Data inventory complete: every collection point, field, purpose, storage, recipient, retention.
- [ ] Role/classification determined: Data Fiduciary, processors identified, India applicability confirmed.
- [ ] Children exposure assessed; age gate + verifiable parental consent in place if applicable.
- [ ] Cross-border transfer assessment recorded; unnotified destinations flagged.
- [ ] SDF status assessed; DPO/DPIA/auditor in place if SDF.
- [ ] Section 5 notice exists, covers 5(a)–(e), plain language, language option available.
- [ ] JIT notices at every collection point; trackers blocked until consent.
- [ ] FISU-UW consent engineered; no pre-checked boxes; withdrawal as easy as giving.
- [ ] Consent records stored immutably (section 6(10) burden of proof).
- [ ] Dark-pattern audit passed.
- [ ] Rights flows (access/correction/erasure/grievance/nomination) implemented with logs.
- [ ] Grievance officer/DPO contact published (Rule 9).
- [ ] Reasonable security safeguards in place (Rule 6).
- [ ] Retention schedule documented and automated (Rule 8, Schedule III).
- [ ] Breach runbook + intimation templates ready (Rule 7).
- [ ] Every row in the section-to-control map is implemented-with-evidence, not-applicable, or listed as a gap with an owner.
