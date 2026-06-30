-- ===================================================================
-- ORDER CLEANUP & DATABASE POLLUTION FIX
-- Run this after backing up your database!
-- ===================================================================

-- 1. Remove duplicate order items (keep only one per order_id, product_id)
-- Note: This assumes there's an order_items table
-- If orders use JSONB items column, skip this step
DELETE FROM order_items oi
WHERE id NOT IN (
  SELECT MIN(id)
  FROM order_items
  GROUP BY order_id, product_id
);

-- 2. Recalculate order totals from order_items
UPDATE orders o
SET total = COALESCE(sub.sum, 0)
FROM (
  SELECT order_id, SUM(CAST(price AS DECIMAL) * quantity) AS sum
  FROM order_items
  GROUP BY order_id
) sub
WHERE o.id = sub.order_id;

-- 3. Remove orders with ZERO items (orphaned orders)
DELETE FROM orders
WHERE id NOT IN (
  SELECT DISTINCT order_id FROM order_items
);

-- 4. Add constraints to prevent future duplicates

-- Unique payment reference (prevent duplicate orders from same payment)
ALTER TABLE orders
ADD CONSTRAINT unique_payment_ref UNIQUE(payment_reference)
ON CONFLICT DO NOTHING;

-- Foreign key for product_id
ALTER TABLE order_items
ADD CONSTRAINT fk_product_id
FOREIGN KEY(product_id)
REFERENCES products(id)
ON DELETE CASCADE
ON CONFLICT DO NOTHING;

-- Unique order_id + product_id (one product per order)
ALTER TABLE order_items
ADD CONSTRAINT unique_order_product
UNIQUE(order_id, product_id)
ON CONFLICT DO NOTHING;

-- ===================================================================
-- VERIFICATION QUERIES (run after cleanup)
-- ===================================================================

-- Check if duplicates removed
SELECT COUNT(DISTINCT oi.id) as total_items, 
       COUNT(DISTINCT (oi.order_id, oi.product_id)) as unique_combinations
FROM order_items oi;

-- Verify order totals
SELECT o.id, o.total, SUM(oi.price * oi.quantity) as calculated_total
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id
HAVING o.total != SUM(oi.price * oi.quantity)
ORDER BY o.created_at DESC;

-- Check for orphaned orders
SELECT COUNT(*) as orphaned_orders
FROM orders
WHERE id NOT IN (SELECT DISTINCT order_id FROM order_items);
