-- ============================================
-- SERVICE REQUESTS SCHEMA
-- ============================================
-- Complete database schema for service request management system
-- Includes: service_requests, service_request_updates, notifications
-- With proper FK constraints, indexes, and sample data

-- ============================================
-- 1. SERVICE_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'vendor', 'installer')),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  service_type VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'assigned', 'in_progress', 'completed', 'rejected')),
  assigned_to UUID REFERENCES "user"(id) ON DELETE SET NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. SERVICE_REQUEST_UPDATES TABLE (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS service_request_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  note TEXT,
  updated_by UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  service_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES (Performance Optimization)
-- ============================================

-- service_requests indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to ON service_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_status ON service_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_status ON service_requests(assigned_to, status);

-- service_request_updates indexes
CREATE INDEX IF NOT EXISTS idx_service_request_updates_request_id ON service_request_updates(request_id);
CREATE INDEX IF NOT EXISTS idx_service_request_updates_updated_by ON service_request_updates(updated_by);
CREATE INDEX IF NOT EXISTS idx_service_request_updates_created_at ON service_request_updates(created_at DESC);

-- notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_service_request_id ON notifications(service_request_id);

-- ============================================
-- VERIFY SCHEMA
-- ============================================

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('service_requests', 'service_request_updates', 'notifications');

-- Check columns in service_requests
\d service_requests;

-- Check indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('service_requests', 'service_request_updates', 'notifications')
ORDER BY tablename, indexname;

-- ============================================
-- EXAMPLE DATA & QUERIES
-- ============================================

-- Example: Insert a service request (as customer)
-- INSERT INTO service_requests 
-- (user_id, role, full_name, email, phone, service_type, message, status)
-- VALUES (
--   'user-uuid-here',
--   'customer',
--   'John Doe',
--   'john@example.com',
--   '+234801234567',
--   'Solar Installation',
--   'I need to install a 5kW solar system on my roof',
--   'pending'
-- );

-- Example: Get all service requests (admin dashboard)
-- SELECT sr.*, u.email as assigned_email
-- FROM service_requests sr
-- LEFT JOIN "user" u ON sr.assigned_to = u.id
-- ORDER BY sr.created_at DESC;

-- Example: Get pending requests by status
-- SELECT * FROM service_requests WHERE status = 'pending' ORDER BY created_at ASC;

-- Example: Get all updates for a request (timeline)
-- SELECT * FROM service_request_updates 
-- WHERE request_id = 'request-uuid-here'
-- ORDER BY created_at DESC;

-- Example: Get unread notifications for user
-- SELECT * FROM notifications 
-- WHERE user_id = 'user-uuid-here' AND is_read = FALSE
-- ORDER BY created_at DESC;

-- Example: Get request with full audit trail
-- SELECT 
--   sr.id, sr.full_name, sr.service_type, sr.status, sr.created_at,
--   json_agg(json_build_object(
--     'old_status', sru.old_status,
--     'new_status', sru.new_status,
--     'note', sru.note,
--     'created_at', sru.created_at
--   )) as updates
-- FROM service_requests sr
-- LEFT JOIN service_request_updates sru ON sr.id = sru.request_id
-- WHERE sr.id = 'request-uuid-here'
-- GROUP BY sr.id, sr.full_name, sr.service_type, sr.status, sr.created_at;

-- Example: Count requests by status
-- SELECT status, COUNT(*) as count FROM service_requests GROUP BY status;

-- Example: Mark notification as read
-- UPDATE notifications SET is_read = TRUE WHERE id = 'notification-uuid-here';
