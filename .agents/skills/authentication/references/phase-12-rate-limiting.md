# Phase 12: Rate Limiting and Abuse Protection on Authentication Endpoints

### Phase 12: Rate Limiting and Abuse Protection on Authentication Endpoints

32. **Design authentication-specific rate limiting.** Authentication endpoints are the most targeted endpoints in any application. Generic API rate limiting is insufficient — design dedicated controls:

     **Login endpoint rate limiting**:
     - Per-account rate limit: Max 5-10 failed attempts per account per 15-minute window. After exceeding, apply increasing lockout (step 26).
     - Per-IP rate limit: Max 20-50 failed attempts per IP per 15-minute window across all accounts. Blocks credential stuffing from a single source.
     - Global rate limit: Max failed login attempts per minute across the entire system. Alerts on anomalous spikes (e.g., > 10x normal failure rate) indicate a large-scale attack.

     **Registration endpoint rate limiting**:
     - Per-IP: Max 5-10 registrations per IP per hour. Prevents mass fake account creation.
     - Require email verification before the account is fully activated (prevents spam registrations from consuming resources).
     - CAPTCHA on registration (invisible reCAPTCHA or hCaptcha) to block bots.

     **Password reset endpoint rate limiting**:
     - Per-email: Max 3 reset requests per email per hour.
     - Per-IP: Max 10 reset requests per IP per hour.
     - Do not reveal whether the email exists (step 25).

     **MFA verification endpoint rate limiting**:
     - Max 3-5 failed verification attempts per session. After exceeding, require the user to restart the login flow.
     - Rate-limit TOTP verification globally (prevents brute-forcing the 6-digit code — there are only 1,000,000 possibilities).

     **Token endpoint rate limiting**:
     - Per client_id: Max token requests per minute based on expected usage. Alert on anomalous patterns (e.g., a client requesting tokens 100x faster than normal indicates credential abuse).

33. **Design CAPTCHA strategy.** Use CAPTCHA judiciously — it degrades user experience:
     - **Do not show CAPTCHA on the first login attempt.** Show it only after N failed attempts (e.g., 3), or when risk indicators are present (unknown device, suspicious IP).
     - **Invisible CAPTCHA** (reCAPTCHA v3, Turnstile): Runs in the background and assigns a risk score. Only challenges users with low scores. Best user experience.
     - **Interactive CAPTCHA** (reCAPTCHA v2, hCaptcha): Shows a challenge ("select all traffic lights"). Use as escalation after invisible CAPTCHA fails or for high-risk actions.
     - **Server-side validation**: Always validate the CAPTCHA response server-side. Never trust client-side validation.
     - **Accessibility**: Ensure CAPTCHA has accessible alternatives (audio challenges) for users with disabilities.