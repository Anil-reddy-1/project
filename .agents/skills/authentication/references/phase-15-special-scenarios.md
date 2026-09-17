# Phase 15: Authentication for Special Scenarios

### Phase 15: Authentication for Special Scenarios

39. **Design admin impersonation.** For support and debugging purposes, administrators may need to view the application as a specific user:

     - **Implementation**: The admin initiates impersonation via an admin interface. The system creates a special session that includes: `acting_as_user_id` (the impersonated user), `acting_on_behalf_of` (the admin's user ID), and a flag `is_impersonation = true`.
     - **Restrictions during impersonation**:
       - The impersonating admin cannot: change the user's password, change the user's MFA, delete the user's account, or perform financial transactions. Define a clear list of prohibited actions during impersonation.
       - The UI must show a clear, non-dismissible indicator that impersonation is active ("Viewing as user@example.com — [End impersonation]").
     - **Audit**: Log impersonation start and end (step 34). All actions performed during impersonation are logged with both the admin's and the impersonated user's identity.
     - **Authorization**: Only designated admin roles can impersonate. Require MFA re-verification before starting impersonation.
     - **Time limit**: Impersonation sessions expire after a short duration (e.g., 1 hour). Auto-terminate and alert if exceeded.

40. **Design authentication for webhooks and callbacks.** When your system receives callbacks from external systems:

     **Webhook signature verification**:
     - The sender (e.g., payment gateway) signs the webhook payload using HMAC-SHA256 with a shared secret.
     - Your system receives the webhook, computes the HMAC over the payload using the same secret, and compares it to the signature in the request header.
     - Use constant-time comparison to prevent timing attacks.
     - Verify the timestamp in the webhook payload to prevent replay attacks: reject webhooks with timestamps older than 5 minutes.

     **OAuth callback security**:
     - Validate the `state` parameter on OAuth callbacks (step 19).
     - Validate the authorization code can only be used once.
     - Validate the `redirect_uri` matches exactly — no open redirect vulnerabilities.
     - Register all valid `redirect_uri` values with the authorization server. Never allow wildcard redirect URIs in production.

41. **Design API key management.** For systems that issue API keys to third-party developers or internal services:

     **API key generation**:
     - Generate keys using CSPRNG: minimum 256 bits of entropy, base62 or base64url encoded.
     - Use a recognizable prefix: `sk_live_`, `pk_test_`, `myapp_` — helps identify the key source and environment in logs and code scans.
     - Display the full key only once at creation time. Store only the hash (SHA-256) in the database. If the user loses the key, they must generate a new one.

     **API key storage** (server-side):
     - Store: key_hash, key_prefix (first 8 characters for identification in UIs), user_id/org_id, name/description, scopes/permissions, created_at, last_used_at, expires_at, revoked flag.
     - Index on key_hash for fast lookup during authentication.

     **API key lifecycle**:
     - **Expiration**: API keys should have an optional expiration date. For keys without expiration, implement a staleness check — flag keys not used in 90 days and prompt the owner to confirm they are still needed.
     - **Rotation**: Allow users to create multiple keys simultaneously and deactivate old keys. This enables zero-downtime key rotation.
     - **Revocation**: Immediate revocation via the dashboard or API. Revocation takes effect on the next request (no delay like JWT expiry).
     - **Scoping**: Allow keys to be scoped to specific permissions (read-only, specific resources, specific environments). A key should have the minimum permissions needed.

     **API key security**:
     - Transmit API keys in headers (`Authorization: Bearer <key>` or `X-API-Key: <key>`), never in URL query parameters (they appear in logs, browser history, and referrer headers).
     - Rate-limit per API key.
     - Monitor for compromised keys: if a key appears in public repositories (GitHub secret scanning), alert the owner and consider automatic revocation.