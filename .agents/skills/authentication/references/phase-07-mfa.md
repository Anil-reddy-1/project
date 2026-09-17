# Phase 7: Multi-Factor Authentication (MFA)

### Phase 7: Multi-Factor Authentication (MFA)

22. **Design the MFA strategy.** MFA is the most effective defense against credential theft — even if the password is compromised, the attacker needs the second factor. Define when and how MFA is used:

     **MFA enforcement policy**:
     - **Required for all users**: Maximum security. Recommended for enterprise SaaS, financial applications, healthcare, and any system handling sensitive data.
     - **Required for privileged users**: Admins, users with elevated permissions. Minimum viable MFA policy.
     - **Optional but encouraged**: Users choose to enable MFA. Show prompts and nudges to encourage adoption. Track MFA adoption rate as a security metric.
     - **Step-up authentication**: Users authenticate normally (password), but MFA is required for specific sensitive actions (changing password, accessing financial data, modifying security settings, exporting data). The user's authentication level is elevated temporarily for the sensitive action.
     - **Risk-based MFA**: Trigger MFA only when risk indicators are present (new device, new location, unusual time, impossible travel). Reduces friction for normal usage while protecting against suspicious access. Requires risk scoring infrastructure.

23. **Select MFA methods and prioritize them.** Not all second factors are equally secure. List in order of security:

     **Tier 1: Phishing-resistant (strongly recommended)**:
     - **WebAuthn / FIDO2 / Passkeys**: Hardware security keys (YubiKey) or platform authenticators (Touch ID, Face ID, Windows Hello). The authentication is bound to the specific origin (domain) — a phishing site on a different domain cannot intercept the credential. This is the gold standard for MFA.
       - Implementation: Use the WebAuthn API. Store the credential public key, credential ID, sign count, and authenticator type per user in the database. Support multiple registered authenticators per user (backup keys).
       - Passkeys (discoverable credentials): Enable passwordless login — the passkey replaces both the password and the second factor. Support cross-device passkeys (synced via iCloud Keychain, Google Password Manager, or 1Password).

     **Tier 2: Strong (recommended)**:
     - **TOTP (Time-Based One-Time Password)**: Authenticator apps (Google Authenticator, Authy, 1Password). User scans a QR code containing a shared secret, and the app generates 6-digit codes that change every 30 seconds.
       - Implementation: Generate a random 160-bit secret per user. Encode as base32 in the `otpauth://` URI. Accept the current time step ±1 (allow one period of clock skew). Store the secret encrypted in the database. Rate-limit TOTP verification attempts.
       - Show recovery codes during setup (see step 24).
     - **Push notification**: Send a push notification to a registered mobile app. User approves or denies. Includes context (location, device, action). More resistant to social engineering than SMS. Implementation: register device tokens, send via APNS/FCM, implement timeout and fallback.

     **Tier 3: Acceptable (use only if Tier 1/2 are not feasible)**:
     - **SMS OTP**: Send a one-time code via SMS. Vulnerable to SIM swapping, SS7 attacks, and real-time phishing (attacker relays the code). NIST SP 800-63B classifies SMS as a "restricted" authenticator. Use only as a fallback or for user populations that cannot use apps/hardware keys.
       - If using SMS: Rate-limit sends (max 5 per hour per user), use short expiry (5 minutes), include context in the message ("Your code is 123456. If you did not request this, ignore this message."), and monitor for SIM swap indicators.
     - **Email OTP**: Send a one-time code to the user's email. Less secure than TOTP (email accounts can be compromised, delivery delays), but accessible to all users. Similar implementation considerations as SMS.

     **Never use as sole second factor**: Security questions ("What is your mother's maiden name?"). Answers are guessable, findable on social media, and often reused across sites.

     Allow users to register multiple MFA methods for redundancy. If a user loses their phone, they should be able to use a backup hardware key or recovery codes.

24. **Design MFA recovery.** Users will lose their MFA device. The recovery process must balance security (preventing unauthorized access) with usability (not permanently locking out legitimate users):

     **Recovery codes** (mandatory when MFA is enabled):
     - Generate 8-10 single-use recovery codes during MFA setup. Each code: 8-10 alphanumeric characters.
     - Display them once and instruct the user to store them securely (password manager, printed and stored physically).
     - Store hashed recovery codes in the database (hash each code individually with bcrypt or similar). When a code is used, mark it as consumed.
     - Allow users to regenerate recovery codes at any time (after authentication), which invalidates all previous codes.

     **Backup MFA method**: Encourage users to register a second MFA method (e.g., hardware key as backup for TOTP). If one method is lost, the other still works.

     **Admin-assisted recovery** (for enterprise/business applications):
     - An administrator can temporarily disable MFA for a user's account after verifying the user's identity through an out-of-band process (video call, in-person verification, identity document verification).
     - Log this action with the administrator's identity, the verification method used, and the timestamp.
     - Force the user to re-enroll MFA immediately after the reset.
     - Set a strict time limit: if MFA is not re-enrolled within 24 hours, lock the account.

     **Self-service recovery via identity verification** (for consumer applications):
     - If the user has verified recovery email/phone, send a verification code to initiate MFA reset.
     - Require a waiting period (24-48 hours) before the MFA reset takes effect. Notify the user on all channels during this period. If the user cancels (indicating the request was fraudulent), abort the reset.
     - This delays attackers and gives the legitimate user time to react.