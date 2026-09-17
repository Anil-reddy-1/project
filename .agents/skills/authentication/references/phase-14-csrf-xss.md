# Phase 14: CSRF, XSS, and Authentication-Adjacent Security

### Phase 14: CSRF, XSS, and Authentication-Adjacent Security

37. **Design CSRF protection for authentication flows.** CSRF is relevant when authentication uses cookies:

     **CSRF protection mechanisms**:
     - **SameSite cookies** (primary defense): Setting `SameSite=Lax` on the session cookie prevents CSRF on POST/PUT/DELETE requests from cross-site contexts. This handles most CSRF scenarios without additional tokens.
     - **CSRF token (Synchronizer Token Pattern)**: Generate a cryptographically random CSRF token per session. Embed it in forms as a hidden field and validate it server-side on every state-changing request. Use this in addition to SameSite cookies for defense in depth.
     - **Double submit cookie**: Set a CSRF token in both a cookie and a request header/body. Server verifies they match. Useful for stateless applications that cannot store CSRF tokens server-side.
     - **Custom request headers**: For API calls from JavaScript, require a custom header (e.g., `X-Requested-With: XMLHttpRequest`). Simple requests from HTML forms cannot add custom headers, which blocks cross-site form submissions. Not sufficient as the sole defense — combine with SameSite.

     **Login CSRF**: An attacker can force a user to log in to the attacker's account (the user thinks they are in their own account and may enter sensitive information). Protect with:
     - CSRF token on the login form.
     - After login, display the authenticated identity prominently so the user can verify they are in the correct account.

38. **Design authentication-related XSS mitigations.** XSS is the most dangerous attack vector for authentication because it can steal tokens and session identifiers:

     - **Content Security Policy (CSP)**: Set a strict CSP header that prevents inline JavaScript execution and restricts script sources. Minimum: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`. Eliminate `'unsafe-inline'` for scripts if possible (use nonces or hashes).
     - **HttpOnly cookies**: As discussed in step 16 — prevents JavaScript access to session cookies.
     - **Input sanitization and output encoding**: All user-provided input must be encoded when rendered in HTML contexts. Use framework-provided auto-escaping (React's JSX, Django's template engine, etc.). Never inject raw user input into HTML, JavaScript, or URLs.
     - **Token storage**: Store tokens in HttpOnly cookies or in-memory variables, not in localStorage (see step 18).
     - **Subresource Integrity (SRI)**: Add `integrity` attributes to `<script>` and `<link>` tags for third-party resources to ensure they haven't been tampered with.