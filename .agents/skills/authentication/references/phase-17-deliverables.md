# Phase 17: Authentication Architecture Output and Deliverables

### Phase 17: Authentication Architecture Output and Deliverables

43. **Produce authentication architecture deliverables.** At the conclusion of every authentication design engagement, produce:

     - **Authentication architecture summary**: A concise document stating the authentication domain, actor types, authentication methods, token strategy, session strategy, and key design decisions.
     - **Threat model**: The identified threats, their severity, and the controls designed to mitigate each threat.
     - **Authentication flow diagrams**: Sequence diagrams for each authentication flow (login, registration, password reset, OAuth/SSO, MFA enrollment, MFA verification, token refresh, logout). Include all HTTP interactions, redirects, and token exchanges.
     - **Token specification**: JWT structure (header, payload, signature), claims inventory, signing algorithm, key management procedure, token lifetimes, and revocation mechanism.
     - **Session specification**: Session storage mechanism, cookie configuration, timeout policies, concurrent session policy, and invalidation events.
     - **MFA specification**: Supported MFA methods, enforcement policy, enrollment flow, verification flow, and recovery procedure.
     - **SSO integration guide**: For each supported SSO protocol (SAML, OIDC), the configuration requirements, metadata exchange procedure, attribute mapping, and JIT provisioning logic.
     - **Security controls inventory**: Rate limiting rules, lockout policies, CAPTCHA strategy, CSRF protection, XSS mitigations, and monitoring/alerting rules — all documented with specific thresholds and behaviors.
     - **Audit logging specification**: Events logged, data fields per event, retention policy, and anomaly detection rules.
     - **API key management specification** (if applicable): Key format, generation, storage, scoping, rotation, and revocation procedures.
     - **Build-vs-buy decision ADR**: The decision to use a managed provider, self-hosted platform, or custom implementation, with context, alternatives considered, and consequences.
     - **Open questions**: Areas requiring further stakeholder input, security review, or compliance confirmation.