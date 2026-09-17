# Phase 6: OAuth 2.0 and OpenID Connect

### Phase 6: OAuth 2.0 and OpenID Connect

19. **Design OAuth 2.0 flows.** Select the correct OAuth 2.0 grant type for each consumer type. Using the wrong grant type is a security vulnerability.

     **Authorization Code with PKCE** (recommended for all user-facing applications):
     - **Use for**: Web applications (SPAs, server-rendered), mobile apps, desktop apps, CLI tools.
     - **Flow**:
       1. Client generates a `code_verifier` (random string, 43-128 chars) and `code_challenge` (SHA-256 hash of verifier, base64url encoded).
       2. Client redirects user to authorization server: `GET /authorize?response_type=code&client_id=...&redirect_uri=...&scope=openid profile email&state=...&code_challenge=...&code_challenge_method=S256`.
       3. User authenticates and consents.
       4. Authorization server redirects to `redirect_uri` with `code` and `state`.
       5. Client verifies `state` matches the original value (CSRF protection).
       6. Client exchanges the code for tokens: `POST /token` with `grant_type=authorization_code&code=...&code_verifier=...&redirect_uri=...`.
       7. Authorization server verifies the code, validates the code_verifier against the stored code_challenge, and returns access token, refresh token, and ID token (if OIDC).
     - **PKCE is mandatory** for all public clients (SPAs, mobile apps) and recommended even for confidential clients (server-side apps). PKCE prevents authorization code interception attacks.
     - **State parameter is mandatory**: Generate a cryptographically random `state` value, store it in the session, and verify it when the callback is received. This prevents CSRF attacks on the OAuth flow.
     - **Never use the Implicit Grant** (`response_type=token`): It returns tokens in the URL fragment, which leaks through browser history, referrer headers, and logs. It is deprecated in OAuth 2.1.

     **Client Credentials Grant** (machine-to-machine):
     - **Use for**: Service-to-service authentication where no user context is needed. Example: a billing service calling a payment gateway API.
     - **Flow**: `POST /token` with `grant_type=client_credentials&client_id=...&client_secret=...&scope=...`. Returns an access token (no refresh token — the client can request a new token at any time using its credentials).
     - **Security**: The `client_secret` must be stored securely (secrets manager, not source code). Rotate client secrets periodically. Use mutual TLS client authentication (`tls_client_auth`) instead of client_secret for higher security.

     **Device Authorization Grant** (input-constrained devices):
     - **Use for**: Smart TVs, IoT devices, CLI tools on headless servers — devices that cannot render a browser.
     - **Flow**: Device requests a user code and verification URL → displays them to the user → user visits the URL on another device (phone/laptop), enters the code, and authenticates → device polls the token endpoint until the user completes authentication.

     **Resource Owner Password Credentials (ROPC)** — **do not use**:
     - Deprecated in OAuth 2.1. The client directly handles the user's password, which violates the core OAuth principle of delegated authentication. Use Authorization Code with PKCE instead.

20. **Design OpenID Connect (OIDC) integration.** OIDC adds an identity layer on top of OAuth 2.0:

     **ID Token**: A JWT issued by the OIDC provider that contains claims about the authenticated user:
     - Standard claims: `sub` (unique user ID), `name`, `email`, `email_verified`, `picture`, `iss`, `aud`, `exp`, `iat`, `nonce`.
     - The ID token proves who the user is. The access token proves what the user can do.
     - **Validate the ID token fully**:
       - Verify the signature using the provider's public keys (from JWKS endpoint).
       - Verify `iss` matches the expected issuer.
       - Verify `aud` contains your client_id.
       - Verify `exp` has not passed.
       - Verify `nonce` matches the value sent in the authorization request (prevents replay attacks).
       - If `azp` (authorized party) is present, verify it matches your client_id.

     **OIDC Discovery**: Use the provider's discovery endpoint (`/.well-known/openid-configuration`) to dynamically discover authorization, token, JWKS, and userinfo endpoints. Do not hardcode these URLs — they may change.

     **UserInfo endpoint**: `GET /userinfo` with the access token. Returns additional claims about the user. Use when the ID token does not contain sufficient user information (some providers include minimal claims in the ID token to reduce size).

     **Scopes**: Request only the scopes you need:
     - `openid` (required for OIDC): Returns an ID token.
     - `profile`: Returns name, family_name, given_name, picture, etc.
     - `email`: Returns email and email_verified.
     - `offline_access`: Returns a refresh token.

21. **Design social login and federated identity.** When integrating external identity providers (Google, Apple, GitHub, Microsoft):

     **Registration and account linking**:
     - On first login via social provider, create a local user account linked to the provider's `sub` claim (not email — email is not a unique, stable identifier across all providers).
     - Store: provider name, provider's user ID (`sub`), linked local user ID, and metadata (email, name at time of linking).
     - **Account linking by email** (handle carefully): If a user registers with email/password and later logs in with Google (same email), should the accounts be auto-linked? This is convenient but risky — an attacker who controls a Google account with the victim's email could gain access. Options:
       - Require the user to authenticate with the existing method and explicitly link the accounts (safest).
       - Auto-link only if the email is verified by the provider (`email_verified: true`) and the existing account's email is also verified (acceptable for most consumer apps).
       - Never auto-link unverified emails.

     **Multiple providers per account**: Allow users to link multiple providers to one account (Google + GitHub). Store each link in a `user_identities` table: `(user_id, provider, provider_user_id, created_at)`.

     **Apple Sign-In specifics**:
     - Apple only provides the user's name and email on the first authentication. Store them immediately — subsequent authentications do not include this data.
     - Apple requires implementing Sign in with Apple if the app offers any other social login (App Store policy).

     **Handle provider outages**: If the social login provider is temporarily unavailable, users cannot authenticate. Encourage users to set up a secondary authentication method (password, another provider) so they are not locked out.