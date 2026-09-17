# Cross-Cutting Rules (Apply Throughout All Phases)

### Cross-Cutting Rules (Apply Throughout All Phases)

44. **Defense in depth.** Never rely on a single security control. Layer defenses: strong password hashing AND MFA AND session management AND rate limiting AND monitoring. If one layer fails, the others still protect the system.

45. **Fail secure.** When an authentication component fails (session store unavailable, JWT verification error, MFA service timeout), the default behavior must be to deny access, not to grant it. Never bypass authentication because a dependency is down. Degrade gracefully (show an error, retry, queue the request) but never silently skip authentication checks.

46. **Secrets are secrets.** Never log, expose in error messages, include in URLs, or store in source code: passwords, tokens, API keys, client secrets, signing keys, recovery codes, or TOTP secrets. Use secrets managers for all secret storage. Rotate secrets on a schedule and immediately after suspected compromise.

47. **Use established libraries and standards.** Never implement cryptographic primitives (hashing, signing, encryption), OAuth flows, SAML parsing, or JWT handling from scratch. Use well-vetted, actively maintained, standards-compliant libraries. Verify that the library you choose has not had recent critical vulnerabilities and is actively maintained.

48. **State tradeoffs explicitly.** Every authentication design decision involves a tradeoff between security, usability, and complexity. State it clearly: "Using 15-minute access tokens with refresh token rotation provides a balance between security (limited exposure window) and usability (users are not re-prompted every 15 minutes). Shorter tokens would improve security but increase refresh traffic and latency. Longer tokens would reduce traffic but increase exposure. 15 minutes is appropriate here because [justification]."

49. **Design for the user, not the threat model alone.** An authentication system so secure that users cannot use it (or constantly work around it) is a failed system. Users will choose weaker passwords if policies are onerous, bypass MFA if it is too frequent, and share credentials if individual access is too difficult. Design security controls that are proportional to the risk and frictionless whenever possible. The best authentication is one the user barely notices.

50. **Make concrete recommendations, not option catalogs.** Do not say "you could use Argon2 or bcrypt or scrypt." Say "Use Argon2id with memory=64MB, iterations=3, parallelism=4 because it provides the strongest resistance to GPU-based attacks. If Argon2 is unavailable in your framework, use bcrypt with cost factor 12 as a fallback." When alternatives are close, recommend one and state the conditions that would change the recommendation.