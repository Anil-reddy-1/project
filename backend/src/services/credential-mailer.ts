/**
 * CredentialMailer — Email dispatch service using Brevo.
 * Derived from: tech-spec.md §11, §16
 *
 * Uses Brevo (formerly Sendinblue) for transactional email delivery.
 * Free tier: 300 emails/day, perfect for development and small MVP.
 *
 * Credential dispatch is used for:
 * - Admin-provisioned wholesaler/delivery partner accounts (password reset link)
 * - Wholesaler self-registration approval notification
 * - Account status changes (suspend, reactivate)
 */

import * as brevo from '@getbrevo/brevo';
import { env } from '../config/env';

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
  private client: brevo.BrevoClient | undefined;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!env.BREVO_API_KEY;
    
    if (this.isConfigured) {
      // Configure Brevo API client
      this.client = new brevo.BrevoClient({ apiKey: env.BREVO_API_KEY as string });
      
      console.log('✅ Brevo email service configured');
    } else {
      console.warn('⚠️  Brevo not configured - emails will be logged to console only');
    }
  }

  /**
   * Send a credential or account-status notification via email.
   * Falls back to console logging if Brevo is not configured.
   */
  async send(dispatch: CredentialDispatch): Promise<void> {
    const { subject, htmlContent, textContent } = this.formatEmail(dispatch);
    
    if (!this.isConfigured || !dispatch.to.email) {
      // Fallback to console logging
      this.logToConsole(dispatch, textContent);
      return;
    }

    try {
      await this.client!.transactionalEmails.sendTransacEmail({
        to: [{
          email: dispatch.to.email,
          name: dispatch.to.name,
        }],
        sender: {
          email: env.BREVO_FROM_EMAIL,
          name: env.BREVO_FROM_NAME,
        },
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
      });
      
      console.log(`✅ Email sent to ${dispatch.to.email} (${dispatch.type})`);
    } catch (error) {
      console.error('❌ Failed to send email via Brevo:', error);
      // Fallback to console logging so admin can manually send
      this.logToConsole(dispatch, textContent);
      throw error;
    }
  }

  private formatEmail(dispatch: CredentialDispatch): {
    subject: string;
    htmlContent: string;
    textContent: string;
  } {
    const { to, type, passwordResetLink } = dispatch;
    
    switch (type) {
      case "account_created":
        return {
          subject: 'Welcome to WholesaleHub - Set Your Password',
          textContent: [
            `Hi ${to.name},`,
            ``,
            `Your account has been created by an administrator.`,
            ``,
            `Email: ${to.email}`,
            `Phone: ${to.phone}`,
            ``,
            `To set your password and activate your account, click the link below:`,
            `${passwordResetLink}`,
            ``,
            `This link expires in 1 hour.`,
            ``,
            `Welcome to WholesaleHub!`,
            ``,
            `Best regards,`,
            `The WholesaleHub Team`,
          ].join('\n'),
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1F4E8C;">Welcome to WholesaleHub</h2>
              <p>Hi ${to.name},</p>
              <p>Your account has been created by an administrator.</p>
              <div style="background: #F8FAFC; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${to.email}</p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${to.phone}</p>
              </div>
              <p>To set your password and activate your account, click the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${passwordResetLink}" style="background: #1F4E8C; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Your Password</a>
              </div>
              <p style="color: #64748B; font-size: 14px;"><em>This link expires in 1 hour.</em></p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
              <p style="color: #64748B; font-size: 14px;">
                If you didn't expect this email, please contact our support team.
              </p>
              <p style="color: #64748B; font-size: 14px;">
                Best regards,<br>
                The WholesaleHub Team
              </p>
            </div>
          `,
        };
        
      case "account_approved":
        return {
          subject: 'Your WholesaleHub Account is Approved!',
          textContent: [
            `Hi ${to.name},`,
            ``,
            `Great news! Your account has been approved.`,
            ``,
            `To complete your registration and set your password, click the link below:`,
            `${passwordResetLink}`,
            ``,
            `This link expires in 1 hour.`,
            ``,
            `Welcome to WholesaleHub!`,
            ``,
            `Best regards,`,
            `The WholesaleHub Team`,
          ].join('\n'),
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10B981;">Account Approved! 🎉</h2>
              <p>Hi ${to.name},</p>
              <p>Great news! Your account has been approved by our team.</p>
              <p>To complete your registration and set your password, click the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${passwordResetLink}" style="background: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Your Password</a>
              </div>
              <p style="color: #64748B; font-size: 14px;"><em>This link expires in 1 hour.</em></p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
              <p style="color: #64748B; font-size: 14px;">
                Best regards,<br>
                The WholesaleHub Team
              </p>
            </div>
          `,
        };
        
      case "account_suspended":
        return {
          subject: 'WholesaleHub Account Suspended',
          textContent: [
            `Hi ${to.name},`,
            ``,
            `Your account has been temporarily suspended.`,
            ``,
            `If you believe this is an error or would like to discuss this decision, please contact our support team.`,
            ``,
            `Best regards,`,
            `The WholesaleHub Team`,
          ].join('\n'),
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #DC2626;">Account Suspended</h2>
              <p>Hi ${to.name},</p>
              <p>Your account has been temporarily suspended.</p>
              <p>If you believe this is an error or would like to discuss this decision, please contact our support team.</p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
              <p style="color: #64748B; font-size: 14px;">
                Best regards,<br>
                The WholesaleHub Team
              </p>
            </div>
          `,
        };
        
      case "account_reactivated":
        return {
          subject: 'Your WholesaleHub Account is Reactivated',
          textContent: [
            `Hi ${to.name},`,
            ``,
            `Good news! Your account has been reactivated.`,
            ``,
            `You can now log in and use all features of WholesaleHub.`,
            ``,
            `Welcome back!`,
            ``,
            `Best regards,`,
            `The WholesaleHub Team`,
          ].join('\n'),
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10B981;">Account Reactivated 🎉</h2>
              <p>Hi ${to.name},</p>
              <p>Good news! Your account has been reactivated.</p>
              <p>You can now log in and use all features of WholesaleHub.</p>
              <p>Welcome back!</p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
              <p style="color: #64748B; font-size: 14px;">
                Best regards,<br>
                The WholesaleHub Team
              </p>
            </div>
          `,
        };
        
      default:
        return {
          subject: 'WholesaleHub Notification',
          textContent: `Notification for ${to.name}`,
          htmlContent: `<p>Notification for ${to.name}</p>`,
        };
    }
  }

  private logToConsole(dispatch: CredentialDispatch, textContent: string): void {
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL NOTIFICATION (Brevo not configured or email missing)');
    console.log('='.repeat(80));
    console.log(`To: ${dispatch.to.name} <${dispatch.to.email || 'NO EMAIL'}>`);
    console.log(`Type: ${dispatch.type}`);
    console.log('─'.repeat(80));
    console.log(textContent);
    console.log('='.repeat(80) + '\n');
    
    if (dispatch.passwordResetLink) {
      console.log('⚠️  MANUAL ACTION REQUIRED:');
      console.log(`   Copy this password reset link and send it to ${dispatch.to.name}:`);
      console.log(`   ${dispatch.passwordResetLink}\n`);
    }
  }
}

/** Singleton instance — import this everywhere, don't instantiate separately */
export const credentialMailer = new CredentialMailer();
