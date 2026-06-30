# Location System - Verification Checklist

## 1. DATABASE VERIFICATION

### SQL: Verify Tables Are Empty (Pre-Cleanup)
```sql
SELECT 'countries' as table_name, COUNT(*) as row_count FROM "country"
UNION ALL
SELECT 'cities' as table_name, COUNT(*) as row_count FROM "city"
ORDER BY table_name;

-- Expected: Both should show row counts BEFORE cleanup
```

### SQL: Run Cleanup
```bash
# Connect to Render PostgreSQL or local database
psql -U postgres -d ecommerce_db -f backend/src/migrations/cleanup-locations.sql
```

### SQL: Verify Cleanup Successful
```sql
-- Should return 0 rows for both
SELECT 'countries' as table_name, COUNT(*) as row_count FROM "country"
UNION ALL
SELECT 'cities' as table_name, COUNT(*) as row_count FROM "city"
ORDER BY table_name;

-- Expected output:
-- table_name | row_count
-- cities     | 0
-- countries  | 0
```

### SQL: Run Seed
```bash
psql -U postgres -d ecommerce_db -f backend/src/migrations/seed-locations.sql
```

### SQL: Verify Seed Successful
```sql
-- Should return 54 countries and 521 cities
SELECT 'countries' as table_name, COUNT(*) as row_count FROM "country"
UNION ALL
SELECT 'cities' as table_name, COUNT(*) as row_count FROM "city"
ORDER BY table_name;

-- Expected output:
-- table_name | row_count
-- cities     | 521
-- countries  | 54

-- Verify Nigeria has 37 cities/states
SELECT COUNT(*) FROM "city" WHERE "countryId" = (SELECT id FROM "country" WHERE name = 'Nigeria');
-- Expected: 37

-- Verify all countries have cities
SELECT c.name, COUNT(ci.id) as city_count 
FROM "country" c 
LEFT JOIN "city" ci ON ci."countryId" = c.id 
GROUP BY c.id, c.name 
ORDER BY c.name;
-- Should show all 54 countries with their city counts (37 for Nigeria, 10 for most others)
```

### SQL: Verify No Duplicates
```sql
-- Check for duplicate countries
SELECT name, COUNT(*) FROM "country" GROUP BY name HAVING COUNT(*) > 1;
-- Expected: No results

-- Check for duplicate cities within countries
SELECT name, "countryId", COUNT(*) FROM "city" GROUP BY name, "countryId" HAVING COUNT(*) > 1;
-- Expected: No results
```

### SQL: Verify Foreign Keys
```sql
-- Verify all cities have valid country references
SELECT COUNT(*) as orphaned_cities FROM "city" 
WHERE "countryId" NOT IN (SELECT id FROM "country");
-- Expected: 0

-- List all countries and city counts
SELECT c.name, c.code, c.flag, COUNT(ci.id) as city_count
FROM "country" c
LEFT JOIN "city" ci ON ci."countryId" = c.id
GROUP BY c.id, c.name, c.code, c.flag
ORDER BY c.name;
```

---

## 2. BACKEND API VERIFICATION

### Health Check
```bash
curl -X GET http://localhost:4000/api/locations/health
# Expected: { "status": "ok", "service": "locations" }
```

### Test 1: Get All Countries
```bash
curl -X GET http://localhost:4000/api/locations/countries
# Expected: JSON array with 54 countries
# Should see in terminal logs:
# [LOCATIONS] GET /countries - Fetching all countries
# [LOCATIONS] ✓ Found 54 countries from database
```

**Postman:**
```
Method: GET
URL: http://localhost:4000/api/locations/countries
Headers: None required
Expected Status: 200
Expected Response: Array[54] with {id, name, code, flag, createdAt, updatedAt}
```

### Test 2: Get Cities for Nigeria
```bash
# First get Nigeria's country ID from /locations/countries response
# Use that ID in this call:

curl -X GET http://localhost:4000/api/locations/countries/{COUNTRY_ID}/cities
# Expected: JSON array with 37 cities/states for Nigeria
# Should see in terminal logs:
# [LOCATIONS] GET /countries/{id}/cities - Fetching cities
# [LOCATIONS] ✓ Found 37 cities for Nigeria
```

**Postman:**
```
Method: GET
URL: http://localhost:4000/api/locations/countries/{COUNTRY_ID}/cities
Headers: None required
Expected Status: 200
Expected Response: Array[37] with {id, name, state, countryId, createdAt, updatedAt}
```

### Test 3: Search Countries
```bash
curl -X GET "http://localhost:4000/api/locations/countries/search/South%20Africa"
# Expected: JSON array with South Africa
# Should see in terminal logs:
# [LOCATIONS] Searching for country: "South Africa"
# [LOCATIONS] ✓ Found 1 matching countries

curl -X GET "http://localhost:4000/api/locations/countries/search/ZA"
# Search by code - should also return South Africa
```

**Postman:**
```
Method: GET
URL: http://localhost:4000/api/locations/countries/search/Nigeria
Headers: None required
Expected Status: 200
Expected Response: Array[1] with Nigeria
```

### Test 4: Admin Endpoint - All Countries with Nested Cities
```bash
curl -X GET http://localhost:4000/api/locations/admin/countries-full
# Expected: JSON array with 54 countries, each with nested cities array
# Should see in terminal logs:
# [LOCATIONS] Admin: Fetching all countries with nested cities
# [LOCATIONS] Admin: Processing 54 countries
# [LOCATIONS] Admin: ✓ Returning 54 countries with cities
```

**Postman:**
```
Method: GET
URL: http://localhost:4000/api/locations/admin/countries-full
Headers: None required
Expected Status: 200
Expected Response: Array[54] with nested cities for each country
Sample structure:
{
  "id": "uuid",
  "name": "Nigeria",
  "code": "NG",
  "flag": "🇳🇬",
  "createdAt": "2026-01-28T...",
  "updatedAt": "2026-01-28T...",
  "cities": [
    {
      "id": "uuid",
      "name": "Lagos",
      "state": "Lagos",
      "createdAt": "2026-01-28T...",
      "updatedAt": "2026-01-28T..."
    },
    ...
  ]
}
```

### Test 5: Error Handling - Invalid Country ID
```bash
curl -X GET http://localhost:4000/api/locations/countries/invalid-id/cities
# Expected: 404 Not Found
# { "message": "Country not found" }
```

### Test 6: Error Handling - Missing Country ID
```bash
curl -X GET http://localhost:4000/api/locations/countries//cities
# Expected: 400 Bad Request
# { "message": "countryId is required" }
```

---

## 3. FRONTEND VERIFICATION

### Browser Console Checks (Open DevTools → Console)

When page loads, you should see:
```
[FRONTEND] Fetching all countries from API
[FRONTEND] ✓ Received 54 countries from API
```

When location modal opens and you select Nigeria:
```
[FRONTEND] Country changed to: Nigeria
[FRONTEND] Fetching cities for country ID: {UUID}
[FRONTEND] ✓ Received 37 cities for Nigeria
```

When you select a city:
```
[FRONTEND] City changed to: Lagos
```

### Browser Network Tab Checks

1. **Countries Request**
   - URL: `http://localhost:4000/api/locations/countries`
   - Status: 200
   - Response: Array[54] countries

2. **Cities Request**
   - URL: `http://localhost:4000/api/locations/countries/{countryId}/cities`
   - Status: 200
   - Response: Array[37] cities (for Nigeria)

### Visual Verification - Location Dropdown

1. Open home page
2. Click location selector (top-right area with flag and country name)
3. Verify:
   - ✅ Country dropdown shows all 54 countries
   - ✅ Nigeria is pre-selected
   - ✅ City dropdown shows all 37 Nigerian states
   - ✅ Lagos is pre-selected
   - ✅ Selecting different country updates city list
   - ✅ No loading spinners visible after data loads
   - ✅ Search works (type "South" and see "South Africa", "South Sudan")

### Visual Verification - Register Page

1. Navigate to `/register`
2. Verify location selection works:
   - ✅ Country dropdown shows all countries
   - ✅ City dropdown dynamically loads when country selected
   - ✅ All cities appear (scroll to verify)
   - ✅ No "Only showing 1-5 records" issue

### Fallback Testing

To test fallback to hardcoded data (intentional error testing):
1. Open DevTools → Network tab
2. Throttle connection to "Offline"
3. Refresh page
4. Location dropdown should use hardcoded data
5. Console should show: `[FRONTEND] Falling back to hardcoded location data`
6. UI should still work (show 54 countries from hardcoded array)

---

## 4. PRODUCTION CHECKLIST

- [ ] Database cleanup script executed successfully
- [ ] Seed script executed and verified (54 countries, 521 cities)
- [ ] No duplicate countries or cities
- [ ] All countries have cities
- [ ] All cities have valid country references
- [ ] Backend API endpoints return full lists (not paginated/limited)
- [ ] All 4 location endpoints tested via Postman/curl
- [ ] Error handling tested (invalid IDs return proper errors)
- [ ] Frontend console shows correct logs
- [ ] Network requests show all data (54 countries, 37+ cities)
- [ ] Dropdowns display all options
- [ ] No pagination limits visible
- [ ] Fallback to hardcoded data works if API fails
- [ ] Build passes without errors: `npm run build`
- [ ] TypeScript has no errors: `npm run type-check`

---

## 5. BACKEND STARTUP

After everything is configured:

```bash
# Terminal 1: Start backend
cd backend
npm run start:dev
# Should output:
# [SEED] Starting location data seeding...
# [SEED] X countries already exist. Skipping seed.
# ✅ Database connected successfully
# 📚 API endpoint: http://localhost:4000/api
# 📍 Locations API: http://localhost:4000/api/locations
```

---

## 6. TROUBLESHOOTING

### Issue: Only 1-5 countries showing
**Cause:** Using old code with LIMIT clause
**Fix:** Verify locations.ts has no LIMIT in .find() queries

### Issue: Cities not loading for country
**Cause:** Missing country ID or incorrect FK
**Fix:** Run verification SQL for foreign keys (see section 1)

### Issue: Duplicate cities appearing
**Cause:** Seed script run twice
**Fix:** Run cleanup script first, then seed

### Issue: "Failed to fetch countries" in console
**Cause:** API not running or endpoint not registered
**Fix:** 
1. Verify backend started: `curl http://localhost:4000/api/health`
2. Verify route registered in server.ts: check for `app.use('/api/locations', locationRoutes)`
3. Check terminal for errors during startup

### Issue: Frontend shows hardcoded data only
**Cause:** API is timing out or returning errors
**Fix:**
1. Check backend console for error logs
2. Verify database connection: `curl http://localhost:4000/api/locations/countries`
3. Check network tab for failed requests

### Issue: TypeScript errors during build
**Cause:** Type mismatches in Location model
**Fix:** Run `cd backend && npx tsc --noEmit` to see detailed errors

---

## 7. PERFORMANCE NOTES

- Countries endpoint: Returns 54 records (~15KB)
- Cities endpoint: Returns 10-37 records per call (~4-8KB)
- Expected response time: <100ms with proper indexes
- Indexes are defined on:
  - country(name)
  - city(name)
  - city(countryId)
  - city(countryId, name) composite

---

## 8. PRODUCTION DEPLOYMENT

### Render Backend Deployment
1. Ensure `DATABASE_SYNC=false` in production
2. Run cleanup and seed SQL scripts via Render PostgreSQL dashboard
3. Verify `APP_DATA_SOURCE` has fresh connection
4. Deploy backend code
5. Verify endpoints accessible: `https://backend.render.com/api/locations/countries`

### Vercel Frontend Deployment
1. Ensure `NEXT_PUBLIC_API_URL=https://backend.render.com/api`
2. Build frontend: `npm run build`
3. Deploy to Vercel
4. Monitor browser console for location fetch logs
5. Test location selector on live site

