# Phase 13: Authentication Audit Logging

### Phase 13: Authentication Audit Logging

34. **Design authentication event logging.** Authentication audit logs are critical for security monitoring, incident investigation, and compliance. Log every authentication-relevant event:

     **Events to log** (at minimum):
     | Event | Data to Log |
     |---|---|
     | Login success | user_id, timestamp, IP, user_agent, auth_method (password, SSO, social, passkey), MFA used (yes/no, method), session_id |
     | Login failure | email_or_username (not password), timestamp, IP, user_agent, failure_reason (invalid_password, account_locked, mfa_failed, account_not_found) |
     | Logout | user_id, timestamp, session_id, logout_type (user_initiated, session_expired, forced) |
     | Password change | user_id, timestamp, IP |
     | Password reset request | email, timestamp, IP |
     | Password reset completion | user_id, timestamp, IP |
     | MFA enrollment | user_id, timestamp, mfa_method, IP |
     | MFA removal | user_id, timestamp, mfa_method, IP, reason |
     | Token issued | user_id (or client_id), timestamp, token_type, scopes, token_id (jti) |
     | Token revoked | user_id, timestamp, token_id, revocation_reason |
     | Account locked | user_id, timestamp, reason, lock_duration |
     | Account unlocked | user_id, timestamp, unlocked_by (self, admin, timeout) |
     | Session invalidated | user_id, timestamp, session_id, reason |
     | API key created | user_id, key_id, timestamp, scopes |
     | API key revoked | user_id, key_id, timestamp, reason |
     | SSO configuration changed | tenant_id, admin_user_id, timestamp, change_description |
     | Admin impersonation started | admin_user_id, impersonated_user_id, timestamp, reason |
     | Admin impersonation ended | admin_user_id, impersonated_user_id, timestamp |

     **What to NEVER log**:
     - Passwords (plaintext or hashed).
     - Full session tokens or access tokens.
     - TOTP codes or recovery codes.
     - Client secrets or API key values.
     - Full credit card numbers or SSNs.
     - Log only opaque identifiers (user_id, session_id, token_id/jti) that can be correlated with internal systems but do not expose credentials.

35. **Design authentication anomaly detection.** Use the audit logs to detect suspicious authentication patterns:

     **Detection rules**:
     - **Impossible travel**: User logs in from New York, then 10 minutes later from Tokyo. Alert and optionally require MFA re-verification.
     - **Credential stuffing**: High rate of failed login attempts across many different accounts from a set of IP addresses. Trigger global rate limiting and CAPTCHA.
     - **Brute force**: Many failed attempts on a single account. Trigger account lockout (step 26).
     - **Session anomaly**: Active session with a sudden change in IP address, user agent, or geographic location. Optionally require re-authentication.
     - **Unusual MFA behavior**: Multiple MFA failures followed by success (attacker may be replaying codes). User disables MFA and immediately accesses sensitive data.
     - **Off-hours access**: User accesses the system at unusual times for their historical pattern. Flag for review (especially for admin accounts).
     - **Account takeover sequence**: Password reset → MFA change → email change in rapid succession. This is the classic account takeover pattern. Alert security team immediately.

     **Response actions** (tiered):
     - Log and monitor (low confidence).
     - Require step-up authentication / MFA re-verification (medium confidence).
     - Lock the account and notify the user (high confidence).
     - Alert the security team for manual investigation (critical).

36. **Define audit log retention and security.** 
     - **Retention**: Minimum 1 year for most applications. 7 years for financial/healthcare (regulatory). Define the retention policy in compliance with applicable regulations.
     - **Immutability**: Authentication logs must be append-only. No user or administrator should be able to modify or delete authentication logs. Write to a tamper-evident log store (append-only database, immutable object storage, or dedicated SIEM).
     - **Access control**: Restrict access to authentication logs to security personnel. Log all access to the audit logs themselves (meta-auditing).
     - **Encryption**: Encrypt audit logs at rest and in transit.