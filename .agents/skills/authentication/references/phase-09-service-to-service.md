# Phase 9: Service-to-Service and Machine Authentication

### Phase 9: Service-to-Service and Machine Authentication

27. **Design service-to-service authentication.** Internal services authenticating to each other require different patterns than user authentication:

     **Mutual TLS (mTLS)** (recommended for zero-trust service mesh):
     - Each service has a unique X.509 certificate issued by an internal CA (or a service mesh CA like Istio's Citadel, SPIFFE/SPIRE).
     - On every connection, both client and server present and verify certificates.
     - Identity is derived from the certificate's Subject Alternative Name (SAN) — typically a SPIFFE ID: `spiffe://example.com/service/order-service`.
     - Certificate rotation must be automated (short-lived certificates, auto-renewed by the service mesh or a sidecar process). Manual certificate management does not scale.
     - Advantages: No shared secrets, strong cryptographic identity, works at the transport layer (no application code changes if using a service mesh).
     - When to use: Microservices in a service mesh (Istio, Linkerd), zero-trust architectures, high-security environments.

     **OAuth 2.0 Client Credentials** (recommended for API-based service-to-service):
     - Each service has a `client_id` and `client_secret` registered with the authorization server.
     - Service requests an access token with specific scopes and uses it to call other services.
     - Advantages: Standard protocol, scoped access, auditable, works with API gateways.
     - Credential management: Store client_secret in a secrets manager. Rotate periodically. Use asymmetric client authentication (private_key_jwt) for higher security — the service signs a JWT with its private key instead of transmitting a shared secret.

     **JWT-based service identity** (common in cloud-native environments):
     - Cloud providers offer workload identity: a service running on the platform receives a signed JWT automatically (AWS IAM roles + STS tokens, GCP service account tokens, Azure managed identity tokens).
     - The service uses this token to authenticate to other services or cloud resources.
     - Advantages: No secret management — credentials are injected by the platform and automatically rotated.
     - Use when: Services run on a cloud platform that supports workload identity. This should be the default for cloud-native services.

     **API keys for internal services** (acceptable for low-complexity environments):
     - Use when the overhead of OAuth or mTLS is not justified (small number of services, trusted internal network, low-security context).
     - Store the API key in a secrets manager, not in source code or environment variables.
     - Rotate keys periodically. Implement key revocation without downtime (accept both old and new keys during rotation window).
     - API keys identify the calling service but do not carry user context — they are not suitable for user-delegated access.

28. **Design service account management.**
     - Every service should have its own dedicated identity (service account). Never share credentials across services — if one service is compromised, only its credentials need to be revoked.
     - **Principle of least privilege**: Each service account has permissions for only the resources it needs to access. A billing service can call the payment API but not the user management API.
     - **Credential lifecycle**:
       - Creation: Automated via infrastructure-as-code or service registration API.
       - Storage: Secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager) with access policies restricting which services can read which secrets.
       - Rotation: Automated, on a schedule (90 days) or on demand after suspected compromise. Implement graceful rotation: issue new credential → update consuming services → revoke old credential. Support dual credentials during rotation.
       - Revocation: Immediate revocation capability. All dependent services must handle revocation gracefully (detect 401, alert, fail open or fail closed depending on criticality).
     - **Audit**: Log every service authentication event: which service authenticated, when, from where, using which credential. Monitor for anomalies: authentication from unexpected IP ranges, unusual call patterns, or credential usage outside expected hours.