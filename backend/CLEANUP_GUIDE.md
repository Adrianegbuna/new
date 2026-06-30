# Database Cleanup Guide

This guide explains how to remove all dummy/seed data from your database.

## ⚠️ Warning

These scripts will **PERMANENTLY DELETE** data from your database. Make sure to:
1. Backup your database first
2. Run this only when you're ready to clean the database
3. Verify you're using the correct database credentials

## 🧹 Cleanup Scripts

### Option 1: Simple Cleanup (JavaScript)

```bash
cd backend
node cleanup-dummy-data.js
```

**What it removes:**
- ✅ All seed products (by name)
- ✅ All seed stores (Solar Tech Store, Green Energy Hub, Renewable Power Solutions)
- ✅ Orphaned stores (stores with no products)
- ✅ Test vendor accounts (vendor@test.com, testvendor@test.com, etc.)
- ✅ Orphaned reviews (reviews for deleted products)

### Option 2: TypeScript Cleanup (Backend)

If you want to run the TypeScript version:

```bash
cd backend
npm run cleanup  # (if script is added to package.json)
# Or use ts-node:
npx ts-node src/scripts/cleanup.ts
```

## 📊 What Gets Removed

| Item | Action |
|------|--------|
| Products with seed names | DELETED |
| Stores named "Solar Tech Store", "Green Energy Hub", "Renewable Power Solutions" | DELETED |
| Products from seed stores | DELETED |
| Orphaned stores (no products) | DELETED |
| Test vendor accounts | DELETED |
| Orphaned reviews | DELETED |

## ✅ Database Check

After cleanup, check the database state:

```sql
-- Check remaining data
SELECT COUNT(*) FROM stores;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;
```

## 🔄 If Something Goes Wrong

If cleanup fails:

1. **Check the error message** - It will tell you what went wrong
2. **Verify DATABASE_URL** - Make sure your .env has correct credentials
3. **Check database connection** - Run `node test-db-connection.js` first
4. **Restore from backup** - If you have a backup

## 🚀 Next Steps After Cleanup

1. Upload real products through the vendor dashboard
2. Create real vendor accounts
3. Test the application with real data

---

**Need help?** Run the cleanup script with logging to see what's happening:

```bash
node cleanup-dummy-data.js 2>&1 | tee cleanup.log
```
