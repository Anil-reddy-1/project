# Phase 2: Authentication Strategy Selection

### Phase 2: Authentication Strategy Selection

4. **Decide build vs. buy.** This is the first and most consequential decision. Make an explicit recommendation:

   **Use a managed authentication provider** (Auth0, Cognito, Firebase Auth, Clerk, WorkOS, Supabase Auth, Stytch) when:
   - The team does not have deep security engineering expertise.
   - Time to market is a priority.
   - Standard authentication flows (password, social login, MFA, SSO) are sufficient.
   - The budget accommodates per-user or per-MAU pricing at projected scale.
   - Compliance certifications of the provider (SOC 2, HIPAA BAA) are needed.

   **Use a self-hosted identity platform** (Keycloak, Ory, Zitadel, Authentik, FusionAuth) when:
   - Full control over the identity infrastructure is required (data residency, customization, on-premise deployment).
   - The organization has the operational capacity to run and patch the identity service.
   - Cost at scale makes managed services prohibitive (managed services charge per-user, self-hosted does not).
   - Deep customization of authentication flows is required that managed providers cannot accommodate.

   **Build custom authentication** only when:
   - The authentication requirements are genuinely unique and cannot be met by any existing platform (extremely rare).
   - The organization has dedicated security engineering resources to build, maintain, and audit the system continuously.
   - Even then, use well-vetted libraries (bcrypt/argon2 for hashing, established JWT libraries, OIDC-certified libraries) — never implement cryptographic primitives from scratch.

   State the recommendation and justification: "Use Auth0 because the team has 4 engineers, no dedicated security expertise, and needs OIDC-based SSO for enterprise customers within 6 weeks. Building custom would take 3-4 months and introduce unacceptable security risk. Auth0's cost at 50k MAU (~$X/month) is acceptable for this stage. If cost becomes prohibitive at 500k+ MAU, migrate to Keycloak."

5. **Select the authentication architecture pattern.** Based on the application type and actor categories:

   **Session-based authentication (server-side sessions)**:
   - Recommended for: Traditional server-rendered web applications, applications where immediate session revocation is critical, applications with a single backend serving the frontend.
   - How it works: User authenticates → server creates a session record (in Redis, database, or memory) → server sends a session ID in a cookie → subsequent requests include the cookie → server validates the session ID against the session store.
   - Advantages: Simple revocation (delete the session record), no token leakage risk in browser JavaScript, well-understood security model.
   - Disadvantages: Requires shared session store for horizontally scaled backends, session store is a stateful dependency, not suitable for cross-domain or third-party API access.

   **Token-based authentication (JWTs)**:
   - Recommended for: SPAs consuming APIs, mobile apps, cross-domain scenarios, microservices architectures, and any system where the client needs a portable, self-contained credential.
   - How it works: User authenticates → server issues a signed JWT (and optionally a refresh token) → client stores the tokens → subsequent requests include the JWT in the Authorization header → server validates the JWT signature and claims without a central session store.
   - Advantages: Stateless validation (no session store lookup per request), works across domains and services, supports fine-grained claims.
   - Disadvantages: Cannot be revoked before expiry without a blacklist/revocation mechanism, token size increases with claims, exposure to token theft if stored insecurely on the client.

   **OAuth 2.0 / OIDC-based authentication**:
   - Recommended for: Applications that need delegated authorization, social login, enterprise SSO, third-party API access, or any system that separates the identity provider from the application.
   - This is not an alternative to session-based or token-based — it is a layer that governs how tokens are obtained. The application still uses sessions or JWTs after the OAuth/OIDC flow completes.

   **Certificate-based (mutual TLS)**:
   - Recommended for: Service-to-service authentication in zero-trust environments, IoT device authentication, enterprise environments with PKI infrastructure.
   - How it works: Both client and server present X.509 certificates. The server verifies the client's certificate against a trusted CA.
   - Advantages: No shared secrets, strong machine identity, resistant to credential theft.
   - Disadvantages: Certificate lifecycle management (issuance, rotation, revocation) is operationally complex.

   **API key authentication**:
   - Recommended for: Simple programmatic API access where the caller is an application (not a user), and the API does not need to act on behalf of a specific user. Common for: developer APIs, service-to-service calls in low-security contexts, webhook verification.
   - Not recommended for: User-facing authentication, scenarios requiring fine-grained user permissions, or high-security contexts.

   Select the pattern(s) for each actor category. It is common to use multiple patterns: OIDC for end-user authentication, JWTs for API access, mutual TLS for service-to-service, and API keys for third-party developer access.
