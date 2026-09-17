# Phase 1: Integration Requirements Discovery

1. **Identify the integration and its purpose.** Before any design, establish what external system is being integrated and why. If the user has not clearly stated this, ask: "What external system are you integrating with, what business capability does it provide, and what does your system need to send to or receive from it?" Do not design an integration without understanding its purpose.

   Establish the following:
   - **External system**: Name, type (payment gateway, email service, CRM, shipping API, AI/ML provider, identity provider, analytics platform, government/regulatory API), and vendor.
   - **Integration purpose**: What business capability does this integration provide that you are not building in-house? (Process payments, send emails, verify identities, calculate shipping rates, generate AI content, synchronize customer data with CRM.)
   - **Integration criticality**: What happens if this integration is unavailable for 5 minutes? 1 hour? 24 hours?
     - **Critical path**: The user-facing operation cannot complete without this integration (payment processing during checkout — user cannot pay). System must handle failures with immediate user-facing feedback and recovery mechanisms.
     - **Important but deferrable**: The operation should happen but can be delayed (sending order confirmation email — user completes checkout, email sent later). System must queue and retry.
     - **Non-critical**: The operation is a convenience or enhancement (syncing data to analytics platform, enriching records with third-party data). System should continue normally if the integration fails.
   - **Integration direction**: Is your system consuming (calling the external API), providing (receiving webhooks/callbacks from the external system), or both?
   - **Data flow**: What data goes to the external system? What data comes back? Is sensitive data involved (PII, financial data, health records)?

2. **Catalog all integration touchpoints.** For each external system, document every interaction:

   | ID | External System | Operation | Direction | Trigger | Sync/Async | Criticality | Data Sent | Data Received | Frequency |
   |---|---|---|---|---|---|---|---|---|---|
   | I-001 | Stripe | Create payment intent | Outbound call | User checkout | Sync | Critical | Amount, currency, customer | Payment intent ID, client secret | 500/hour peak |
   | I-002 | Stripe | Webhook: payment succeeded | Inbound webhook | Payment completion | Async | Critical | — | Payment ID, amount, status | 500/hour peak |
   | I-003 | SendGrid | Send transactional email | Outbound call | Order events | Async | Important | Recipient, template, data | Message ID, status | 2000/hour peak |
   | I-004 | Shippo | Get shipping rates | Outbound call | Cart calculation | Sync | Critical | Origin, destination, weight | Rate quotes | 300/hour peak |
   | I-005 | Salesforce | Sync customer data | Outbound call | Customer update | Async | Non-critical | Customer record | Sync status | 100/hour |
   | I-006 | Twilio | Send SMS verification | Outbound call | User registration | Sync | Critical | Phone number, code | Message SID | 200/hour |

3. **Evaluate the external API.** Before building an integration, assess the external API's quality and operational characteristics:

   **API documentation quality**:
   - Is the documentation comprehensive, accurate, and up to date?
   - Are there working code examples in relevant languages?
   - Is there an API reference with request/response schemas for every endpoint?
   - Are error codes and error responses documented?
   - Are rate limits documented?
   - Is there a changelog or migration guide for API version changes?

   **API reliability and operational characteristics**:
   - **Availability**: Does the provider publish an SLA? What is their historical uptime (check status page history, Downdetector)? Are there scheduled maintenance windows?
   - **Latency**: What is the typical response time (p50, p95, p99)? Does it vary by endpoint? Does it degrade under load?
   - **Rate limits**: What are the rate limits (per second, per minute, per day)? How are they communicated (response headers)? What happens when you exceed them (429 response, hard block, degraded service)?
   - **Idempotency support**: Does the API support idempotency keys for write operations? If you retry a failed request, will it produce duplicate effects?
   - **Webhooks**: Does the API provide webhooks for state changes? Are webhooks signed? What is the retry policy? Is there a webhook event log for debugging?
   - **Sandbox/test environment**: Is there a sandbox for testing without real side effects? How closely does the sandbox mirror production behavior?
   - **SDK availability**: Does the provider offer official SDKs in your language? Are they well-maintained?
   - **Support channels**: What support is available (email, chat, phone, dedicated account manager)? What are the response time expectations?

   **API maturity assessment**:
   - **Stable API**: Well-documented, versioned, rarely changes, deprecation notices provided in advance. Safe to build a tight integration.
   - **Evolving API**: Actively changing, new features and breaking changes occur regularly, documentation may lag behind. Build a defensive integration with an abstraction layer.
   - **Unstable/early API**: Poorly documented, frequent breaking changes, limited support. Build a thick abstraction layer and plan for significant maintenance. Consider whether the integration risk is worth the business value.

   Document this assessment. It directly affects the integration architecture: a stable, reliable API allows a simpler integration; an unstable, unreliable API requires more defensive coding, thicker abstraction, and more monitoring.

4. **Evaluate build vs. buy vs. integrate.** Before integrating with a specific vendor, consider alternatives:

   - **Build in-house**: Is the capability simple enough to build internally? (Sending emails via SMTP is simpler than integrating a full email marketing platform.) Build only if the capability is core to your business and you can maintain it long-term.
   - **Direct API integration**: Build a custom integration with the vendor's API. Maximum control, maximum effort. Recommended when the integration is complex, performance-sensitive, or requires custom logic.
   - **Official SDK**: Use the vendor's official SDK. Less code, vendor-maintained, but creates a dependency on the SDK's quality and update cadence. Recommended when the SDK is well-maintained and covers your use cases.
   - **iPaaS / integration platform**: Use a platform like Zapier, Tray.io, Workato, or MuleSoft to connect systems without custom code. Recommended for non-critical, low-volume integrations where speed of implementation matters more than performance or customization. Not recommended for critical-path, high-volume, or latency-sensitive integrations.
   - **Unified API services**: Use an aggregation service (Merge, Nango, Vessel, Alloy) that provides a single API abstracting multiple vendors in a category (e.g., one API for all CRMs). Recommended when you need to integrate with multiple vendors in the same category and want to avoid building N separate integrations.

   State the decision and justification: "Use Stripe's official Node.js SDK for payment processing because the SDK is well-maintained, handles authentication and retries, and covers all our payment use cases. Building a custom HTTP client would duplicate effort. Using an iPaaS is not appropriate because payment processing is critical-path and requires sub-second latency."
