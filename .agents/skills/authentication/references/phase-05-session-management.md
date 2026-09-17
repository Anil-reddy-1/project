# Phase 5: Session Management

### Phase 5: Session Management

15. **Design server-side session management.** If using session-based authentication (or hybrid session + token):

     **Session ID generation**:
     - Generate session IDs using a cryptographically secure random number generator (CSPRNG): `crypto.randomBytes(32)` or equivalent. Minimum 128 bits of entropy.
     - Session IDs must be unpredictable — never derive them from user data, timestamps, or sequential counters.

     **Session storage**:
     - **Redis** (recommended): Fast, supports TTL for automatic expiry, supports key patterns for bulk operations (e.g., "invalidate all sessions for user X"). Set appropriate maxmemory and eviction policy (`noeviction` or `volatile-ttl` — never `allkeys-lru` which could evict active sessions).
     - **Database table**: Acceptable for low-traffic applications. Include: session_id (hashed), user_id, created_at, expires_at, last_accessed_at, ip_address, user_agent, revoked flag. Add an index on user_id for "revoke all sessions" operations. Add a periodic cleanup job for expired sessions.
     - **In-memory** (e.g., application process memory): Never in production. Sessions are lost on restart and cannot be shared across instances.

     **Session data**: Store minimal data in the session: user ID, role/permission snapshot, session creation time, last activity time. Do not store large objects — every request loads the session.

16. **Design session cookie configuration.** The session cookie configuration is critical for security:

     ```
     Set-Cookie: session_id=<value>;
       HttpOnly;
       Secure;
       SameSite=Lax;
       Path=/;
       Domain=.example.com;
       Max-Age=86400
     ```

     - **`HttpOnly`** (mandatory): Prevents JavaScript from accessing the cookie. Mitigates XSS-based session theft. There is never a legitimate reason to make a session cookie accessible to JavaScript.
     - **`Secure`** (mandatory): Cookie is only sent over HTTPS. Prevents interception over HTTP.
     - **`SameSite`**:
       - `Lax` (recommended default): Cookie is sent on top-level navigations (clicking a link) but not on cross-site POST requests or cross-origin subresource requests. Provides CSRF protection while maintaining usability (links from external sites still work).
       - `Strict`: Cookie is never sent on cross-site requests. Maximum CSRF protection but breaks scenarios where users click links from email/external sites and expect to be logged in.
       - `None` (with `Secure`): Cookie is sent on all cross-site requests. Required only for legitimate cross-site scenarios (embedded iframes, cross-site API calls). Requires additional CSRF protection.
     - **`Path`**: Set to `/` unless there is a specific reason to scope the cookie to a subpath.
     - **`Domain`**: Set to the parent domain (`.example.com`) to share across subdomains if needed. Omit to restrict to the exact issuing domain.
     - **`Max-Age` or `Expires`**: Set to the desired session duration. Omit for a session cookie that expires when the browser closes (but note: modern browsers restore session cookies on restart).
     - **Cookie name**: Avoid default names like `JSESSIONID` or `PHPSESSID` that reveal the technology stack. Use a generic name like `__Host-sid` (the `__Host-` prefix enforces Secure, no Domain, and Path=/).

     **Use the `__Host-` prefix** (recommended): `__Host-session_id`. This browser-enforced prefix guarantees the cookie is `Secure`, has no `Domain` attribute (locked to the exact host), and `Path=/`. Prevents cookie injection attacks from subdomains.

17. **Design session lifecycle.** Define how sessions behave over time:

     **Session timeout**:
     - **Absolute timeout**: Maximum session duration regardless of activity. Example: 24 hours for SaaS, 8 hours for enterprise, 30 minutes for banking. After this period, the session is invalid and the user must re-authenticate.
     - **Idle timeout**: Session expires after a period of inactivity. Example: 30 minutes for web apps, 15 minutes for sensitive applications. Reset on each authenticated request. Idle timeout must be shorter than absolute timeout.
     - **Implementation**: Store `created_at` (for absolute timeout) and `last_accessed_at` (for idle timeout) in the session record. On each request, check both: `now - created_at < absolute_limit AND now - last_accessed_at < idle_limit`.

     **Session renewal**: When a session approaches its absolute timeout, optionally prompt the user to extend ("Your session will expire in 5 minutes. Click here to continue."). Issue a new session (new session ID, reset created_at) to prevent session fixation.

     **Concurrent session control**:
     - **Allow multiple sessions** (default for most apps): Users can be logged in from multiple devices. Track sessions and allow users to view and revoke other sessions ("Logged in devices" page).
     - **Limit concurrent sessions**: Enforce a maximum (e.g., 3 active sessions). When the limit is exceeded, either reject the new login or invalidate the oldest session.
     - **Single session only**: Each new login invalidates all previous sessions. Appropriate for high-security applications.

     **Session invalidation events** — invalidate all sessions for a user when:
     - User changes password.
     - User enables or disables MFA.
     - Admin disables the user account.
     - Suspicious activity is detected on the account.
     - User explicitly clicks "Log out of all devices."

18. **Design client-side token storage (for SPAs and mobile apps).** How tokens are stored on the client directly affects the attack surface:

     **For web SPAs**:
     - **HttpOnly cookie (recommended)**: Store the access token (or session ID) in an HttpOnly Secure SameSite cookie. JavaScript cannot access it, eliminating XSS-based token theft. The API must be on the same domain (or a subdomain) for cookies to be sent automatically.
     - **BFF (Backend for Frontend) pattern (most secure for SPAs)**: The SPA never handles tokens directly. A server-side BFF component handles OAuth flows, stores tokens in a server-side session, and proxies API calls with the token. The SPA uses a session cookie to authenticate with the BFF. This eliminates all client-side token storage concerns.
     - **In-memory variable** (acceptable with caveats): Store the access token in a JavaScript variable (not localStorage, not sessionStorage). Lost on page refresh — requires silent refresh via iframe or refresh token in HttpOnly cookie. More complex but avoids persistent storage.
     - **localStorage** (not recommended): Accessible to any JavaScript on the page, including XSS payloads. If the application has any XSS vulnerability, tokens are compromised. Use only if cookie-based approaches are impossible and XSS risk is aggressively mitigated via CSP.
     - **sessionStorage** (marginally better than localStorage): Cleared when the tab closes, but still accessible to JavaScript/XSS. Same risks as localStorage.

     **For mobile apps**:
     - **iOS Keychain** (recommended): Hardware-backed secure storage. Tokens are encrypted and isolated per app.
     - **Android Keystore + EncryptedSharedPreferences** (recommended): Hardware-backed encryption for token storage.
     - **Never store tokens in**: SharedPreferences (Android, unencrypted), UserDefaults (iOS, unencrypted), or plain files.

     **For server-side applications and CLIs**:
     - Store tokens in the operating system's credential manager (macOS Keychain, Windows Credential Manager, Linux Secret Service) or in encrypted configuration files with appropriate file permissions.