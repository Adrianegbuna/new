import { sgMail, EMAIL_FROM, ADMIN_EMAIL as CONFIG_ADMIN_EMAIL } from '../config/email';

const ADMIN_EMAIL = CONFIG_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'vmaktproject@gmail.com';
// Use FRONTEND_URL from env, fallback to production URL
// Make sure it's ALWAYS the correct domain - never Vercel
const FRONTEND_URL = process.env.FRONTEND_URL?.trim() || 'https://renewablezmart.com';

interface EmailError {
  message: string;
  code?: string;
}

export const emailService = {
  /**
   * Send welcome email to new user
   */
  sendWelcomeEmail: async (userEmail: string, firstName: string, accountType: string, storeSlug?: string) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping welcome email to:', userEmail);
        return;
      }

      const loginUrl = `${FRONTEND_URL}`;
      const storeUrl = storeSlug ? `${FRONTEND_URL}/store/${storeSlug}` : null;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to RenewableZmart</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #0d9488;">Hello ${firstName}! 👋</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Welcome to <strong>RenewableZmart</strong>, Nigeria's leading marketplace for sustainable energy solutions. We connect customers, vendors, and professional installers to make renewable energy accessible, affordable, and reliable across Nigeria.
            </p>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Whether you're looking to power your home with solar energy, grow your renewable business, or provide installation services, RenewableZmart is your trusted partner for the green energy revolution.
            </p>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Your <strong>${accountType.toUpperCase()}</strong> account has been successfully created.
            </p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0d9488; margin-top: 0;">What's Next?</h3>
              <ul style="color: #1f2937; line-height: 1.8;">
                ${(accountType === 'vendor' || accountType === 'ev_vendor') ? `
                  <li>✓ Set up your store profile</li>
                  <li>✓ Add your products to our marketplace</li>
                  <li>✓ Start receiving orders from customers</li>
                ` : accountType === 'installer' ? `
                  <li>✓ Complete your professional profile</li>
                  <li>✓ Add your certifications and portfolio</li>
                  <li>✓ Connect with customers needing installation</li>
                ` : `
                  <li>✓ Browse our sustainable energy marketplace</li>
                  <li>✓ Find products and verified installers</li>
                  <li>✓ Use our tools to find the right solution for you</li>
                `}
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              ${storeUrl ? `
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                  <a href="${storeUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Visit Your Store →
                  </a>
                  <a href="${loginUrl}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                    Log In →
                  </a>
                </div>
              ` : `
                <a href="${loginUrl}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Log In to Your Account →
                </a>
              `}
            </div>
            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              📧 If you have any questions, contact us at support@renewablezmart.com
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.<br>
              Empowering Sustainable Energy in Nigeria 🌍
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: 'Welcome to RenewableZmart! 🌱',
        html,
      });
      console.log('✅ Welcome email sent to:', userEmail);
      return { success: true, message: 'Welcome email sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending welcome email:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Notify admin of new user registration
   */
  sendAdminRegistrationNotification: async (user: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping admin notification');
        return;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; padding: 20px;">
            <h2 style="color: white; margin: 0;">🆕 New User Registration</h2>
          </div>
          <div style="padding: 20px; background-color: #f9fafb;">
            <h3 style="color: #0d9488;">User Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; width: 40%;"><strong>Name:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${user.firstName} ${user.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${user.email}">${user.email}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${user.phone || 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Account Type:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong style="color: #0d9488;">${user.accountType ? user.accountType.toUpperCase() : 'CUSTOMER'}</strong></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Location:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${user.city || 'N/A'}, ${user.country || 'N/A'}</td>
              </tr>
              ${user.businessName ? `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Business:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${user.businessName}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px;"><strong>Registered:</strong></td>
                <td style="padding: 10px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${FRONTEND_URL}/admin/users" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Review User
              </a>
            </div>
          </div>
        </div>
      `;

      await sgMail.send({
        to: ADMIN_EMAIL,
        from: EMAIL_FROM,
        subject: `🆕 New ${user.accountType || 'Customer'} Registration - ${user.firstName} ${user.lastName}`,
        html,
      });
      console.log('✅ Admin registration notification sent');
      return { success: true, message: 'Admin notified' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending admin notification:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send login notification to user
   */
  sendLoginNotification: async (userEmail: string, firstName: string, loginInfo: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping login notification');
        return { success: false, message: 'SendGrid not configured' };
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">🔐 Login Activity Detected</h2>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="font-size: 16px; color: #1f2937;">Hello ${firstName},</p>
            <p style="font-size: 16px; color: #1f2937;">
              We detected a new login to your RenewableZmart account. Here are the details:
            </p>
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 8px 0; color: #1f2937;"><strong>⏰ Time:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>📍 Location:</strong> ${loginInfo.city || 'Unknown'}, ${loginInfo.country || 'Unknown'}</p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>🌐 IP Address:</strong> ${loginInfo.ip || 'N/A'}</p>
            </div>
            <p style="font-size: 14px; color: #ef4444;">
              ⚠️ If this wasn't you, please secure your account immediately by changing your password.
            </p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${FRONTEND_URL}/settings/security" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Secure My Account
              </a>
            </div>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '🔐 New Login to Your RenewableZmart Account',
        html,
      });
      console.log('✅ Login notification sent to:', userEmail);
      return { success: true, message: 'Login notification sent' };
    } catch (error) {
      const err = error as EmailError;
      // Log error but don't fail - login notifications are not critical
      console.warn('⚠️ Failed to send login notification:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Notify admin of user login
   */
  sendAdminLoginNotification: async (user: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping admin login notification');
        return { success: false, message: 'SendGrid not configured' };
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; padding: 20px;">
            <h2 style="color: white; margin: 0;">👤 User Login Activity</h2>
          </div>
          <div style="padding: 20px; background-color: #f9fafb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>User:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${user.firstName} ${user.lastName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${user.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Time:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px;"><strong>Location:</strong></td>
                <td style="padding: 8px;">${user.city || 'Unknown'}, ${user.country || 'Unknown'}</td>
              </tr>
            </table>
          </div>
        </div>
      `;

      await sgMail.send({
        to: ADMIN_EMAIL,
        from: EMAIL_FROM,
        subject: `👤 User Login - ${user.firstName} ${user.lastName}`,
        html,
      });
      console.log('✅ Admin login notification sent');
      return { success: true, message: 'Admin notified' };
    } catch (error) {
      const err = error as EmailError;
      // Log warning but don't fail - admin notifications are not critical
      console.warn('⚠️ Failed to send admin login notification:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send order confirmation to customer
   */
  sendOrderConfirmation: async (userEmail: string, firstName: string, orderDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping order confirmation');
        return;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Order Confirmed!</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="font-size: 16px; color: #1f2937;">Hello ${firstName},</p>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Thank you for your order! We've received your payment and are now processing your items for shipment. You'll receive another email once it ships.
            </p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0d9488; margin-top: 0;">📦 Order Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>#${orderDetails.id || 'N/A'}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Total Amount:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong style="color: #0d9488;">₦${parseFloat(orderDetails.total).toLocaleString()}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 10px;"><strong>Status:</strong></td>
                  <td style="padding: 10px;"><span style="background: #dbeafe; color: #0c4a6e; padding: 4px 8px; border-radius: 4px;">Processing</span></td>
                </tr>
              </table>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Log In to View Order Details
              </a>
            </div>
            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              📞 Questions? Contact us at support@renewablezmart.com or reply to this email.
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. Empowering Sustainable Energy 🌍
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: `✅ Order Confirmation - #${orderDetails.id}`,
        html,
      });
      console.log('✅ Order confirmation sent to:', userEmail);
      return { success: true, message: 'Order confirmation sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending order confirmation:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Notify admin of new order
   */
  sendAdminOrderNotification: async (orderDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping admin order notification');
        return;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; padding: 20px;">
            <h2 style="color: white; margin: 0;">🆕 New Order Received!</h2>
          </div>
          <div style="padding: 20px; background-color: #f9fafb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Order ID:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>#${orderDetails.id}</strong></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${orderDetails.customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${orderDetails.customerEmail}">${orderDetails.customerEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Total:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong style="color: #10b981;">₦${parseFloat(orderDetails.total).toLocaleString()}</strong></td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Items:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${orderDetails.itemCount || '1'}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Time:</strong></td>
                <td style="padding: 10px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${FRONTEND_URL}/admin/orders/${orderDetails.id}" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Manage Order
              </a>
            </div>
          </div>
        </div>
      `;

      await sgMail.send({
        to: ADMIN_EMAIL,
        from: EMAIL_FROM,
        subject: `🆕 New Order #${orderDetails.id} - ₦${parseFloat(orderDetails.total).toLocaleString()}`,
        html,
      });
      console.log('✅ Admin order notification sent');
      return { success: true, message: 'Admin notified' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending admin order notification:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send order status update email
   */
  sendOrderStatusUpdate: async (
    userEmail: string,
    userName: string,
    orderId: string,
    status: string,
    trackingNumber?: string,
    carrier?: string
  ) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping order status update');
        return;
      }

      const statusMessages: { [key: string]: { title: string; icon: string; message: string; color: string } } = {
        'processing': {
          title: 'Order is Being Processed',
          icon: '⚙️',
          message: 'Your order is being prepared and packaged for shipment.',
          color: '#3b82f6'
        },
        'shipped': {
          title: 'Order Has Been Shipped',
          icon: '📦',
          message: 'Your order is on its way to you!',
          color: '#8b5cf6'
        },
        'in_transit': {
          title: 'Order In Transit',
          icon: '🚚',
          message: 'Your order is currently in transit to your location.',
          color: '#6366f1'
        },
        'out_for_delivery': {
          title: 'Out for Delivery',
          icon: '📫',
          message: 'Your order is out for delivery and will arrive soon!',
          color: '#f59e0b'
        },
        'delivered': {
          title: 'Order Delivered',
          icon: '✅',
          message: 'Your order has been successfully delivered. Thank you for shopping with us!',
          color: '#10b981'
        },
        'cancelled': {
          title: 'Order Cancelled',
          icon: '❌',
          message: 'Your order has been cancelled. Please contact support for more information.',
          color: '#ef4444'
        }
      };

      const statusInfo = statusMessages[status] || {
        title: 'Order Status Updated',
        icon: '📧',
        message: 'Your order status has been updated.',
        color: '#0d9488'
      };

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${statusInfo.color}; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">${statusInfo.icon} ${statusInfo.title}</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="font-size: 16px; color: #1f2937;">Hello ${userName},</p>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              ${statusInfo.message}
            </p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: ${statusInfo.color}; margin-top: 0;">📋 Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Order ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>#${orderId}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Status:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><span style="background: ${statusInfo.color}20; color: ${statusInfo.color}; padding: 4px 8px; border-radius: 4px;">${status.replace(/_/g, ' ').toUpperCase()}</span></td>
                </tr>
                ${trackingNumber ? `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Tracking #:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>${trackingNumber}</strong></td>
                </tr>
                ` : ''}
                ${carrier ? `
                <tr>
                  <td style="padding: 10px;"><strong>Carrier:</strong></td>
                  <td style="padding: 10px;">${carrier}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}" style="background-color: ${statusInfo.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Log In to Track Order
              </a>
            </div>
            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              ❓ Questions? Contact us at support@renewablezmart.com
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. Empowering Sustainable Energy 🌍
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: `${statusInfo.icon} ${statusInfo.title} - Order #${orderId}`,
        html,
      });
      console.log('✅ Order status update email sent');
      return { success: true, message: 'Status update sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending order status update:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send payment confirmation email
   */
  sendPaymentConfirmation: async (userEmail: string, userName: string, paymentDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping payment confirmation');
        return;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #10b981; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Payment Successful</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="font-size: 16px; color: #1f2937;">Hello ${userName},</p>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Your payment has been successfully processed. Thank you for your purchase!
            </p>
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #10b981; margin-top: 0;">💳 Payment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Transaction ID:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${paymentDetails.transactionId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Amount:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong style="color: #10b981;">₦${parseFloat(paymentDetails.amount).toLocaleString()}</strong></td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Payment Method:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${paymentDetails.method || 'Card'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px;"><strong>Date:</strong></td>
                  <td style="padding: 10px;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>
            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              📧 Keep this email for your records. Questions? Contact support@renewablezmart.com
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: `✅ Payment Confirmation - ₦${parseFloat(paymentDetails.amount).toLocaleString()}`,
        html,
      });
      console.log('✅ Payment confirmation sent to:', userEmail);
      return { success: true, message: 'Payment confirmation sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending payment confirmation:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Generic send email method
   */
  sendEmail: async (options: { to: string; subject: string; text?: string; html?: string }) => {
    try {
      if (!EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping generic email to:', options.to);
        return;
      }

      await sgMail.send({
        to: options.to,
        from: EMAIL_FROM,
        subject: options.subject,
        text: options.text || '',
        html: options.html || options.text || '',
      });
      console.log('✅ Email sent successfully to:', options.to);
      return { success: true, message: 'Email sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending email:', err.message);
      throw error;
    }
  },

  /**
   * Send comprehensive purchase confirmation (order + payment)
   */
  sendPurchaseConfirmation: async (userEmail: string, userName: string, purchaseDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping purchase confirmation');
        return { success: false, message: 'SendGrid not configured' };
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">✅ Purchase Confirmed!</h2>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="font-size: 16px; color: #1f2937;">Hello ${userName},</p>
            <p style="font-size: 16px; color: #1f2937;">
              Thank you for your purchase! Your order has been confirmed and payment received.
            </p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0d9488; margin-top: 0;">Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Order ID:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${purchaseDetails.orderId || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Order Date:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleDateString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Items:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${purchaseDetails.itemCount || 0} item(s)</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488;">
              <h3 style="color: #0d9488; margin-top: 0;">Payment Received</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px;"><strong>Amount Paid:</strong></td>
                  <td style="padding: 8px; text-align: right; font-size: 18px; font-weight: bold; color: #0d9488;">₦${purchaseDetails.amount || '0.00'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px;"><strong>Payment Reference:</strong></td>
                  <td style="padding: 8px; text-align: right;">${purchaseDetails.reference || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px;"><strong>Payment Status:</strong></td>
                  <td style="padding: 8px; text-align: right;"><span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px;">✅ Paid</span></td>
                </tr>
              </table>
            </div>

            <p style="font-size: 14px; color: #1f2937;">
              📦 Your order is being prepared for shipment. You'll receive a tracking number as soon as it ships.
            </p>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${FRONTEND_URL}/orders" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Track Order
              </a>
            </div>

            <p style="font-size: 14px; color: #1f2937; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              If you have any questions, please contact our support team at ${ADMIN_EMAIL}
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '✅ Your Purchase is Confirmed - RenewableZmart',
        html,
      });
      console.log('✅ Purchase confirmation sent to:', userEmail);
      return { success: true, message: 'Purchase confirmation sent' };
    } catch (error) {
      const err = error as EmailError;
      console.warn('⚠️ Failed to send purchase confirmation:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send delivery notification to vendor when their product is delivered
   */
  sendVendorDeliveryNotification: async (vendorEmail: string, vendorName: string, orderDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping vendor delivery notification');
        return;
      }

      const dashboardUrl = `${FRONTEND_URL}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">📦 Product Delivered!</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #0d9488;">Great news, ${vendorName}!</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              One of your products has been successfully delivered to the customer! 🎉
            </p>
            <div style="background-color: #ecfdf5; border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #0d9488;"><strong>Order ID:</strong> ${orderDetails.orderId}</p>
              <p style="margin: 5px 0; color: #0d9488;"><strong>Customer:</strong> ${orderDetails.customerName}</p>
              <p style="margin: 5px 0; color: #0d9488;"><strong>Total Value:</strong> ₦${Number(orderDetails.total).toLocaleString('en-NG')}</p>
            </div>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              The customer may now write a review for your products. Encourage them to share their experience and help build your store's reputation on RenewableZmart.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View in Dashboard →
              </a>
            </div>
            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              📧 For questions or support, contact us at support@renewablezmart.com
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.<br>
              Empowering Sustainable Energy in Nigeria 🌍
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: vendorEmail,
        from: EMAIL_FROM,
        subject: '✅ Your Product Has Been Delivered - RenewableZmart',
        html,
      });
      console.log('✅ Vendor delivery notification sent to:', vendorEmail);
      return { success: true, message: 'Vendor notification sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending vendor delivery notification:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send review request email to customer when order is delivered
   */
  sendReviewRequest: async (customerEmail: string, customerName: string, orderDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping review request');
        return;
      }

      const reviewUrl = `${FRONTEND_URL}/orders/${orderDetails.orderId}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">⭐ Share Your Experience</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #0d9488;">Hi ${customerName}! 👋</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Your order has been delivered! We'd love to hear about your experience with the products you purchased.
            </p>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e;"><strong>Order ID:</strong> ${orderDetails.orderId}</p>
              <p style="margin: 5px 0; color: #92400e;"><strong>Items Delivered:</strong> ${orderDetails.itemCount}</p>
              <p style="margin: 5px 0; color: #92400e;"><strong>Delivery Date:</strong> ${new Date().toLocaleDateString('en-NG')}</p>
            </div>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Your feedback helps:
            </p>
            <ul style="color: #1f2937; line-height: 1.8; margin: 10px 0;">
              <li>✓ Other customers make informed decisions</li>
              <li>✓ Vendors improve their products and services</li>
              <li>✓ RenewableZmart build a trusted community</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${reviewUrl}" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Write a Review →
              </a>
            </div>
            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              📧 Questions? Contact our support team at support@renewablezmart.com
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.<br>
              Empowering Sustainable Energy in Nigeria 🌍
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: customerEmail,
        from: EMAIL_FROM,
        subject: '⭐ How was your purchase? Share a review - RenewableZmart',
        html,
      });
      console.log('✅ Review request sent to:', customerEmail);
      return { success: true, message: 'Review request sent' };
    } catch (error) {
      const err = error as EmailError;
      console.warn('⚠️ Failed to send review request:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send admin notification when order is delivered
   */
  sendAdminDeliveryNotification: async (orderDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping admin delivery notification');
        return;
      }

      const adminDashboardUrl = `${FRONTEND_URL}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #7c3aed, #6366f1); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">📦 Order Delivered</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #7c3aed;">Order Successfully Delivered</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              An order has been marked as delivered. Here are the details:
            </p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; width: 40%;"><strong>Order ID:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${orderDetails.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Customer:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${orderDetails.customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Items Count:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${orderDetails.itemCount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Total Amount:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">₦${Number(orderDetails.total).toLocaleString('en-NG')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px;"><strong>Delivery Date:</strong></td>
                  <td style="padding: 8px;">${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
              </table>
            </div>
            <p style="font-size: 14px; color: #1f2937;">
              Customer review has been requested. Monitor review submissions for quality and authenticity.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${adminDashboardUrl}" style="background-color: #7c3aed; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View in Admin Dashboard →
              </a>
            </div>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart Admin Panel
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: ADMIN_EMAIL,
        from: EMAIL_FROM,
        subject: '📦 Order Delivered - Customer Review Requested',
        html,
      });
      console.log('✅ Admin delivery notification sent');
      return { success: true, message: 'Admin notification sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending admin delivery notification:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send purchase notification to vendor when customer buys their product
   */
  sendVendorPurchaseNotification: async (vendorEmail: string, vendorName: string, orderDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping vendor purchase notification');
        return { success: false, message: 'SendGrid not configured' };
      }

      const vendorDashboardUrl = `${FRONTEND_URL}`;
      const totalAmount = orderDetails.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0).toFixed(2);
      
      const itemsHtml = orderDetails.items.map((item: any) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: left;">${item.productName}</td>
          <td style="padding: 12px; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px; text-align: right;">₦${Number(item.price).toLocaleString()}</td>
          <td style="padding: 12px; text-align: right;">₦${(item.price * item.quantity).toLocaleString()}</td>
        </tr>
      `).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 New Order Received!</h1>
            <p style="color: #d1fae5; margin: 10px 0 0 0;">A customer has purchased from your store</p>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="font-size: 16px; color: #1f2937;">Hello ${vendorName},</p>
            <p style="font-size: 16px; color: #1f2937; line-height: 1.8;">
              Great news! A customer has just purchased products from your store on RenewableZmart. Here are the order details:
            </p>
            
            <div style="background: white; border: 2px solid #d1d5db; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #0d9488; margin-top: 0;">📋 Order Summary</h3>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Order ID:</strong> ${orderDetails.orderId}</p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Customer:</strong> ${orderDetails.customerName || 'Valued Customer'}</p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Email:</strong> <a href="mailto:${orderDetails.customerEmail}" style="color: #0d9488;">${orderDetails.customerEmail}</a></p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Order Date:</strong> ${new Date().toLocaleString()}</p>
              
              <h3 style="color: #0d9488; margin-top: 20px; margin-bottom: 10px;">📦 Items Ordered</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db;">
                    <th style="padding: 12px; text-align: left; font-weight: bold;">Product</th>
                    <th style="padding: 12px; text-align: center; font-weight: bold;">Qty</th>
                    <th style="padding: 12px; text-align: right; font-weight: bold;">Price</th>
                    <th style="padding: 12px; text-align: right; font-weight: bold;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 15px;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0d9488;">
                  Total Amount: ₦${totalAmount}
                </p>
              </div>
            </div>

            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #047857;"><strong>📍 Shipping Address:</strong></p>
              <p style="margin: 8px 0 0 0; color: #047857;">${orderDetails.shippingAddress || 'To be provided by customer'}</p>
            </div>

            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #0d9488; margin-top: 0;">⚡ Next Steps</h3>
              <ul style="color: #1f2937; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Confirm that you can fulfill this order</li>
                <li>Prepare the items for shipment</li>
                <li>Update the order status in your dashboard</li>
                <li>Contact the customer if you need any clarification</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${vendorDashboardUrl}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View Order in Dashboard →
              </a>
            </div>

            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              This is an automated notification. Please do not reply to this email. For support, contact us at support@renewablezmart.com
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.<br>
              Empowering Sustainable Energy in Nigeria 🌍
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: vendorEmail,
        from: EMAIL_FROM,
        subject: `🎉 New Order Received - Order #${orderDetails.orderId}`,
        html,
      });
      console.log('✅ Vendor purchase notification sent to:', vendorEmail);
      return { success: true, message: 'Vendor notified of purchase' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending vendor purchase notification:', err.message);
      return { success: false, message: err.message };
    }
  },

  /**
   * Send shipment notification to customer
   */
  sendShipmentNotification: async (customerEmail: string, customerName: string, shipmentDetails: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping shipment notification');
        return { success: false, message: 'SendGrid not configured' };
      }

      const trackOrderUrl = `${FRONTEND_URL}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📦 Your Order Has Been Shipped!</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="font-size: 16px; color: #1f2937;">Hello ${customerName},</p>
            <p style="font-size: 16px; color: #1f2937; line-height: 1.8;">
              Exciting news! Your order has been shipped and is on its way to you. Track your delivery below:
            </p>
            
            <div style="background: white; border: 2px solid #d1d5db; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #0d9488; margin-top: 0;">📋 Shipment Details</h3>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Order ID:</strong> ${shipmentDetails.orderId}</p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Tracking Number:</strong> <span style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${shipmentDetails.trackingNumber || 'Coming soon'}</span></p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Shipped Date:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Estimated Delivery:</strong> ${shipmentDetails.estimatedDelivery || '5-7 business days'}</p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Shipping From:</strong> ${shipmentDetails.shippingFrom || 'RenewableZmart Hub'}</p>
              <p style="margin: 8px 0; color: #1f2937;"><strong>Shipping To:</strong> ${shipmentDetails.shippingAddress || 'Your address'}</p>
            </div>

            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #047857;"><strong>✓ What to expect:</strong></p>
              <ul style="margin: 8px 0 0 0; color: #047857; padding-left: 20px;">
                <li>Your package will be delivered within the estimated timeframe</li>
                <li>You can track your delivery progress anytime</li>
                <li>You'll receive updates via email and SMS (if provided)</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackOrderUrl}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Track Your Order →
              </a>
            </div>

            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #1f2937;"><strong>📞 Need Help?</strong></p>
              <p style="margin: 8px 0 0 0; color: #1f2937;">If you have any questions about your shipment, contact our support team at <a href="mailto:support@renewablezmart.com" style="color: #0d9488;">support@renewablezmart.com</a></p>
            </div>

            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              Thank you for shopping at RenewableZmart!
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.<br>
              Empowering Sustainable Energy in Nigeria 🌍
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: customerEmail,
        from: EMAIL_FROM,
        subject: `📦 Your Order #${shipmentDetails.orderId} Has Been Shipped!`,
        html,
      });
      console.log('✅ Shipment notification sent to:', customerEmail);
      return { success: true, message: 'Shipment notification sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending shipment notification:', err.message);
      return { success: false, message: err.message };
    }
  },

  // ============================================
  // SERVICE REQUEST EMAIL TEMPLATES
  // ============================================

  /**
   * Send email when service request is approved
   */
  sendServiceRequestApprovedEmail: async (userEmail: string, userName: string) => {
    try {
      if (!EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping service request approved email');
        return;
      }

      const dashboardUrl = `${FRONTEND_URL}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Service Request Approved</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #0d9488;">Great News, ${userName}!</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Your service request has been reviewed and <strong>approved</strong>. Our team will be in touch shortly to schedule the service at your convenience.
            </p>
            <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p style="color: #15803d; margin: 0;"><strong>What happens next?</strong></p>
              <ul style="color: #15803d; margin: 10px 0 0 20px;">
                <li>We will assign a qualified technician to your request</li>
                <li>You'll receive an email with technician details and available dates</li>
                <li>Confirm your preferred date and time</li>
                <li>Service will be completed as scheduled</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                View Your Request
              </a>
            </div>
            <p style="font-size: 14px; color: #1f2937;">
              If you have any questions, reply to this email or contact our support team.
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '✅ Your Service Request Has Been Approved',
        html,
      });
      console.log('✅ Service request approved email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending service request approved email:', err.message);
    }
  },

  /**
   * Send email when service request is rejected
   */
  sendServiceRequestRejectedEmail: async (userEmail: string, userName: string, reason: string) => {
    try {
      if (!EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping service request rejected email');
        return;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #dc2626, #ef4444); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Service Request Status Update</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #dc2626;">Hello ${userName},</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              We regret to inform you that your service request could not be approved at this time.
            </p>
            <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p style="color: #991b1b; margin: 0;"><strong>Reason:</strong></p>
              <p style="color: #991b1b; margin: 5px 0 0 0;">${reason || 'Please contact support for details'}</p>
            </div>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              If you would like to discuss this decision or have questions, please feel free to contact our support team. We're here to help!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:support@renewablezmart.com" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                Contact Support
              </a>
            </div>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: 'Service Request Status Update',
        html,
      });
      console.log('✅ Service request rejected email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending service request rejected email:', err.message);
    }
  },

  /**
   * Send email when service request is assigned to installer
   */
  sendServiceRequestAssignedEmail: async (installerEmail: string, customerName: string, serviceType: string) => {
    try {
      if (!EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping service request assigned email');
        return;
      }

      const dashboardUrl = `${FRONTEND_URL}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">📌 New Service Request Assigned</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #0d9488;">Hello Technician,</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              You have been assigned a new service request that matches your expertise.
            </p>
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #0c4a6e; font-weight: bold; margin: 0 0 10px 0;">📋 Request Details:</p>
              <p style="color: #0c4a6e; margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>
              <p style="color: #0c4a6e; margin: 5px 0;"><strong>Service Type:</strong> ${serviceType}</p>
              <p style="color: #0c4a6e; margin: 5px 0;"><strong>Status:</strong> Assigned to you</p>
            </div>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Please log in to your dashboard to view the complete request details and communicate with the customer to schedule the service.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                View in Dashboard
              </a>
            </div>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: installerEmail,
        from: EMAIL_FROM,
        subject: `📌 New Service Request: ${serviceType}`,
        html,
      });
      console.log('✅ Service request assigned email sent to:', installerEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending service request assigned email:', err.message);
    }
  },

  /**
   * Send email when service request is completed
   */
  sendServiceRequestCompletedEmail: async (userEmail: string, userName: string) => {
    try {
      if (!EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping service request completed email');
        return;
      }

      const dashboardUrl = `${FRONTEND_URL}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Service Completed Successfully</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #0d9488;">Thank You, ${userName}!</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              Your service has been completed successfully. We appreciate your business and hope you're satisfied with the work.
            </p>
            <div style="background-color: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p style="color: #15803d; margin: 0;"><strong>What's Next?</strong></p>
              <ul style="color: #15803d; margin: 10px 0 0 20px;">
                <li>View the final service report in your dashboard</li>
                <li>Download any relevant documentation</li>
                <li>Leave feedback for the technician</li>
                <li>Contact us if you need any follow-up support</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                View Service Details
              </a>
            </div>
            <p style="font-size: 14px; color: #1f2937;">
              If you have any questions or need assistance, we're here to help!
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              © 2025 RenewableZmart. All rights reserved.
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '✅ Your Service Has Been Completed',
        html,
      });
      console.log('✅ Service request completed email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending service request completed email:', err.message);
    }
  },

  /**
   * Send password reset email
   */
  sendPasswordResetEmail: async (userEmail: string, firstName: string, resetUrl: string) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping password reset email to:', userEmail);
        return;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <h2 style="color: #0d9488;">Hi ${firstName},</h2>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              We received a request to reset your RenewableZmart account password. Click the button below to set a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #0d9488; color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
            <p style="font-size: 14px; line-height: 1.8; color: #6b7280;">
              Or copy and paste this link in your browser: <br/>
              <a href="${resetUrl}" style="color: #0d9488; word-break: break-all;">${resetUrl}</a>
            </p>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⚠️ <strong>Security:</strong> This link expires in 1 hour. If you didn't request a password reset, please ignore this email and your account will remain secure.
              </p>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart Team</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '🔐 Password Reset Request for RenewableZmart',
        html,
      });
      console.log('✅ Password reset email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending password reset email:', err.message);
    }
  },

  // Send installer verification confirmation email
  sendInstallerVerificationEmail: async (installerEmail: string, firstName: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #10b981; margin: 0; font-size: 28px;">✅ Profile Verified!</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${firstName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              Great news! Your professional profile on <strong>RenewableZmart</strong> has been verified and approved. You can now:
            </p>

            <ul style="font-size: 15px; color: #374151; margin: 15px 0 15px 20px;">
              <li style="margin-bottom: 10px;">✓ Receive service requests from customers</li>
              <li style="margin-bottom: 10px;">✓ Submit quotations and bids</li>
              <li style="margin-bottom: 10px;">✓ Build your portfolio with completed projects</li>
              <li style="margin-bottom: 10px;">✓ Increase your visibility to potential customers</li>
            </ul>

            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>Next Steps:</strong> Log in to your dashboard to complete your profile by adding certifications, service packages, and project gallery to attract more customers.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/installer/dashboard" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                Go to Your Dashboard
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 30px 0 0 0;">
              If you have any questions, please contact our support team at <a href="mailto:support@renewablezmart.com" style="color: #10b981; text-decoration: none;">support@renewablezmart.com</a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart Team</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: installerEmail,
        from: EMAIL_FROM,
        subject: '✅ Your RenewableZmart Professional Profile is Verified',
        html,
      });
      console.log('✅ Installer verification email sent to:', installerEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending installer verification email:', err.message);
    }
  },

  // Send installer rejection/additional info needed email
  sendInstallerRejectionEmail: async (installerEmail: string, firstName: string, rejectionNotes?: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #f97316; margin: 0; font-size: 28px;">⏳ Profile Under Review</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${firstName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              Thank you for submitting your professional profile to <strong>RenewableZmart</strong>. Our verification team has reviewed your application and needs additional information before approval.
            </p>

            ${rejectionNotes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f97316; padding: 16px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;"><strong>Feedback:</strong></p>
                <p style="margin: 0; color: #92400e; font-size: 14px;">${rejectionNotes}</p>
              </div>
            ` : ''}

            <p style="font-size: 15px; color: #374151; margin-top: 20px;">
              <strong>What You Can Do:</strong>
            </p>

            <ul style="font-size: 15px; color: #374151; margin: 10px 0 15px 20px;">
              <li style="margin-bottom: 10px;">📋 Update your profile with the requested information</li>
              <li style="margin-bottom: 10px;">📸 Add clear photos of your certifications</li>
              <li style="margin-bottom: 10px;">⭐ Complete your professional details</li>
              <li style="margin-bottom: 10px;">📝 Provide detailed information about your experience</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/installer/dashboard" style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                Update Your Profile
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 30px 0 0 0;">
              Once you've made the requested changes, our team will review your profile again within 24-48 hours. If you have any questions, please don't hesitate to contact us at <a href="mailto:support@renewablezmart.com" style="color: #f97316; text-decoration: none;">support@renewablezmart.com</a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart Verification Team</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: installerEmail,
        from: EMAIL_FROM,
        subject: '📋 Your RenewableZmart Profile - Additional Information Needed',
        html,
      });
      console.log('✅ Installer rejection/feedback email sent to:', installerEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending installer rejection email:', err.message);
    }
  },

  // Send vendor/store approval email
  sendVendorApprovalEmail: async (vendorEmail: string, firstName: string, storeName: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #10b981; margin: 0; font-size: 28px;">✅ Store Approved!</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${firstName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              Congratulations! Your store <strong>${storeName}</strong> has been verified and approved on <strong>RenewableZmart</strong>. Your store is now live and visible to customers!
            </p>

            <ul style="font-size: 15px; color: #374151; margin: 15px 0 15px 20px;">
              <li style="margin-bottom: 10px;">✓ Your store is now publicly visible</li>
              <li style="margin-bottom: 10px;">✓ Start receiving orders from customers</li>
              <li style="margin-bottom: 10px;">✓ Manage products and inventory</li>
              <li style="margin-bottom: 10px;">✓ Track orders and sales performance</li>
            </ul>

            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                <strong>Next Steps:</strong> Log in to your vendor dashboard to optimize your store profile, add high-quality product images, and competitive pricing to attract more customers.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/vendor-dashboard" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                Go to Vendor Dashboard
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 30px 0 0 0;">
              Need help getting started? Contact our vendor support team at <a href="mailto:vendor-support@renewablezmart.com" style="color: #10b981; text-decoration: none;">vendor-support@renewablezmart.com</a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart Vendor Team</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: vendorEmail,
        from: EMAIL_FROM,
        subject: '✅ Your Store on RenewableZmart is Approved and Live!',
        html,
      });
      console.log('✅ Vendor approval email sent to:', vendorEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending vendor approval email:', err.message);
    }
  },

  // Send vendor/store rejection email
  sendVendorRejectionEmail: async (vendorEmail: string, firstName: string, storeName: string, rejectionNotes?: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #f97316; margin: 0; font-size: 28px;">⏳ Store Under Review</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${firstName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              Thank you for setting up your store <strong>${storeName}</strong> on RenewableZmart. Our verification team has reviewed your application and needs additional information before approval.
            </p>

            ${rejectionNotes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f97316; padding: 16px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;"><strong>Feedback:</strong></p>
                <p style="margin: 0; color: #92400e; font-size: 14px;">${rejectionNotes}</p>
              </div>
            ` : ''}

            <p style="font-size: 15px; color: #374151; margin-top: 20px;">
              <strong>What You Can Do:</strong>
            </p>

            <ul style="font-size: 15px; color: #374151; margin: 10px 0 15px 20px;">
              <li style="margin-bottom: 10px;">📋 Update your store profile with requested information</li>
              <li style="margin-bottom: 10px;">📸 Add professional store logo and banner images</li>
              <li style="margin-bottom: 10px;">⭐ Complete all required store details</li>
              <li style="margin-bottom: 10px;">📝 Provide accurate business information</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/vendor-dashboard" style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                Update Store Information
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 30px 0 0 0;">
              Once you've made the requested changes, our team will review your store again within 24 hours. If you have questions, contact us at <a href="mailto:vendor-support@renewablezmart.com" style="color: #f97316; text-decoration: none;">vendor-support@renewablezmart.com</a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart Verification Team</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: vendorEmail,
        from: EMAIL_FROM,
        subject: '📋 Your Store on RenewableZmart - Additional Information Needed',
        html,
      });
      console.log('✅ Vendor rejection email sent to:', vendorEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending vendor rejection email:', err.message);
    }
  },

  // Send refund processed notification
  sendRefundProcessedEmail: async (userEmail: string, userName: string, refundDetails: any) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #10b981; margin: 0; font-size: 28px;">✅ Refund Processed</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${userName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              Your refund has been successfully processed. Here are the details:
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Order ID:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${refundDetails.orderId}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Refund Amount:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; color: #10b981; font-weight: bold;">₦${refundDetails.amount ? refundDetails.amount.toLocaleString('en-NG') : '0'}</td>
              </tr>
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Processed On:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${new Date(refundDetails.processedDate).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Expected in Account:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">3-5 business days</td>
              </tr>
            </table>

            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                The refund will be credited to your original payment method within 3-5 business days.
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 20px 0;">
              If you have any questions about this refund, please contact our support team at <a href="mailto:support@renewablezmart.com" style="color: #10b981; text-decoration: none;">support@renewablezmart.com</a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart Customer Support</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '✅ Your Refund Has Been Processed',
        html,
      });
      console.log('✅ Refund processed email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending refund email:', err.message);
    }
  },

  // Send return request confirmation
  sendReturnRequestConfirmationEmail: async (userEmail: string, userName: string, returnDetails: any) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #3b82f6; margin: 0; font-size: 28px;">📋 Return Request Submitted</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${userName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              We've received your return request. Here are the details:
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Order ID:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${returnDetails.orderId}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Return ID:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${returnDetails.returnId}</td>
              </tr>
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Status:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><span style="background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px;">PENDING</span></td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Reason:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${returnDetails.reason}</td>
              </tr>
            </table>

            <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;"><strong>What's Next?</strong></p>
              <p style="margin: 0; color: #1e40af; font-size: 14px;">Our team will review your return request within 24 hours. You'll receive an email with return shipping instructions and approval status.</p>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 20px 0;">
              Track your return status anytime on your account dashboard.
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart Customer Support</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '📋 Return Request Received - We\'ll Review It Soon',
        html,
      });
      console.log('✅ Return request confirmation email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending return request email:', err.message);
    }
  },

  // Send review posted notification to store/vendor
  sendReviewPostedNotificationEmail: async (vendorEmail: string, vendorName: string, reviewDetails: any) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #f59e0b; margin: 0; font-size: 28px;">⭐ New Review Posted</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${vendorName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              A customer just left a review on ${reviewDetails.target === 'store' ? 'your store' : 'your product'}:
            </p>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">
                <strong>${'⭐'.repeat(reviewDetails.rating)}</strong> ${reviewDetails.rating} out of 5
              </p>
              <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">
                <strong>From:</strong> ${reviewDetails.customerName}
              </p>
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <em>"${reviewDetails.comment}"</em>
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/vendor-dashboard/reviews" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                View All Reviews
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 20px 0;">
              Reviews help potential customers make purchasing decisions. Consider responding to this review in your dashboard to build customer trust and loyalty.
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: vendorEmail,
        from: EMAIL_FROM,
        subject: `⭐ New Review: ${reviewDetails.rating} Stars`,
        html,
      });
      console.log('✅ Review posted notification sent to:', vendorEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending review notification email:', err.message);
    }
  },

  // Send service request consultation fee payment confirmation
  sendServiceRequestFeePaymentEmail: async (userEmail: string, userName: string, serviceDetails: any) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #10b981; margin: 0; font-size: 28px;">✅ Consultation Fee Paid</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${userName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              Your consultation fee has been paid successfully. Your service request is now with our verified professionals.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Service Type:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${serviceDetails.serviceType}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Consultation Fee:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; color: #10b981; font-weight: bold;">₦${serviceDetails.fee ? serviceDetails.fee.toLocaleString('en-NG') : '0'}</td>
              </tr>
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Service Request ID:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${serviceDetails.requestId}</td>
              </tr>
            </table>

            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46; font-size: 14px;">
                Your service request has been sent to qualified professionals in your area. You'll receive quotations and bids from contractors within 24 hours.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/my-service-requests" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                View Service Request
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 20px 0;">
              This consultation fee is non-refundable but will be adjusted against the final project cost if you decide to hire one of the professionals who quoted.
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '✅ Consultation Fee Received - Professionals Are Reviewing Your Request',
        html,
      });
      console.log('✅ Service request fee payment email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending service request fee email:', err.message);
    }
  },

  /**
   * Send order status/delivery update email
   */
  sendDeliveryUpdateEmail: async (userEmail: string, firstName: string, details: any) => {
    try {
      if (!ADMIN_EMAIL || !EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping delivery update email to:', userEmail);
        return;
      }

      const statusEmojis: { [key: string]: string } = {
        'pending': '⏳',
        'processing': '⚙️',
        'shipped': '📦',
        'in_transit': '🚚',
        'out_for_delivery': '🚪',
        'delivered': '✅',
        'cancelled': '❌'
      };

      const statusLabel = details.status.replace(/_/g, ' ').charAt(0).toUpperCase() + details.status.replace(/_/g, ' ').slice(1);
      const emoji = statusEmojis[details.status] || '📦';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 36px;">${emoji}</h1>
            <h2 style="color: white; margin: 10px 0 0 0;">Order ${statusLabel}</h2>
          </div>
          <div style="padding: 30px; background-color: #f9fafb;">
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">Hello ${firstName},</p>
            <p style="font-size: 16px; line-height: 1.8; color: #1f2937;">
              ${details.message || 'Your order status has been updated.'}
            </p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0d9488;">
              <h3 style="color: #0d9488; margin-top: 0;">Order Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Order Number:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${details.orderNumber || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Status:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">
                    <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 4px; font-weight: bold;">
                      ${emoji} ${statusLabel}
                    </span>
                  </td>
                </tr>
                ${details.trackingNumber ? `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Tracking Number:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${details.trackingNumber}</td>
                </tr>
                ` : ''}
                ${details.carrier ? `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Carrier:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${details.carrier}</td>
                </tr>
                ` : ''}
                ${details.estimatedDelivery ? `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Estimated Delivery:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(details.estimatedDelivery).toLocaleDateString()}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${FRONTEND_URL}/orders" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View Your Order →
              </a>
            </div>

            <p style="font-size: 14px; color: #1f2937; margin-top: 30px;">
              📧 If you have questions about your delivery, please contact our support team at support@renewablezmart.com
            </p>
          </div>
          <div style="background-color: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              © 2025 RenewableZmart. All rights reserved.<br>
              Empowering Sustainable Energy in Nigeria 🌍
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: `${emoji} Your Order is ${statusLabel}`,
        html,
      });
      console.log('✅ Delivery update email sent to:', userEmail);
      return { success: true, message: 'Delivery update email sent' };
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending delivery update email:', err.message);
      throw error;
    }
  },

  // Send referral bonus earned notification
  sendReferralBonusEmail: async (userEmail: string, userName: string, bonusDetails: any) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #06b6d4; margin: 0; font-size: 28px;">🎉 Referral Bonus Earned!</h2>
            </div>

            <p style="font-size: 16px; color: #374151;">
              Hi ${userName},
            </p>

            <p style="font-size: 16px; color: #374151; margin-top: 15px;">
              Congratulations! Your referral has resulted in a completed order. You've earned a bonus!
            </p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Referred Customer:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${bonusDetails.referredName}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Bonus Amount:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb; color: #06b6d4; font-weight: bold;">₦${bonusDetails.bonusAmount ? bonusDetails.bonusAmount.toLocaleString('en-NG') : '0'}</td>
              </tr>
              <tr style="background-color: #f3f4f6;">
                <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">Bonus Type:</td>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">${bonusDetails.bonusType || 'Referral Reward'}</td>
              </tr>
            </table>

            <div style="background-color: #cffafe; border-left: 4px solid #06b6d4; padding: 16px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; color: #164e63; font-size: 14px;">
                Your bonus has been credited to your RenewableZmart wallet. You can use it for future purchases or request a withdrawal.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/referrals" style="background-color: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                View Your Referrals
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin: 20px 0;">
              Keep referring friends and family to earn more bonuses! Share your unique referral link to unlock additional rewards.
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Best regards,<br/>
              <strong>RenewableZmart Rewards Team</strong>
            </p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '🎉 You\'ve Earned a Referral Bonus!',
        html,
      });
      console.log('✅ Referral bonus email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending referral bonus email:', err.message);
    }
  },

  // Send resale submission confirmation
  sendResaleSubmissionEmail: async (userEmail: string, userName: string, productName: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #f97316; margin: 0 0 20px 0; text-align: center;">Resale Submitted for Review</h2>
            <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #374151;">Thank you for submitting your resale listing for <strong>"${productName}"</strong>. Our admin team is reviewing your submission and will approve or request modifications shortly.</p>
            <p style="font-size: 16px; color: #374151;">We'll notify you as soon as we have an update. In the meantime, you can manage your listings in your dashboard.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" style="background-color: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View My Listings</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '✓ Your Resale Has Been Submitted',
        html,
      });
      console.log('✅ Resale submission email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending resale submission email:', err.message);
    }
  },

  // Send resale approved notification
  sendResaleApprovedEmail: async (userEmail: string, userName: string, productName: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #10b981; margin: 0 0 20px 0; text-align: center;">🎉 Resale Approved!</h2>
            <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #374151;">Great news! Your resale listing for <strong>"${productName}"</strong> has been approved and is now visible to potential buyers on our marketplace.</p>
            <p style="font-size: 16px; color: #374151;">Start receiving inquiries and sell your product quickly!</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/deals" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Your Listing</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '🎉 Your Resale Has Been Approved!',
        html,
      });
      console.log('✅ Resale approval email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending resale approval email:', err.message);
    }
  },

  // Send resale rejected notification
  sendResaleRejectedEmail: async (userEmail: string, userName: string, productName: string, reason: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #ef4444; margin: 0 0 20px 0; text-align: center;">Resale Rejected</h2>
            <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #374151;">We reviewed your resale listing for <strong>"${productName}"</strong> and unfortunately it was rejected.</p>
            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #7f1d1d;"><strong>Rejection Reason:</strong><br/>${reason}</p>
            </div>
            <p style="font-size: 16px; color: #374151;">Please review the reason above and feel free to resubmit with corrections.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: 'Your Resale Was Rejected - Please Review',
        html,
      });
      console.log('✅ Resale rejection email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending resale rejection email:', err.message);
    }
  },

  // Send trade-in submission confirmation
  sendTradeInSubmissionEmail: async (userEmail: string, userName: string, productName: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #8b5cf6; margin: 0 0 20px 0; text-align: center;">Trade-In Request Received</h2>
            <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #374151;">Thank you for submitting your trade-in request for <strong>"${productName}"</strong>. Our team will evaluate your product and send you a competitive quote within 24-48 hours.</p>
            <p style="font-size: 16px; color: #374151;">You'll receive an email notification as soon as your quote is ready.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" style="background-color: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View My Requests</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '✓ Your Trade-In Has Been Received',
        html,
      });
      console.log('✅ Trade-in submission email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending trade-in submission email:', err.message);
    }
  },

  // Send trade-in quote notification
  sendTradeInQuoteEmail: async (userEmail: string, userName: string, productName: string, quotedPrice: number) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #06b6d4; margin: 0 0 20px 0; text-align: center;">💰 Your Trade-In Quote</h2>
            <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #374151;">We've evaluated your <strong>"${productName}"</strong> and are pleased to offer you the following quote:</p>
            <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; padding: 30px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <p style="font-size: 14px; margin: 0 0 10px 0;">Quoted Price</p>
              <h2 style="font-size: 36px; margin: 0;">₦${quotedPrice.toLocaleString('en-NG')}</h2>
            </div>
            <p style="font-size: 16px; color: #374151;">View your quote details and accept or negotiate. We're ready to move forward!</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" style="background-color: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Quote</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '💰 Your Trade-In Quote is Ready!',
        html,
      });
      console.log('✅ Trade-in quote email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending trade-in quote email:', err.message);
    }
  },

  // Send trade-in approved notification
  sendTradeInApprovedEmail: async (userEmail: string, userName: string, productName: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #10b981; margin: 0 0 20px 0; text-align: center;">🎉 Trade-In Approved!</h2>
            <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #374151;">Excellent! Your trade-in for <strong>"${productName}"</strong> has been approved. The next step is to arrange inspection and delivery.</p>
            <div style="background-color: #dcfce7; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #15803d;">Our team will contact you shortly to schedule pickup and finalize the transaction.</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/dashboard" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Details</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: '🎉 Your Trade-In Has Been Approved!',
        html,
      });
      console.log('✅ Trade-in approval email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending trade-in approval email:', err.message);
    }
  },

  // Send trade-in rejected notification
  sendTradeInRejectedEmail: async (userEmail: string, userName: string, productName: string, reason: string) => {
    try {
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #ef4444; margin: 0 0 20px 0; text-align: center;">Trade-In Rejected</h2>
            <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
            <p style="font-size: 16px; color: #374151;">We reviewed your trade-in request for <strong>"${productName}"</strong> and unfortunately cannot proceed at this time.</p>
            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #7f1d1d;"><strong>Reason:</strong><br/>${reason}</p>
            </div>
            <p style="font-size: 16px; color: #374151;">Feel free to contact us if you'd like to discuss alternatives.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/contact-admin" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Contact Us</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: 'Your Trade-In Request - We Need to Discuss',
        html,
      });
      console.log('✅ Trade-in rejection email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending trade-in rejection email:', err.message);
    }
  },

  // ✅ SEND SHIPPED EMAIL
  sendShippedEmail: async (userEmail: string, firstName: string, details: any) => {
    try {
      if (!EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping shipped email to:', userEmail);
        return;
      }

      const trackingInfo = details.trackingNumber 
        ? `<p style="font-size: 16px; color: #374151; margin: 10px 0;">
             <strong>Tracking Number:</strong> ${details.trackingNumber}
           </p>`
        : '';

      const carrierInfo = details.carrier 
        ? `<p style="font-size: 16px; color: #374151; margin: 10px 0;">
             <strong>Carrier:</strong> ${details.carrier}
           </p>`
        : '';

      const estimatedDeliveryInfo = details.estimatedDelivery 
        ? `<p style="font-size: 16px; color: #374151; margin: 10px 0;">
             <strong>Estimated Delivery:</strong> ${new Date(details.estimatedDelivery).toLocaleDateString()}
           </p>`
        : '';

      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(to right, #0d9488, #10b981); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; margin: -40px -40px 20px -40px;">
              <h2 style="color: white; margin: 0; font-size: 24px;">📦 Your Order Has Been Shipped!</h2>
            </div>
            
            <p style="font-size: 16px; color: #374151;">Hello ${firstName},</p>
            <p style="font-size: 16px; color: #374151;">Great news! Your order has been shipped and is on its way to you.</p>
            
            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46;"><strong>Order Number:</strong> ${details.orderNumber}</p>
              ${trackingInfo}
              ${carrierInfo}
              ${estimatedDeliveryInfo}
            </div>

            <p style="font-size: 16px; color: #374151;">You can track your shipment using the tracking number above, or click the button below to view real-time delivery updates.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/track-order?order=${details.orderNumber}" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Track Your Order 🚚</a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you have any questions, please don't hesitate to contact our support team.</p>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: `📦 Your Order Has Shipped - Track It Now!`,
        html,
      });
      console.log('✅ Shipped notification email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending shipped email:', err.message);
    }
  },

  // ✅ SEND DELIVERED EMAIL
  sendDeliveredEmail: async (userEmail: string, firstName: string, details: any) => {
    try {
      if (!EMAIL_FROM) {
        console.warn('⚠️ SendGrid not configured. Skipping delivered email to:', userEmail);
        return;
      }

      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(to right, #059669, #10b981); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; margin: -40px -40px 20px -40px;">
              <h2 style="color: white; margin: 0; font-size: 24px;">✅ Your Order Has Been Delivered!</h2>
            </div>
            
            <p style="font-size: 16px; color: #374151;">Hello ${firstName},</p>
            <p style="font-size: 16px; color: #374151;">Excellent news! Your order has been successfully delivered.</p>
            
            <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065f46;"><strong>Order Number:</strong> ${details.orderNumber}</p>
              <p style="margin: 5px 0 0 0; color: #065f46;"><strong>Items:</strong> ${details.itemCount}</p>
              <p style="margin: 5px 0 0 0; color: #065f46;"><strong>Total Amount:</strong> ₦${details.orderTotal?.toLocaleString() || 'N/A'}</p>
            </div>

            <h3 style="color: #0d9488; margin-top: 20px;">What's Next?</h3>
            <ul style="color: #374151; line-height: 1.8;">
              <li>✓ Please verify that the products match your order</li>
              <li>✓ Inspect items for any damage</li>
              <li>✓ Share your feedback in a review</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${FRONTEND_URL}/orders" style="background-color: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">View Order Details</a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Thank you for shopping with RenewableZmart! Your feedback helps us improve.</p>
            <p style="font-size: 14px; color: #6b7280;">Best regards,<br/><strong>RenewableZmart Team</strong></p>
          </div>
        </div>
      `;

      await sgMail.send({
        to: userEmail,
        from: EMAIL_FROM,
        subject: `✅ Your Order Has Been Delivered - Thank You!`,
        html,
      });
      console.log('✅ Delivered notification email sent to:', userEmail);
    } catch (error) {
      const err = error as EmailError;
      console.error('❌ Error sending delivered email:', err.message);
    }
  },
};
