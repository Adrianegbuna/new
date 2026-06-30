/**
 * Email Service for Frontend (Next.js)
 * Sends emails via RenewableZmart backend
 * 
 * Usage:
 * import { emailService } from '@/lib/emailService';
 * 
 * await emailService.sendWelcomeEmail('user@example.com', 'John', 'vendor');
 */

const EMAIL_API_URL = process.env.NEXT_PUBLIC_EMAIL_API_URL || 'http://localhost:4001';

interface User {
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  phone?: string;
}

interface EmailResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface HealthResponse {
  ok: boolean;
  data?: any;
  error?: string;
}

export const emailService = {
  /**
   * Send welcome email to new user
   * @param {string} email - User email address
   * @param {string} firstName - User first name
   * @param {string} accountType - Account type (customer, vendor, installer)
   */
  async sendWelcomeEmail(email: string, firstName: string, accountType: string = 'customer'): Promise<EmailResponse> {
    try {
      const response = await fetch(`${EMAIL_API_URL}/send-welcome-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          firstName: firstName,
          accountType: accountType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Welcome email failed:', data.error);
        return { success: false, error: data.error };
      }

      console.log('✅ Welcome email sent to:', email);
      return { success: true, data: data };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error sending welcome email:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Send admin notification for new registration
   * @param {object} user - User object with email, firstName, lastName, accountType, phone
   */
  async sendAdminNotification(user: User): Promise<EmailResponse> {
    try {
      const response = await fetch(`${EMAIL_API_URL}/send-admin-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Admin notification failed:', data.error);
        return { success: false, error: data.error };
      }

      console.log('✅ Admin notification sent');
      return { success: true, data: data };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error sending admin notification:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Send custom email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} message - Plain text message
   * @param {string} html - HTML content (optional)
   */
  async sendCustomEmail(to: string, subject: string, message: string, html: string | null = null): Promise<EmailResponse> {
    try {
      const response = await fetch(`${EMAIL_API_URL}/send-custom-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to,
          subject: subject,
          message: message,
          html: html,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Custom email failed:', data.error);
        return { success: false, error: data.error };
      }

      console.log('✅ Custom email sent to:', to);
      return { success: true, data: data };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error sending custom email:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Send simple email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   */
  async sendEmail(to: string, subject: string, message: string): Promise<EmailResponse> {
    try {
      const response = await fetch(`${EMAIL_API_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to,
          subject: subject,
          message: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Email send failed:', data.error);
        return { success: false, error: data.error };
      }

      console.log('✅ Email sent to:', to);
      return { success: true, data: data };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error sending email:', errorMessage);
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Check email server health
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${EMAIL_API_URL}/health`);
      const data = await response.json();
      return { ok: response.ok, data: data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Email server unreachable:', errorMessage);
      return { ok: false, error: errorMessage };
    }
  },
};
