# Phase 14: Compliance and Data Governance

33. **Design compliance for external integrations.** Data shared with external systems creates compliance obligations:

    **Data processing agreements**:
    - If you share personal data (PII) with an external service provider, a Data Processing Agreement (DPA) is required under GDPR. Most major providers offer a DPA — review and sign it.
    - The DPA should specify: what data is shared, how it is processed, data retention, data deletion obligations, sub-processors, breach notification requirements, and geographic data processing locations.

    **Data minimization**:
    - Send only the minimum data required by the external API. Do not send fields that the external API does not need.
    - If the external API requests optional fields that you consider sensitive, evaluate whether providing them is necessary for the integration's purpose.

    **Data residency**:
    - If your compliance requirements mandate data residency (data must stay in a specific region), verify that the external API processes data in the required region. Many APIs route data through US-based servers regardless of the customer's location.
    - Select the API's regional endpoint if available (Stripe EU, AWS regions, etc.).

    **Right to erasure across integrations**:
    - When a user requests data deletion (GDPR right to erasure), you must also delete their data from external systems where you sent it.
    - Maintain an integration data map: for each external system, what user data was sent and how to request deletion. Many APIs provide deletion endpoints (Stripe customer deletion, Salesforce record deletion).
    - Document the deletion process for each integration. Track deletion requests and confirmations.

    **Audit trail for external data sharing**:
    - Log what data was sent to each external system, when, and for what purpose.
    - This is required for: GDPR accountability (Article 30 records of processing), SOC 2 (data flow documentation), and HIPAA (disclosure tracking for PHI).