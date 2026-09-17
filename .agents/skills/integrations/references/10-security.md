# Phase 10: Integration Security

26. **Design security for external integrations.** Integrations introduce unique security risks because you are exchanging data with systems you do not control:

    **Credential security**:
    - All external API credentials (keys, secrets, tokens, certificates) in secrets manager. (See Phase 7 for authentication details.)
    - Rotate credentials on a schedule and immediately after suspected compromise.
    - Monitor for credential leaks (GitHub secret scanning, GitGuardian).
    - Use separate credentials per environment (development, staging, production). Never use production credentials in non-production environments.

    **Data in transit**:
    - All external API calls must use HTTPS/TLS. Reject HTTP endpoints. Verify TLS certificates (do not disable certificate verification, even in development — use proper test certificates).
    - For highly sensitive data (financial, healthcare), verify the external API's TLS configuration meets your security requirements (TLS 1.2+, strong cipher suites).

    **Input validation from external systems**:
    - **Never trust data from external systems.** Webhook payloads, API responses, and synchronized data from external systems are untrusted input — validate and sanitize as rigorously as user input.
    - Validate: data types, required fields, value ranges, string lengths, and format constraints. An external API returning unexpected data should not crash your system or corrupt your database.
    - **Injection prevention**: External data that is stored in your database must be parameterized (prevent SQL injection). External data that is displayed to users must be output-encoded (prevent XSS). External data used in file operations must be sanitized (prevent path traversal).

    **Webhook endpoint security**:
    - Webhook signature verification (step 18) is mandatory.
    - Rate-limit the webhook endpoint to prevent abuse (e.g., max 1000 requests/minute per provider).
    - Do not expose webhook processing details in error responses (return 200 or 401, never detailed error messages that help an attacker craft valid-looking webhooks).
    - Restrict webhook endpoints to known provider IP ranges if the provider publishes them (Stripe, GitHub publish their webhook source IPs).

    **Minimizing data exposure to external systems**:
    - Send only the minimum data required by the external API. Do not send your full customer record to a shipping API that only needs the shipping address.
    - If the external API stores data (CRM, analytics), understand their data retention and deletion policies. Ensure they comply with your privacy obligations (GDPR, CCPA).
    - If the external API processes sensitive data (payment processor handling card numbers), verify they are compliant with relevant standards (PCI-DSS for payment data, HIPAA for health data).

    **Third-party SDK security**:
    - If using a vendor's SDK, treat it as a third-party dependency: scan for vulnerabilities, keep updated, and pin to specific versions.
    - Review the SDK's permissions and network behavior. Some SDKs phone home with telemetry — verify this is acceptable.
    - If the SDK requires broad permissions (access to environment variables, file system, network), evaluate whether the risk is acceptable. Consider wrapping the SDK in a sandboxed service if the trust level is low.