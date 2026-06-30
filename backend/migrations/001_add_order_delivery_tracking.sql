-- ✅ DATABASE MIGRATION - Order Delivery Tracking System
-- Run this when status reverts to "processing" 
-- This adds the missing timestamp columns to the orders table

-- 1. ADD MISSING TIMESTAMP COLUMNS TO ORDERS TABLE
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL;

-- 2. CREATE REVIEWS TABLE FOR DELIVERY REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. CREATE DELIVERY CONFIRMATIONS TABLE TO TRACK REVIEW EMAILS
CREATE TABLE IF NOT EXISTS delivery_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  email_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  email_opened_at TIMESTAMP NULL,
  review_link_clicked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CREATE INDEX FOR FASTER LOOKUPS
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_emails_order_id ON delivery_emails(order_id);

-- 5. VERIFY COLUMNS WERE ADDED
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('shipped_at', 'delivered_at', 'shipping_status')
ORDER BY ordinal_position;

-- Done! ✅
