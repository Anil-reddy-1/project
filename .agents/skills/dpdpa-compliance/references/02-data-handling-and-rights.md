# Data Handling, Rights, Security & Breach Readiness

This reference backs **Phases 4 and 5** of the main `SKILL.md`: data principal rights workflows, grievance redressal, children's data safeguards, security safeguards, retention, and breach intimation. Each item is tied to its DPDPA section or DPDP Rule.

---

## 1. Data Principal Rights (Sections 11–14)

The Data Principal holds enforceable rights over her personal data. Engineering each right into the product requires a request channel, authentication, a response timeline, and an evidence log.

### 1.1 Right to access information (Sec 11)
The Data Principal may obtain from the Data Fiduciary a summary of the personal data processed, the processing purposes, recipients, and any other prescribed information.

**Product control:** a "Download my data" / "Access my data" flow returning a structured summary of the user's data (fields, purposes, recipients, categories), delivered in a portable format (JSON/CSV) or online view. Authenticate the requester, log the request, and respond within the prescribed timeline.

### 1.2 Right to correction and erasure (Sec 12)
The Data Principal may request correction or erasure of inaccurate/misleading/incomplete/outdated personal data. The Data Fiduciary must complete correction/erasure within a reasonable period, inform the principal of the action taken, and cause any Data Processor to erase/correct its copy.

**Product control:** account-settings editing for self-serve correction; a deletion request flow that removes the user's personal data across the primary store, derived stores, backups (within the documented backup retention), logs, and third-party processors. Design erasure as a coordinated process across all systems that hold the data — not a single row delete.

### 1.3 Right of grievance redressal (Sec 13)
A Data Principal aggrieved by a Data Fiduciary's actions may complain to the Data Fiduciary's grievance officer; the Data Fiduciary must acknowledge within a specified period and resolve within a specified further period.

**Product control:** a grievance channel (form/email) pointing at the named grievance officer; an auto-acknowledgement on receipt; a resolution SLA; a case log. Publish the officer's contact per Rule 9.

### 1.4 Right to nominate (Sec 14)
A Data Principal may nominate another individual to exercise her rights after her death or incapacity.

**Product control:** a nomination form capturing the nominee's details, and a mechanism for the nominee to present the nomination when the time comes. Store nominations and validate them against authenticated requests.

### 1.5 Consent withdrawal propagation (Sec 6(4)–(6))
On withdrawal, the Data Fiduciary must within a reasonable time cease — and cause its Data Processors to cease — processing, unless continued processing without consent is required or authorised by law.

**Product control:** a withdrawal toggle that propagates to every consumer of the data (analytics, email tools, CRM, payment processors for non-essential purposes). Log the withdrawal and the propagation result.

## 2. Grievance Officer / DPO Contact (Rule 9)

Rule 9 requires the Data Fiduciary to make available the contact information of a person authorised to answer questions about data processing and handle grievances. Where applicable (notably SDFs), a Data Protection Officer is required (Sec 10, Rule 13).

**Product control:** publish grievance-officer/DPO name, email, and physical address in the notice and in the product footer; wire the address into the grievance flow.

## 3. Children's Data (Sec 9, Rules 10–12)

A child is any person under 18 (Sec 2(k)). The Act treats children as needing heightened protection.

**Requirements:**
- **Verifiable parental consent** must be obtained before processing a child's personal data (Sec 9(1), Rule 10). "Verifiable" means the Data Fiduciary has a reasonable basis to believe the consenting individual is the parent or lawful guardian — methods under Rule 10 include a valid payment instrument, government-issued ID verification, a fit-for-purpose age/ID verification service, or equivalent verifiable means. A bare "I am the parent" checkbox is not sufficient.
- **Absolute prohibitions:** no tracking or behavioural monitoring of children, and no targeted advertising directed at children (Sec 9(3); also Sec 6(2)–(3)). These apply even where parental consent was obtained, except for exemptions under Schedule IV.
- **Guidance for children:** the Data Fiduciary should also ensure that processing of children's data and any notice/consent are framed to be understood by a child, using simple language.

**Product controls:**
- Age gate at registration/entry that does not silently collect the DOB as personal data; block under-18 users from child-covered account flows, or route them to a parental-consent flow.
- Verifiable parental consent flow: parent verifies via an accepted Rule 10 method, consents, and can manage/withdraw that consent.
- A "child-safe" processing boundary: no cross-site trackers, no behaviour profiling, no interest-based ad delivery to child sessions. Treat all users as children if the product is likely to attract children — the safest posture.
- Exemption checks against Schedule IV before applying obligations where the Act permits.

## 4. Reasonable Security Safeguards (Sec 8(5), Rule 6)

The Data Fiduciary must implement reasonable security safeguards to prevent personal data breaches, proportional to the volume, nature, and sensitivity of the data and the purposes of processing.

**Product controls (compose with the security skill for the threat-informed detail):**
- Encryption in transit (TLS everywhere) and at rest (database, object storage, backups).
- Access control with least privilege, per-service credentials, and access reviews.
- Identity verification of data principals before acting on rights requests.
- Regular security audits and vulnerability management.
- Logging and monitoring of access to personal data.
- Secure development lifecycle, secrets management, and dependency hygiene.

## 5. Retention and Erasure (Sec 8(7), Rule 8, Schedule III)

The Data Fiduciary must erase personal data once the specified purpose is no longer served, unless retention is required by law. Rule 8 defines when a purpose is deemed to be no longer served and, with Schedule III, sets out classes of data fiduciaries, purposes, and time periods.

**Product controls:**
- A documented retention schedule per data category tied to purpose (e.g., newsletter subscriber data deleted on unsubscribe; analytics identifiers anonymised after N days; transactional records kept for the legal/financial period).
- Automated deletion/anonymisation jobs (cron, queue-based, or storage lifecycle rules) that enforce the schedule.
- Design deletion from day one: database records, backups, derived/aggregated stores, caches, CDN, and third-party processors all covered.
- Legal-hold exception handling where retention is required by another law.

## 6. Breach Intimation (Sec 8(6), Rule 7)

On a personal data breach, the Data Fiduciary must intimate the Board and each affected Data Principal in the prescribed manner and within the prescribed timeline, including the breach's nature, extent, consequences, and the measures taken to mitigate.

**Product controls:**
- A breach runbook: detection (monitoring/alerting), triage and verification of the breach, impact assessment (nature, extent, sensitivity, likelihood and severity of harm), and notification decisioning.
- Notification templates for the Board and for affected Data Principals, covering the Rule 7 items.
- An incident log and the notification record (evidence of compliance).
- Coordination with Data Processors to ensure they report breaches to the fiduciary promptly.

## 7. Data Processor Relationship

When a processor handles data on the fiduciary's behalf: the fiduciary must have a binding arrangement obligating the processor to process only as instructed and to implement safeguards; on breach, the processor intimates the fiduciary. Vendor DPIAs and processor audits fall under SDF obligations where applicable (Sec 10, Rule 13).

## 8. Rights / Security / Breach Checklist

- [ ] Access flow returns a structured summary of the user's data (fields, purposes, recipients).
- [ ] Correction flow (self-serve where possible) and erasure flow across all stores, backups, logs, and processors.
- [ ] Grievance channel with named officer, auto-acknowledgement, and resolution SLA.
- [ ] Nomination form and nominee validation mechanism.
- [ ] Withdrawal propagates to all processors/consumers; log maintained.
- [ ] Grievance officer / DPO contact published per Rule 9.
- [ ] If children may be in scope: age gate, verifiable parental consent (Rule 10 method), no tracking/behavioural monitoring/targeted ads to children.
- [ ] Encryption at rest and in transit; least-privilege access; audits scheduled.
- [ ] Retention schedule documented per purpose and automated.
- [ ] Breach runbook + Board/Data Principal notification templates ready.
- [ ] Processor arrangements signed and breach-reporting clauses present.
