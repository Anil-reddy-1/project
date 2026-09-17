# Phase 7: Authentication with External Services

21. **Design authentication for each external integration.** Each external API has its own authentication mechanism. Configure it correctly and securely:

    **API key authentication**:
    - Store the API key in a secrets manager (Vault, AWS Secrets Manager). Never in code, config files, or environment variables baked into container images.
    - Pass the key in the header specified by the API documentation (`Authorization: Bearer sk_live_xxx`, `X-API-Key: xxx`, or a custom header).
    - **Separate keys per environment**: Use test/sandbox keys for development and staging, live/production keys only in production. This prevents accidental real charges, real emails, or real data modifications during testing.
    - **Key rotation**: Track key expiry. Rotate before expiry. During rotation, both old and new keys may be valid — verify with the provider. Automate rotation when possible.

    **OAuth 2.0 Client Credentials** (service-to-service):
    - Your application authenticates with `client_id` and `client_secret` to obtain an access token, then uses the access token for API calls.
    - **Token management**:
      - Cache the access token until it expires (minus a buffer, e.g., expire 5 minutes early to avoid race conditions).
      - On 401 response, refresh the token and retry the request once.
      - Thread-safe token refresh: If multiple threads detect token expiry simultaneously, only one should refresh — others should wait for the new token. Use a mutex/lock around token refresh.
    - Store `client_id` and `client_secret` in secrets manager.

    **OAuth 2.0 Authorization Code** (user-delegated access):
    - Used when your application accesses external APIs on behalf of your users (e.g., connecting a user's Google Sheets, Salesforce account, or social media profiles).
    - **Flow**: User authorizes → your app receives authorization code → exchange for access token + refresh token → store tokens securely → use access token for API calls → refresh when expired.
    - **Token storage**: Store access tokens and refresh tokens encrypted in the database, associated with the user account. These are user credentials — treat with the same security as passwords.
    - **Token refresh**: Implement automatic token refresh when the access token expires. Handle refresh token expiry or revocation (user revoked access in the external system) — notify the user to re-authorize.
    - **Scope minimization**: Request only the OAuth scopes your integration actually needs. Excessive scopes create security risk and may cause users to deny authorization.

    **HMAC signature authentication**:
    - Some APIs (AWS, many payment APIs) require signing each request with HMAC. The signature is computed from the request method, URL, headers, body, timestamp, and a secret key.
    - Use the provider's official SDK — HMAC signing is complex and easy to get wrong. If implementing manually, follow the provider's documentation precisely and test against their signature verification examples.

    **Mutual TLS (mTLS)**:
    - Some B2B and financial APIs require mutual TLS. Your application presents a client certificate, and the server verifies it.
    - Manage client certificates: issuance, storage (secrets manager), rotation, and revocation.
    - Configure the HTTP client to present the client certificate during TLS handshake.

    **IP allowlisting**:
    - Some APIs restrict access to requests from known IP addresses. Register your application's egress IPs (NAT Gateway, proxy server, or cloud provider's static IPs) with the provider.
    - If using auto-scaling or serverless, use a NAT Gateway or forward proxy with a static IP for external API calls.