# Phase 11: Single Sign-On (SSO) and Enterprise Authentication

### Phase 11: Single Sign-On (SSO) and Enterprise Authentication

30. **Design SSO architecture.** For applications serving enterprise customers who require SSO:

     **SAML 2.0** (legacy but still widely required by enterprises):
     - Your application is the **Service Provider (SP)**. The customer's identity system is the **Identity Provider (IdP)** (Okta, Azure AD, OneLogin, PingFederate, ADFS).
     - **SP-initiated flow** (most common):
       1. User visits your application.
       2. Your application generates a SAML AuthnRequest and redirects the user to the customer's IdP.
       3. User authenticates at the IdP.
       4. IdP generates a SAML Response (XML document containing an Assertion with user attributes), signs it, and POSTs it back to your application's Assertion Consumer Service (ACS) URL.
       5. Your application validates the SAML Response signature, extracts user attributes, and creates a local session.
     - **Critical validation**: Verify the XML signature (and canonicalization) using the IdP's certificate. Verify the Assertion's audience matches your SP entity ID. Verify the Assertion is not expired. Verify the InResponseTo matches the original request ID. Verify the Destination URL. **Use a well-tested SAML library** — SAML XML signature verification is notoriously difficult to implement correctly, and implementation flaws have led to critical authentication bypasses.
     - SAML metadata exchange: Your SP publishes metadata (entity ID, ACS URL, signing certificate) and the IdP publishes metadata (entity ID, SSO URL, signing certificate). Exchange metadata during SSO configuration.

     **OIDC-based SSO** (preferred for new implementations):
     - Same as OAuth 2.0 Authorization Code with PKCE (step 19), but the customer's IdP is the OIDC provider.
     - Advantages over SAML: JSON-based (simpler), better mobile support, standard token format (JWT), well-defined discovery and key rotation.
     - For enterprise customers: Support OIDC discovery — customers provide their issuer URL, and your application discovers endpoints and keys automatically.

     **SSO provider selection per customer**: Enterprise customers use different IdPs. Design a per-tenant SSO configuration:
     - Store: tenant_id, SSO protocol (SAML or OIDC), provider configuration (IdP metadata URL for SAML, issuer URL for OIDC), domain mapping (users from `@customer.com` are routed to this IdP).
     - **Domain-based routing**: On the login page, after the user enters their email, check the email domain against the SSO configuration. If a match is found, redirect to the customer's IdP instead of showing the password form.
     - **Enforce SSO**: Allow enterprise customers to require SSO for all users in their organization. When SSO is enforced, password-based login is disabled for that tenant's users. Provide a "break glass" mechanism for tenant admins in case the IdP is unavailable.

31. **Design Just-In-Time (JIT) provisioning.** When a user authenticates via SSO for the first time:
     - Automatically create a local user account using attributes from the SAML assertion or OIDC ID token (email, name, department, role).
     - Map IdP groups/roles to local application roles based on a configurable mapping: `IdP group "Engineering" → application role "editor"`.
     - On subsequent SSO logins, update the user's attributes and roles from the IdP (the IdP is the source of truth for user directory data).
     - **Deprovisioning**: When an employee leaves the customer's organization and is removed from the IdP, they can no longer authenticate via SSO. However, their local session may still be active. Design a session timeout or implement SCIM (System for Cross-domain Identity Management) for push-based deprovisioning — the IdP notifies your application to disable the user account.