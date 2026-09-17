# Phase 16: Authentication Testing

### Phase 16: Authentication Testing

42. **Design authentication security testing.** Authentication systems must be rigorously tested because failures have severe consequences:

     **Unit tests**:
     - Password hashing: Verify correct algorithm, verify hash verification works, verify rejection of incorrect passwords, verify timing consistency (constant-time comparison).
     - JWT: Verify token generation with correct claims, verify token validation (correct signature, expiry, audience, issuer), verify rejection of tampered tokens, verify rejection of `alg: none`, verify rejection of tokens signed with wrong key, verify `kid` handling.
     - Session: Verify session creation, retrieval, expiry, invalidation, concurrent session enforcement.
     - Rate limiting: Verify lockout triggers at correct thresholds, verify lockout duration, verify reset after cooldown.

     **Integration tests**:
     - Complete login flow: Register → login → authenticated request → logout. Verify session/token is valid, verify post-logout session/token is invalid.
     - Password reset flow: Request → token validation → reset → verify new password works, verify old password does not work, verify all sessions are invalidated.
     - OAuth flow: Authorization redirect → callback → token exchange → authenticated request. Verify state validation, verify code cannot be reused, verify PKCE verification.
     - MFA flow: Login → MFA challenge → MFA verification → authenticated. Verify incorrect code is rejected, verify lockout after N failures.
     - Session timeout: Verify idle timeout, verify absolute timeout, verify session renewal.

     **Security tests**:
     - **Credential enumeration**: Verify login and registration endpoints do not reveal whether an account exists (consistent response times, consistent messages).
     - **Token manipulation**: Tamper with JWT claims, change the algorithm, modify the signature. Verify all are rejected.
     - **Session fixation**: Verify session ID changes after login.
     - **CSRF**: Verify state-changing authentication endpoints reject requests without valid CSRF tokens (or SameSite protection).
     - **Brute force**: Verify rate limiting engages and accounts lock after configured thresholds.
     - **Open redirect**: Verify redirect_uri validation in OAuth callbacks rejects unregistered URIs.
     - **Injection**: Test login, registration, and password reset forms for SQL injection and XSS.
     - **Cookie security**: Verify session cookies have HttpOnly, Secure, SameSite attributes.
     - **Token storage**: Verify tokens are not stored in insecure locations (localStorage in production builds).

     **Penetration testing**: Engage external security testers to attempt authentication bypass at least annually, and after any major authentication system changes.