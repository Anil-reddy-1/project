# Phase 10: Passwordless Authentication

### Phase 10: Passwordless Authentication

29. **Design passwordless authentication flows.** Passwordless authentication eliminates the primary attack vector (password theft) and improves user experience:

     **Passkeys (WebAuthn discoverable credentials)** (recommended as the primary passwordless method):
     - User registers a passkey using their device's platform authenticator (Touch ID, Face ID, Windows Hello) or a hardware security key.
     - On login, the browser prompts the user to authenticate with their passkey — no password entry.
     - Cross-device: Passkeys can be synced across devices via iCloud Keychain, Google Password Manager, or third-party password managers.
     - Implementation:
       - Registration: Generate a challenge → call `navigator.credentials.create()` → receive and store the credential public key, credential ID, and attestation.
       - Authentication: Generate a challenge → call `navigator.credentials.get()` → verify the assertion signature with the stored public key.
       - Store multiple passkeys per user (phone, laptop, hardware key).
     - Fallback: Provide alternative authentication methods (magic link, TOTP) for scenarios where passkeys are unavailable (old browsers, unsupported devices).

     **Magic link (email-based passwordless)**:
     - User enters email → system sends a link with a single-use, time-limited token → user clicks the link → authenticated.
     - Implementation: Same security as password reset tokens (step 25): cryptographically random token, hashed storage, short expiry (10-15 minutes), single-use, rate-limited.
     - **Security consideration**: Security is delegated to the email account. If the user's email is compromised, so is their authentication. This is acceptable for consumer applications with moderate sensitivity.
     - **UX consideration**: The user must switch to their email client, which interrupts the flow. On mobile, deep links can bring the user back to the app automatically.
     - Send the link with contextual information: "Sign in to [App Name] from [Device] at [Location]. If this wasn't you, ignore this email."

     **OTP-based passwordless** (email or SMS):
     - Instead of a link, send a 6-digit code. User enters the code in the app.
     - Advantages over magic link: Works in contexts where clicking a link is inconvenient (e.g., signing in on a TV while checking email on phone).
     - Implementation: Generate a cryptographically random 6-digit code. Hash and store it with user_id, expiry (5 minutes), and attempt counter. Rate-limit verification attempts (max 3-5 attempts per code). Invalidate after use or expiry. Rate-limit code generation (max 3-5 per hour per user).