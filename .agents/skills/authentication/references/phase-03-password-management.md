# Phase 3: Password Management

### Phase 3: Password Management

6. **Design password hashing.** If the system accepts passwords (most do, even alongside other methods), password storage is a critical security control. A breach of the user table must not expose usable passwords.

   **Select the hashing algorithm** — in order of preference:
   - **Argon2id** (recommended): Winner of the Password Hashing Competition. Memory-hard (resistant to GPU/ASIC attacks), configurable time and memory cost. Use Argon2id variant (combines side-channel resistance of Argon2i with GPU resistance of Argon2d).
     - Recommended parameters: memory = 64MB (65536 KB), iterations = 3, parallelism = 4. Adjust so that hashing takes 250ms-1s on your production hardware — this is the tradeoff between security (slower = harder to brute force) and user experience (login latency).
     - If memory-constrained (shared hosting, serverless with limited memory): memory = 19MB (19456 KB), iterations = 2. Never go below 15MB.
   - **bcrypt** (acceptable, widely supported): If Argon2 is unavailable in your language/framework. Use cost factor 12-14 (each increment doubles the time). bcrypt has a 72-byte input limit — long passwords are silently truncated. If users may have passwords > 72 characters, pre-hash with SHA-256 before bcrypt (but beware of null bytes — base64 encode the SHA-256 output).
   - **scrypt** (acceptable alternative): Memory-hard like Argon2 but less tunable. Use if Argon2 and bcrypt are unavailable.

   **Never use**:
   - MD5, SHA-1, SHA-256 (without key stretching): Too fast — billions of hashes per second on modern GPUs.
   - Encryption (AES, etc.) for passwords: Encryption is reversible; hashing is not. If the encryption key is compromised, all passwords are exposed.
   - Single-iteration hashing of any kind.

   **Salt**: Argon2 and bcrypt generate and embed a unique salt automatically. If using a lower-level API, generate a cryptographically random salt (16+ bytes) per password and store it with the hash. Never reuse salts. Never use a global/shared salt.

   **Pepper** (optional additional defense): A server-side secret key used as an additional input to the hash. Stored in a secrets manager (Vault, AWS Secrets Manager), not in the database. If the database is breached but the application server is not, the pepper prevents offline brute-forcing. Implement as: HMAC(password, pepper) → Argon2(HMAC_output). Define pepper rotation procedure.

7. **Design password policies.** Balance security with usability — overly restrictive policies lead to weaker passwords (users choose predictable patterns to meet arbitrary rules):

   **Recommended policy (aligned with NIST SP 800-63B)**:
   - **Minimum length**: 8 characters (absolute minimum), 12 characters recommended. Length is the single most important factor in password strength.
   - **Maximum length**: At least 128 characters. Never set a low maximum — it frustrates passphrase users and password managers.
   - **No composition rules**: Do not require "at least one uppercase, one lowercase, one digit, one special character." NIST found these rules do not improve security and degrade usability. Users respond with "Password1!" patterns.
   - **Breached password detection** (critical): Check every new password against a database of known breached passwords. Use the Have I Been Pwned Passwords API (k-anonymity model — only the first 5 characters of the SHA-1 hash are sent, preserving privacy) or a local copy of the breached password list. Reject passwords found in breach databases with a clear message: "This password has appeared in a known data breach. Please choose a different password."
   - **Common password blocklist**: Reject passwords from a list of the most common passwords (top 10,000-100,000). Supplement with context-specific terms (company name, product name, "password", "admin").
   - **No periodic rotation requirements**: NIST recommends against forced password rotation. It leads to predictable patterns (Password1 → Password2). Require password change only when: there is evidence of compromise, the password is found in a breach database, or the user requests it.
   - **Allow paste in password fields**: Users must be able to paste passwords from password managers. Never disable paste on password fields.

8. **Design password change and update flows.**
   - **Password change (authenticated user)**: Require the current password before accepting a new password. This prevents unauthorized changes from a hijacked session. Apply all password validation rules (minimum length, breach check) to the new password. Invalidate all other active sessions after password change (force re-authentication on all other devices).
   - **Password reset (unauthenticated user)**: See Phase 8 (Account Recovery) for the full flow design.
   - **Password hash migration**: If upgrading from a weaker algorithm (e.g., SHA-256 to Argon2), re-hash passwords on next successful login:
     1. User logs in with password.
     2. Verify against the old hash.
     3. If valid, hash the password with Argon2 and store the new hash.
     4. Delete the old hash.
     5. Track migration progress — monitor the percentage of users still on the old algorithm.
     6. After sufficient time, force remaining users to reset their passwords.