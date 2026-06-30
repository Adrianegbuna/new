# Email Notification System (SendGrid)

## Overview
The platform sends email notifications to users and administrators for key events using SendGrid.

## Email Events

### User Notifications
1. **Registration**: Welcome email
2. **Login**: Security notification
3. **Order Confirmation**: Confirmation after payment

### Admin Notifications
Admin email (`vmaktproject@gmail.com`) receives notifications for:
1. New user registration
2. User login activity
3. New orders

## Setup Instructions (SendGrid)

### Step 1: Create a SendGrid API Key
1. Go to https://app.sendgrid.com/settings/api_keys
2. Create API Key with "Full Access" or at least "Mail Send"
3. Copy the API key

### Step 2: Update `backend/.env`
```env
ADMIN_EMAIL=vmaktproject@gmail.com
SENDGRID_API_KEY=your-sendgrid-api-key-here
EMAIL_FROM=RenewableZmart <noreply@renewablezmart.com>
```

### Step 3: Restart Backend Server
```powershell
cd backend
npm run dev
```

## Testing Email Functionality
Perform the same registration, login, and order flows; emails should deliver via SendGrid. Check SendGrid Activity for delivery status.

## Troubleshooting
1. **Invalid API Key**: Ensure `SENDGRID_API_KEY` is set and valid
2. **Domain Authentication**: For best deliverability, authenticate your domain in SendGrid
3. **Suppression/Bounces**: Check SendGrid suppression list and activity logs
4. **Console Logs**: Backend logs show send status with ✉️/❌ indicators

## Configuration
- Env: `SENDGRID_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`
- Code: `backend/src/config/email.ts` initializes SendGrid; `backend/src/services/emailService.ts` sends emails

## Security Notes
- Keep API keys secret; do not commit `.env`
- Emails send asynchronously; failures are logged and do not block flows
- Rotate API keys periodically

## Future Enhancements
- Domain authentication and branded links
- Template management through SendGrid Dynamic Templates
- Additional notification types
