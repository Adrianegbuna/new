import express, { Request, Response } from 'express';
import { emailService } from '../services/emailService';
import { authenticate } from '../middleware/auth';
import { EMAIL_FROM } from '../config/email';

const router = express.Router();

/**
 * POST /api/email/send-welcome
 * Send a welcome email to a new user
 */
router.post('/send-welcome', authenticate, async (req: Request, res: Response) => {
  try {
    const { email, firstName, accountType } = req.body;

    // Validate required fields
    if (!email || !firstName) {
      return res.status(400).json({
        success: false,
        message: 'Email and firstName are required',
      });
    }

    // Send welcome email
    const result = await emailService.sendWelcomeEmail(
      email,
      firstName,
      accountType || 'customer'
    );

    if (result && result.success) {
      return res.status(200).json({
        success: true,
        message: 'Welcome email sent successfully',
        data: result,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send welcome email',
        error: result?.message || 'Unknown error',
      });
    }
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * POST /api/email/send-notification
 * Send an admin notification for new user registration
 */
router.post('/send-notification', authenticate, async (req: Request, res: Response) => {
  try {
    const { user } = req.body;

    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'User object with email is required',
      });
    }

    // Send admin notification
    const result = await emailService.sendAdminRegistrationNotification(user);

    if (result && result.success) {
      return res.status(200).json({
        success: true,
        message: 'Admin notification sent successfully',
        data: result,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send admin notification',
        error: result?.message || 'Unknown error',
      });
    }
  } catch (error: any) {
    console.error('Error sending admin notification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * POST /api/email/send-custom
 * Send a custom email
 * Requires authentication
 */
router.post('/send-custom', authenticate, async (req: Request, res: Response) => {
  try {
    const { to, subject, text, html } = req.body;

    // Validate required fields
    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'to and subject are required',
      });
    }

    if (!text && !html) {
      return res.status(400).json({
        success: false,
        message: 'Either text or html content is required',
      });
    }

    // Send custom email using emailService.sendEmail
    const result = await emailService.sendEmail({
      to,
      subject,
      text,
      html,
    });

    if (result && result.success) {
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: result,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result?.message || 'Unknown error',
      });
    }
  } catch (error: any) {
    console.error('Error sending custom email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * POST /api/email/test
 * Test SendGrid connection
 * Public endpoint for testing purposes
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { email = 'test@renewablezmart.com', name = 'Test User' } = req.body;

    const result = await emailService.sendWelcomeEmail(email, name, 'customer');

    if (result?.success) {
      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          to: email,
          from: EMAIL_FROM,
          subject: 'Welcome to RenewableZmart! 🌱',
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result?.message || 'Unknown error',
      });
    }
  } catch (error: any) {
    console.error('Error in test email:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

export default router;

