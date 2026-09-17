# Phase 4: Token Design (JWT)

### Phase 4: Token Design (JWT)

9. **Design JWT structure and claims.** If using JWTs (for API authentication, OAuth access tokens, or OIDC ID tokens):

   **Header**:
   ```json
   {
     "alg": "RS256",
     "typ": "JWT",
     "kid": "key-2024-01"
   }
   ```
   - **`alg`**: The signing algorithm (see step 10).
   - **`typ`**: Always `"JWT"`.
   - **`kid`** (Key ID): Identifies which key was used to sign the token. Critical for key rotation — consumers look up the public key by `kid`.

   **Registered claims** (include these in every JWT):
   - **`iss` (Issuer)**: URL of the authentication service that issued the token. Example: `"https://auth.example.com"`. Consumers must validate this matches the expected issuer.
   - **`sub` (Subject)**: Unique, stable identifier for the authenticated entity. Use an opaque ID (UUID), not email or username (which can change). Example: `"usr_a1b2c3d4"`.
   - **`aud` (Audience)**: Intended recipient(s) of the token. Example: `"https://api.example.com"` or `["api.example.com", "admin.example.com"]`. Consumers must validate that their identifier is in the audience — a token intended for `api.example.com` must not be accepted by `payments.example.com`.
   - **`exp` (Expiration)**: Unix timestamp after which the token is invalid. Required. Never issue tokens without expiration.
   - **`iat` (Issued At)**: Unix timestamp when the token was issued.
   - **`nbf` (Not Before)**: Unix timestamp before which the token is not valid. Use when tokens are pre-generated.
   - **`jti` (JWT ID)**: Unique identifier for the token. Use for token revocation tracking and replay prevention.

   **Custom claims** — include only what consumers need for authorization decisions:
   - Keep claims minimal. Every claim increases token size, and tokens travel with every request.
   - Common custom claims: `"roles": ["admin", "editor"]`, `"org_id": "org_xyz"`, `"permissions": ["orders:read", "orders:write"]`, `"email": "user@example.com"` (only if consumers need it).
   - **Never include**: Passwords, full user profiles, sensitive PII (SSN, credit card), large data structures, or anything that changes frequently (forcing token reissuance).
   - **Distinguish token types**: If you issue both access tokens and refresh tokens as JWTs, include a claim to distinguish them: `"token_type": "access"` vs. `"token_type": "refresh"`. This prevents a refresh token from being used as an access token.

10. **Select the JWT signing algorithm.** This is a security-critical choice:

     **Asymmetric algorithms (recommended for most systems)**:
     - **RS256** (RSA + SHA-256): Widely supported, well-understood. The authentication service signs with a private key; consumers verify with the public key (published via JWKS endpoint). Recommended as the default when broad library compatibility is needed.
     - **ES256** (ECDSA + P-256 + SHA-256): Smaller keys and signatures than RSA (256-bit vs. 2048-bit), faster verification. Recommended when token size matters (mobile, IoT) or for new systems without legacy compatibility concerns.
     - **EdDSA** (Ed25519): Fastest, smallest signatures, strongest security properties. Recommended if all consumers support it (library support is growing but not yet universal).

     Asymmetric advantages: The private key never leaves the authentication service. Any service can verify tokens using the public key without needing a shared secret. Supports key rotation via JWKS.

     **Symmetric algorithms (use only for specific cases)**:
     - **HS256** (HMAC + SHA-256): Both the issuer and consumer share the same secret key. Simpler for single-service architectures where the same service issues and validates tokens.
     - Risk: Every service that validates tokens must have the signing key — any compromised service can forge tokens. Do not use in microservices architectures.

     **Never use**: `"alg": "none"`. Ensure the JWT library rejects tokens with `alg: none`. This is a well-known attack vector. Configure the library to accept only the specific algorithm(s) you use — never let the token's header dictate which algorithm to use for verification.

11. **Design token lifetimes.** Token lifetime is a direct tradeoff between security (shorter = less exposure window if token is stolen) and usability (shorter = more frequent re-authentication or refresh):

     **Access token lifetime**:
     - **API access tokens**: 15 minutes (default recommendation). Short enough to limit damage from token theft; long enough to avoid excessive refresh traffic.
     - **Server-to-server tokens**: 30-60 minutes. Service credentials are less likely to be stolen via browser/mobile vectors.
     - **Highly sensitive operations** (financial, health): 5 minutes. Pair with step-up authentication for critical actions.
     - Never exceed 1 hour for access tokens. If someone argues for longer, they need a refresh token flow, not a longer access token.

     **Refresh token lifetime**:
     - **Web applications**: 7-30 days. Balances session persistence with security.
     - **Mobile applications**: 30-90 days. Mobile users expect persistent sessions; pair with device binding and biometric unlock.
     - **Highly sensitive applications**: 1-7 days. Users re-authenticate more frequently.
     - Refresh tokens must be rotatable (see step 12).

     **ID token lifetime** (OIDC):
     - Short: 5-15 minutes. ID tokens prove authentication at a point in time. They should not be used as long-lived session tokens. The application should establish its own session after validating the ID token.

12. **Design refresh token mechanics.** Refresh tokens are the mechanism for obtaining new access tokens without re-authentication:

     **Refresh token rotation** (mandatory):
     - Every time a refresh token is used to obtain a new access token, issue a new refresh token and invalidate the old one.
     - If an invalidated refresh token is presented (indicating potential theft of either the old or new token), immediately revoke the entire refresh token family (all tokens descended from the same login) and force re-authentication. This is called **automatic reuse detection**.
     - Implementation: Store refresh tokens (or their hashes) in a database with a `family_id` linking all tokens from the same login session. When reuse is detected, invalidate all tokens with that `family_id`.

     **Refresh token storage**:
     - Store refresh tokens as hashed values (SHA-256) in the database. Never store plaintext refresh tokens — if the database is breached, stolen refresh tokens should not be usable.
     - Store metadata: user ID, device info, IP address, issued_at, expires_at, family_id, last_used_at, revoked status.

     **Refresh token binding**:
     - Bind refresh tokens to specific clients (client_id) and optionally to specific devices (device fingerprint, IP range). Reject refresh token use from a different client or drastically different network context.

13. **Design token revocation.** JWTs are stateless — they cannot be "revoked" in the traditional sense without introducing state. Design the revocation mechanism based on security requirements:

     **Option 1: Short access token lifetime + refresh token revocation (recommended default)**:
     - Access tokens are short-lived (15 minutes) and accepted without a server-side check.
     - Revocation targets refresh tokens: delete the refresh token from the database, so the user cannot obtain new access tokens.
     - Maximum exposure window: the remaining lifetime of the last-issued access token (up to 15 minutes).
     - Acceptable for most applications. If 15 minutes of exposure is too long, use Option 2.

     **Option 2: Token blacklist/denylist**:
     - Maintain a blacklist of revoked JWT `jti` values in a fast store (Redis).
     - Every token validation checks the blacklist. If the `jti` is blacklisted, reject the token.
     - Set the blacklist entry TTL to the token's remaining lifetime — no need to keep entries for expired tokens.
     - Cost: Adds a network round-trip (Redis lookup) to every authenticated request. Partially negates the "stateless" advantage of JWTs.
     - Use when immediate revocation is required (logout must be instant, compromised sessions must be killed immediately).

     **Option 3: Token versioning**:
     - Store a `token_version` counter per user in the database/cache. Include `token_version` in the JWT claims.
     - On revocation, increment the user's `token_version`. All tokens with the old version are instantly invalid.
     - Validation: Compare the JWT's `token_version` claim to the user's current version. Requires one fast lookup per request.
     - Advantage over blacklist: Revokes all of a user's tokens at once (useful for "log out everywhere").

     State the chosen approach and why: "Using short access tokens (15 min) with refresh token revocation. The 15-minute exposure window on revocation is acceptable for this application because [reason]. If regulatory requirements demand instant revocation, we will add a Redis-based token blacklist."

14. **Design the JWKS (JSON Web Key Set) endpoint.** For asymmetric JWT signing, publish the public keys at a standard endpoint:
     - **URL**: `https://auth.example.com/.well-known/jwks.json`
     - **Response**:
       ```json
       {
         "keys": [
           {
             "kty": "RSA",
             "kid": "key-2024-01",
             "use": "sig",
             "alg": "RS256",
             "n": "...",
             "e": "AQAB"
           }
         ]
       }
       ```
     - **Key rotation procedure**:
       1. Generate a new key pair with a new `kid`.
       2. Add the new public key to the JWKS endpoint (both old and new keys are published).
       3. Start signing new tokens with the new key.
       4. After all tokens signed with the old key have expired (wait for max token lifetime), remove the old public key from JWKS.
       5. Rotate keys at least annually, or immediately if a key compromise is suspected.
     - **Consumer caching**: Consumers should cache the JWKS with a TTL (e.g., 1 hour) and refresh when they encounter a token with an unknown `kid`. This handles key rotation transparently.