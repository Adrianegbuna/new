import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const RAW_SENDGRID_FROM = (process.env.SENDGRID_FROM_EMAIL || 'no-reply@renewablezmart.com').trim();
const DEFAULT_FROM_NAME = (process.env.SENDGRID_FROM_NAME || 'RenewableZmart').trim();

const fromMatch = RAW_SENDGRID_FROM.match(/^(.*)<([^>]+)>$/);
const parsedName = fromMatch?.[1]?.trim().replace(/^"|"$/g, '');
const parsedEmail = fromMatch?.[2]?.trim();

const SENDGRID_FROM_EMAIL = parsedEmail || RAW_SENDGRID_FROM;
const SENDGRID_FROM_NAME = parsedName || DEFAULT_FROM_NAME;

const EMAIL_FROM = {
  email: SENDGRID_FROM_EMAIL,
  name: SENDGRID_FROM_NAME,
};
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@renewablezmart.com';

console.log('[EMAIL CONFIG] SENDGRID_API_KEY exists:', !!SENDGRID_API_KEY);
console.log('[EMAIL CONFIG] SENDGRID_FROM_NAME:', SENDGRID_FROM_NAME);
console.log('[EMAIL CONFIG] SENDGRID_FROM_EMAIL:', SENDGRID_FROM_EMAIL);
console.log('[EMAIL CONFIG] EMAIL_FROM:', `${SENDGRID_FROM_NAME} <${SENDGRID_FROM_EMAIL}>`);
console.log('[EMAIL CONFIG] ADMIN_EMAIL:', ADMIN_EMAIL);

if (!SENDGRID_API_KEY) {
  console.error('❌ CRITICAL: SendGrid not configured - set SENDGRID_API_KEY in environment variables');
  console.error('📖 Get API key from https://app.sendgrid.com/settings/api_keys');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('✉️ SendGrid initialized successfully');
  console.log('📧 Emails will be sent from:', `${SENDGRID_FROM_NAME} <${SENDGRID_FROM_EMAIL}>`);
}

export { sgMail, EMAIL_FROM, ADMIN_EMAIL, SENDGRID_FROM_NAME, SENDGRID_FROM_EMAIL };
