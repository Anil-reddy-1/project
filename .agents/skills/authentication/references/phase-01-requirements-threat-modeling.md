# Phase 1: Requirements Discovery and Threat Modeling

### Phase 1: Requirements Discovery and Threat Modeling

1. **Identify the authentication domain and actors.** Before any design, establish who needs to be authenticated and in what context. If the user has not stated this clearly, ask: "Who are the entities that need to prove their identity to this system, and what are they trying to access?" Identify and categorize all authentication actors:

   - **End users (humans interacting via UI)**: Web application users, mobile app users, desktop app users. Sub-categorize by:
     - Consumer users (public sign-up, high volume, low trust, diverse technical skill).
     - Business users (invitation-based, moderate volume, organizational context).
     - Enterprise users (SSO-integrated, managed by corporate IT, compliance-sensitive).
     - Admin/internal users (privileged access, highest security requirements).
   - **API consumers (programmatic access)**: Third-party developer applications, partner integrations, automated systems calling your API.
   - **Services (machine-to-machine)**: Internal microservices authenticating to each other, background workers, scheduled jobs.
   - **IoT devices and agents**: Embedded devices, edge computing nodes, autonomous agents with constrained capabilities.

   For each actor category, note: how they will authenticate (browser, mobile app, CLI, SDK, API call), the sensitivity of what they access, and any regulatory context (healthcare, finance, government).

2. **Define authentication requirements.** Establish concrete answers for:
   - **User volume**: How many registered users? Expected growth? Peak concurrent sessions?
   - **Registration model**: Self-service sign-up, invitation-only, admin-provisioned, or federated (SSO)?
   - **Credential types**: Password, social login, SSO/SAML, passwordless, certificate-based? Multiple options or single?
   - **MFA requirements**: Required for all users, optional, required for admins only, or required for specific actions (step-up authentication)?
   - **Session duration expectations**: How long should a user stay logged in? Minutes (banking), hours (SaaS), days (social media), or weeks (mobile apps)?
   - **Concurrent session policy**: Can a user be logged in from multiple devices simultaneously? If not, what happens to the older session?
   - **Compliance requirements**: SOC 2, HIPAA, PCI-DSS, FedRAMP, GDPR, or industry-specific regulations. Each imposes specific authentication controls.
   - **Password policy requirements**: Regulatory or organizational password complexity, rotation, and history requirements.
   - **Account recovery requirements**: How do users regain access when they forget credentials or lose their MFA device?
   - **Audit requirements**: What authentication events must be logged and for how long?
   - **Team expertise**: Does the team have experience building and operating authentication systems? This heavily influences build-vs-buy.
   - **Existing infrastructure**: Is there an existing identity provider, user directory, or SSO system that must be integrated?

3. **Build the threat model.** For every authentication system, explicitly identify what you are defending against. Do not design authentication without understanding the threats:

   **Threat: Credential theft**
   - Attack vectors: Phishing, credential stuffing (using breached credentials from other sites), keyloggers, shoulder surfing, social engineering.
   - Impact: Account takeover, data exfiltration, unauthorized actions.
   - Controls: Strong password hashing, breach detection, MFA, phishing-resistant authenticators (WebAuthn).

   **Threat: Session hijacking**
   - Attack vectors: XSS (stealing session tokens from JavaScript), network interception (missing TLS), session fixation, malware.
   - Impact: Attacker assumes victim's authenticated session.
   - Controls: Secure cookie attributes, HttpOnly, SameSite, TLS everywhere, session binding, short session lifetimes.

   **Threat: Token theft and replay**
   - Attack vectors: Token leakage through logs, URL parameters, insecure storage, compromised client device.
   - Impact: Unauthorized API access using stolen token.
   - Controls: Short token lifetimes, token binding, refresh token rotation, token revocation.

   **Threat: Brute-force attacks**
   - Attack vectors: Automated password guessing, credential stuffing at scale.
   - Impact: Account compromise, resource exhaustion.
   - Controls: Rate limiting, account lockout, CAPTCHA, breached password detection.

   **Threat: Account takeover via recovery**
   - Attack vectors: Exploiting weak account recovery (guessable security questions, SIM swapping for SMS-based recovery, email account compromise).
   - Impact: Attacker takes permanent control of account.
   - Controls: Secure recovery flows, MFA on recovery, identity verification.

   **Threat: Insider attack**
   - Attack vectors: Malicious or compromised internal employees accessing user credentials or sessions.
   - Impact: Mass account compromise.
   - Controls: Password hashing (not encryption), audit logging, principle of least privilege for internal access, secrets management.

   **Threat: Supply chain compromise**
   - Attack vectors: Compromised authentication library, IdP breach, dependency vulnerability.
   - Impact: Systemic credential exposure.
   - Controls: Dependency scanning, IdP monitoring, incident response planning.

   State which threats are highest priority for this system based on the actor types, data sensitivity, and compliance requirements. Design controls proportional to the threat severity.
