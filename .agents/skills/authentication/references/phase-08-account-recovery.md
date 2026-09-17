# Phase 8: Account Recovery and Password Reset

### Phase 8: Account Recovery and Password Reset

25. **Design the password reset flow.** Password reset is a high-risk flow — it is frequently targeted by attackers because it is a pathway to account takeover without the current password:

     **Secure password reset flow**:
     1. User requests reset by entering their email address on the reset page.
     2. **Do not confirm whether the email exists.** Display a generic message: "If an account with that email exists, we have sent a password reset link." This prevents email enumeration (attackers discovering which emails are registered).
     3. Generate a cryptographically random, single-use reset token (minimum 128 bits of entropy). Hash it (SHA-256) and store the hash in the database with: user_id, token_hash, created_at, expires_at, used flag.
     4. Send the unhashed token in a reset link: `https://example.com/reset-password?token=<token>`. Use HTTPS only.
     5. Token expiry: 15-60 minutes. Shorter is more secure. After expiry, the token is invalid.
     6. When the user clicks the link:
        - Look up the token hash in the database.
        - Verify it has not expired and has not been used.
        - Present the password reset form.
     7. User enters new password. Validate against all password policies (length, breach check).
     8. Hash the new password, update the user record, mark the reset token as used, and invalidate all existing sessions and refresh tokens for this user.
     9. Send a notification email: "Your password was recently changed. If you did not do this, contact support immediately." Include a link or instructions for recourse.

     **Security considerations**:
     - Rate-limit reset requests per email (e.g., max 3 per hour) and per IP (e.g., max 10 per hour).
     - Never send the password itself in email — always use a token/link.
     - Never include the old password or the new password in the notification email.
     - Reset tokens must be single-use — invalidate after first use regardless of outcome.
     - If the user has MFA enabled, consider requiring MFA verification after clicking the reset link and before setting the new password (this depends on threat model — if the attacker has access to the user's email, MFA provides additional protection).

26. **Design account lockout and unlock.** Protect against brute-force password guessing while not creating denial-of-service:

     **Lockout policy**:
     - Lock the account after N consecutive failed login attempts (recommended: 5-10 attempts).
     - **Time-based lockout** (recommended over permanent lockout): Lock for an increasing duration: 1 minute after 5 failures, 5 minutes after 10 failures, 30 minutes after 15 failures. This slows attackers without permanently locking out legitimate users.
     - **Never use permanent lockout without manual unlock** for consumer applications — attackers can weaponize it to lock out legitimate users (denial of service).
     - Reset the failure counter after a successful login.
     - **Lockout scope**: Lock by account, not by IP address alone. IP-based lockout is easily bypassed with botnets. Account-based lockout targets the actual attack vector.

     **Unlock mechanisms**:
     - Automatic unlock after the lockout period expires.
     - Password reset (unlocks the account after successful reset).
     - Admin-initiated unlock (for enterprise applications).
     - CAPTCHA challenge after N failures instead of (or before) lockout — allows legitimate users to proceed while blocking automated attacks.

     **Credential stuffing defense** (attackers trying stolen credentials from other breaches):
     - Breached password detection (step 7) prevents users from using compromised passwords.
     - Rate limiting per IP address (in addition to per-account lockout).
     - CAPTCHA on login after initial failures or for suspicious patterns.
     - Device fingerprinting — flag login attempts from unknown devices and require additional verification.
     - Monitor for distributed attacks (many accounts, few attempts each, from many IPs) — this evades per-account lockout. Use anomaly detection on login patterns.