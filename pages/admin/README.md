# 🎯 Admin Dashboard - Quick Start Guide

Welcome to the **Professional Admin Dashboard** for RenewableZmart E-commerce Platform!

## 📍 How to Access

**URL:** `http://localhost:3000/admin` (development)  
**URL:** `https://renewablezmart.com/admin` (production)

**Requirements:**
- You must be logged in as an admin user
- Your user role must be `'admin'` in the database

---

## 🗂️ Dashboard Structure

The admin dashboard consists of **7 main sections:**

### 1. 📊 Overview
Your dashboard at a glance with real-time statistics:
- Total Users (all roles)
- Vendors (approved sellers)
- Installers (service professionals)
- Customers (buyers)
- Orders (total transactions)
- Revenue (total sales ₦)
- Stores (vendor shops)
- Products (catalog items)

### 2. 👥 Users Management
Complete user directory:
- View all platform users
- See: Name, Email, Role, Phone, Location, Join Date
- Delete users if needed
- Real-time data from database

### 3. 🏪 Vendors Management
Manage vendor applications and accounts:
- **Pending Tab:** Review vendor applications
  - Add approval or rejection notes
  - Approve vendors to activate store
  - Reject with feedback
- **Approved Tab:** View verified vendors
- Automatic email notifications sent on action

### 4. 📦 Orders Management
Track and manage customer orders:
- View all orders with customer details
- Update order status (pending → shipped → delivered)
- See payment status
- Track order dates
- Real-time status updates

### 5. 📋 Products Management
Oversee product catalog:
- View all products
- See approval status
- Check pricing and categories
- Monitor product additions
- Filter by approval status

### 6. 🏬 Stores Management
Monitor vendor stores:
- View all stores
- Check verification status
- See location and contact info
- Verify store details

### 7. 📁 Categories Management
Control product categories:
- **Create** new categories
- **Edit** existing categories
- **Delete** categories (with subcategories)
- **Add** subcategories within categories
- Set display order
- Toggle active status
- Expand/collapse subcategory view

---

## 🎮 How to Use Each Section

### Statistics Overview
1. Click **📊 Overview** tab
2. View all stat cards
3. Numbers update automatically
4. Shows real data from database

### User Management
1. Click **👥 Users** tab
2. Browse user table
3. Find users by scrolling or searching
4. Click **Delete** to remove a user
5. Confirm deletion

### Vendor Verification
1. Click **🏪 Vendors** tab
2. See **Pending** vendors awaiting approval
3. Review vendor details (business name, registration, email)
4. **To Approve:** Click green [✓ Approve] button
5. **To Reject:** Add notes, click red [✗ Reject] button
6. Vendor automatically notified via email
7. Status updates in database

### Order Status Updates
1. Click **📦 Orders** tab
2. Find the order in the table
3. Click the **status dropdown** on that row
4. Select new status:
   - `pending` - Order received
   - `processing` - Being prepared
   - `shipped` - On the way
   - `delivered` - Customer received
   - `cancelled` - Order cancelled
5. Status updates immediately
6. Customer receives notification
7. Vendor is also notified

### Product Management
1. Click **📋 Products** tab
2. Browse all products
3. Check approval status (color-coded)
4. Click column headers to sort

### Store Management
1. Click **🏬 Stores** tab
2. View all vendor stores
3. See verification status
4. Check store location and phone

### Category Management
1. Click **📁 Categories** tab
2. **To Add Category:**
   - Click [+ Add Category]
   - Fill in details (Name required)
   - Click [Create Category]
3. **To Edit Category:**
   - Click [✎ Edit] on category
   - Update details
   - Click [Update Category]
4. **To Delete Category:**
   - Click [🗑 Delete] on category
   - Confirm in popup
5. **For Subcategories:**
   - Click [▼ Subcategories] to expand
   - Click [+ Add Subcategory]
   - Select parent category
   - Fill details
   - Click [Create Subcategory]

---

## 💡 Tips & Tricks

### ✨ Quick Navigation
- Click any tab to jump to that section
- Data loads automatically when you switch tabs
- Use the green/orange/red badges to quickly identify status

### 🔍 Finding Data
- Tables are sortable by column (click header)
- Use status filter in Orders tab
- Scroll horizontally on mobile for more columns

### ⚡ Quick Actions
- Approve vendors: Look for green button with ✓
- Reject vendors: Fill notes then click red ✗ button
- Update orders: Click dropdown in Status column
- Edit category: Click [✎ Edit] button
- Delete carefully: Always confirm in popup

### 📱 Mobile Friendly
- Full responsive design on tablets & phones
- Horizontal scroll for wide tables
- Touch-friendly buttons
- All features available on mobile

---

## ⚠️ Important Notes

### Be Careful With:
- ⚠️ **Delete buttons** - No undo after confirmation
- ⚠️ **Vendor rejection** - Include helpful feedback
- ⚠️ **Category deletion** - Removes all subcategories too
- ⚠️ **Order status** - Notify customer of changes

### Data is Live:
- ✅ All data comes directly from PostgreSQL
- ✅ Changes appear immediately
- ✅ No "save" button needed - everything auto-saves
- ✅ Refreshing page shows latest data

### Email Notifications:
- 📧 Vendors get emails on approval/rejection
- 📧 Customers get order status updates
- 📧 Errors if email service is down (logged)

---

## 🆘 Troubleshooting

### Stats or Tables are Empty
```
1. Refresh the page
2. Check if data exists in database:
   docker exec ecommerce_postgres psql -U postgres -d ecommerce_db
   SELECT COUNT(*) FROM "user";
   
3. If count is 0, no data to display
4. Try adding test data first
```

### Can't Access Admin Dashboard
```
1. Log in as admin user
2. Check URL is correct: http://localhost:3000/admin
3. Verify your role in database: SELECT role FROM "user" WHERE email='...';
4. If role isn't 'admin', update it: UPDATE "user" SET role='admin' WHERE ...
5. Log out and log back in
```

### Buttons Not Working
```
1. Check browser console for errors (F12)
2. Verify backend is running (port 4000)
3. Check JWT token isn't expired (log out/in)
4. Look for red error message at top of page
```

### Taking Too Long to Load
```
1. Check internet connection
2. Verify backend is responsive
3. Try different browser
4. Clear browser cache
5. Restart both frontend and backend
```

## 📚 Documentation

Full detailed documentation available:

- **ADMIN_DASHBOARD_COMPLETE.md** - Complete implementation guide
- **ADMIN_DASHBOARD_TESTING_GUIDE.md** - Testing & verification steps
- **ADMIN_DASHBOARD_VISUAL_GUIDE.md** - UI layouts & workflows
- **ADMIN_DASHBOARD_SUMMARY.md** - Executive overview
- **ADMIN_DASHBOARD_CHANGELOG.md** - All changes & features

---

## 🛠️ Technical Info (For Developers)

### File Locations
```
Frontend:
├── pages/admin/comprehensive-dashboard.tsx (main component)
├── pages/admin/index.tsx (entry point - re-exports above)
└── styles/admin-dashboard.module.css (all styles)

Backend:
└── backend/src/routes/admin.ts (25+ API endpoints)

Database:
└── PostgreSQL with 24 entities
```

### Key Technologies
- React 18 + Next.js 14
- TypeScript (strict mode)
- Axios HTTP client
- TypeORM database layer
- PostgreSQL

### API Prefix
All admin API calls use `/api/admin/` prefix:
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `POST /api/admin/vendors/:id/verify`
- etc.

All endpoints require:
- JWT authentication token
- Admin role in database

---

## 📞 Support

### For Issues:
1. Check this Quick Start Guide
2. Review documentation files
3. Check browser console (F12 → Console tab)
4. Verify backend is running
5. Check database connectivity

### Common Error Messages:

| Error | Solution |
|-------|----------|
| "Failed to fetch statistics" | Restart backend: `npm run start:dev` |
| "Access denied" | Verify user role is 'admin' |
| "Token expired" | Log out and log back in |
| "Network error" | Check backend CORS config |
| "No data found" | Add test data to database |

---

## 🎉 You're All Set!

Your professional admin dashboard is ready to use. All features are fully functional and connected to your PostgreSQL database.

**Start by:**
1. Navigate to `/admin`
2. Click each tab to explore
3. Try an action (approve vendor, update order, create category)
4. See the data update in real-time

**Questions?** Check the documentation files or review the code in `comprehensive-dashboard.tsx`.

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** February 17, 2026

**Happy managing!** 🚀
