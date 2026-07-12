/**
 * CredentialMailer — swappable credential dispatch interface.
 * Derived from: tech-spec.md §11, §16
 *
 * SMS/email vendor is UNRESOLVED (Twilio vs. MSG91 vs. other — tech-spec.md §16.2).
 * This stub implements the interface so all call-sites are wired and tested;
 * swap in a real vendor by implementing the send() method below.
 *
 * Credential dispatch is used for:
 * - Admin-provisioned wholesaler/delivery partner accounts (password reset link)
 * - Wholesaler self-registration approval notification
 * - (Phase 1+ only — no order-related notifications here)
 */

export interface CredentialDispatch {
  /** Recipient info */
  to: {
    name: string;
    email?: string;
    phone?: string;
  };
  /** What kind of message to send */
  type:
    | "account_created"        // Admin provisioned a new account
    | "account_approved"       // Admin approved a wholesaler self-registration
    | "account_suspended"      // Admin suspended an account
    | "account_reactivated";   // Admin reactivated a suspended account
  /** Password reset link (for account_created and account_approved) */
  passwordResetLink?: string;
}

export class CredentialMailer {
  /**
   * Send a credential or account-status notification.
   *
   * STUB: logs to console only. Wire to Twilio/MSG91/other when vendor is chosen.
   *
   * To swap in a real vendor:
   *   1. Pick the vendor (Twilio / MSG91 / other).
   *   2. Install their SDK and add API keys to .env.
   *   3. Replace the console.log below with the actual dispatch call.
   *   4. Handle failures (retry, dead-letter) per tech-spec.md §11.
   */
  async send(dispatch: CredentialDispatch): Promise<void> {
    // TODO: replace this stub with real vendor integration
    console.log(
      `\n[CredentialMailer STUB] Would dispatch:\n` +
        `  type: ${dispatch.type}\n` +
        `  to:   ${dispatch.to.name} <${dispatch.to.email ?? "—"}> / ${dispatch.to.phone ?? "—"}\n` +
        (dispatch.passwordResetLink
          ? `  link: ${dispatch.passwordResetLink}\n`
          : ""),
    );
  }
}

/** Singleton instance — import this everywhere, don't instantiate separately */
export const credentialMailer = new CredentialMailer();
