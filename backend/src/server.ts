import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { AppDataSource } from './config/database';
import { validateEnvironment } from './config/validateEnv';
import path from 'path';
import http from 'http';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import storeRoutes from './routes/stores';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payments';
import reviewRoutes from './routes/reviews';
import installerRoutes from './routes/installers';
import installerAuthRoutes from './routes/installer';
import adminRoutes from './routes/admin';
import installmentRoutes from './routes/installments';
import emailRoutes from './routes/email';
import referralRoutes from './routes/referrals';
import debugRoutes from './routes/debug';
import quotationRoutes from './routes/quotations';
import servicePackageRoutes from './routes/servicePackages';
import jobRoutes from './routes/jobs';
import categoriesRoutes from './routes/categories';
import messagesRoutes from './routes/messages';
import wishlistRoutes from './routes/wishlist';
import couponsRoutes from './routes/coupons';
import notificationsRoutes from './routes/notifications';
import serviceRequestRoutes from './routes/serviceRequests';
import locationRoutes from './routes/locations';
import packageRoutes from './routes/packages';
import testS3Routes from './routes/testS3';
import uploadRoutes from './routes/uploads';
import s3PresignedRoutes from './routes/s3PresignedRoutes';
import storePayoutRoutes from './routes/storePayouts';
import returnsRoutes from './routes/returns';
import resaleRoutes from './routes/resaleRoutes';
import tradeInRoutes from './routes/tradeInRoutes';
import payoutRequestRoutes from './routes/payoutRequestRoutes';
import chatRoutes from './routes/chat';
import feedRoutes from './routes/feed';
import mfaRoutes from './routes/mfa';
import disputesRoutes from './routes/disputes';
import addressRoutes from './routes/addresses';
import adBannersRoutes from './routes/adBanners';
import { adminAuditLogger } from './middleware/adminAuditLogger';
import { emailService } from './services/emailService';
import { RotationCronService } from './services/rotationCronService';
import { InstallmentAutoDebitService } from './services/installmentAutoDebitService';
import { autoReconcilePendingInstallments } from './controllers/installmentController';
import { migrateExistingOrders } from './utils/migrateOrders';
import { fixPaymentStatusEnum } from './utils/fixPaymentStatusEnum';
import { preinitializationFix } from './utils/preinitializationFix';
import { fixProductionEnum } from './utils/fixProductionEnum';
import { initSocket } from './socket';

// Load environment variables
config();

// Validate environment variables on startup
validateEnvironment();

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const isDevelopment = process.env.NODE_ENV !== 'production';

// Helmet security middleware - comprehensive security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://js.paystack.co", "https://paystack.com", "https://*.paystack.co", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://js.paystack.co", "https://paystack.com", "https://*.paystack.co", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : []), "https://js.paystack.co", "https://paystack.com", "https://*.paystack.co"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : []), "https://js.paystack.co", "https://paystack.com", "https://*.paystack.co"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:4000", "http://127.0.0.1:4000", "blob:"],
      mediaSrc: ["'self'", "data:", "https:", "http://localhost:4000", "http://127.0.0.1:4000", "blob:"],
      connectSrc: ["'self'", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:4000", "http://127.0.0.1:4000", "https://renewable-zmart-3aam.vercel.app", "https://renewable-zmart.vercel.app", "https://renewable-zmart-3aam-git-main-vmakts-projects.vercel.app", "https://renewablezmart.com", "https://www.renewablezmart.com", "https://flagcdn.com", "https://js.paystack.co", "https://paystack.com", "https://api.paystack.co", "https://*.paystack.co"],
      frameSrc: ["'self'", "https://js.paystack.co", "https://paystack.com", "https://*.paystack.co"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://renewable-zmart-3aam.vercel.app',
    'https://renewable-zmart.vercel.app',
    'https://renewable-zmart-3aam-git-main-vmakts-projects.vercel.app',
    'https://renewablezmart.com',
    'https://www.renewablezmart.com',
    'http://renewablezmart.com',
    'http://www.renewablezmart.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import rate limiters
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimiter';
import * as fs from 'fs';

// Serve uploaded files - set before rate limiting
// Add custom handler for video range requests
app.get('/uploads/*', (req, res, next) => {
  const filePath = path.join(__dirname, '../uploads', req.params[0]);
  const ext = path.extname(filePath).toLowerCase();
  
  // Only handle video files with range requests
  if (ext === '.mp4' || ext === '.webm' || ext === '.mov') {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        return next();
      }
      
      const fileSize = stats.size;
      const range = req.headers.range;
      
      if (range) {
        // Parse range header: bytes=start-end
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        if (start >= fileSize || end >= fileSize) {
          res.status(416).set('Content-Range', `bytes */${fileSize}`).send('Range Not Satisfiable');
          return;
        }
        
        const chunkSize = end - start + 1;
        
        // Set proper headers for partial content
        res.status(206);
        res.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.set('Accept-Ranges', 'bytes');
        res.set('Content-Length', `${chunkSize}`);
        res.set('Content-Type', ext === '.webm' ? 'video/webm' : 'video/mp4');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=31536000');
        
        // Send the file stream
        const file = fs.createReadStream(filePath, { start, end });
        file.pipe(res);
      } else {
        // No range request, serve the entire file
        fs.readFile(filePath, (err, data) => {
          if (err) {
            return next();
          }
          
          res.set('Content-Type', ext === '.webm' ? 'video/webm' : 'video/mp4');
          res.set('Content-Length', `${fileSize}`);
          res.set('Accept-Ranges', 'bytes');
          res.set('Access-Control-Allow-Origin', '*');
          res.set('Cache-Control', 'public, max-age=31536000');
          res.send(data);
        });
      }
    });
  } else {
    next();
  }
});

// Fallback static file serving for non-video files
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Embedder-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    // Set proper content type for images and videos
    if (filePath.endsWith('.jpeg') || filePath.endsWith('.jpg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filePath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filePath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    }
  }
}));

// Handle CORS preflight requests for uploads
app.options('/uploads/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendStatus(200);
});

// Apply rate limiting
app.use('/api', apiRateLimiter); // General API rate limiting

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/feed', feedRoutes); // Temu-style infinite scroll feed
app.use('/api/stores', storeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/installer', installerAuthRoutes); // Authenticated installer routes (singular)
app.use('/api/installers', installerRoutes); // Public installer list/details (plural)
app.use('/api/admin', adminAuditLogger, adminRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/debug', debugRoutes); // Error tracking and debugging
app.use('/api/quotations', quotationRoutes); // Installer quotation management
app.use('/api/service-packages', servicePackageRoutes); // Service packages
app.use('/api/jobs', jobRoutes); // Installer jobs
app.use('/api/service-requests', serviceRequestRoutes); // Service requests from customers
app.use('/api/categories', categoriesRoutes); // Product categories and subcategories
app.use('/api/messages', messagesRoutes); // Site inquiries and messages
app.use('/api/wishlist', wishlistRoutes); // Customer wishlist
app.use('/api/coupons', couponsRoutes); // Public coupon discovery/validation
app.use('/api/notifications', notificationsRoutes); // User notifications
app.use('/api/locations', locationRoutes); // Location data - countries and cities
app.use('/api/packages', packageRoutes); // Solar packages and product templates
app.use('/api/upload', uploadRoutes); // AWS S3 image upload endpoints
app.use('/api/test-s3', testS3Routes); // AWS S3 image upload testing
app.use('/api/s3', s3PresignedRoutes); // S3 pre-signed URL generation for direct uploads
app.use('/api/uploads', uploadRoutes); // Register upload routes
app.use('/api/store-payouts', storePayoutRoutes); // Store payout requests
app.use('/api/returns', returnsRoutes); // Product returns management
app.use('/api/resales', resaleRoutes); // Resale product listings
app.use('/api/trade-ins', tradeInRoutes); // Trade-in/swap requests
app.use('/api/payouts', payoutRequestRoutes); // Customer/vendor/installer payout requests
app.use('/api/chat', chatRoutes); // AI chat assistant messages
app.use('/api/disputes', disputesRoutes); // Buyer/vendor dispute center
app.use('/api/addresses', addressRoutes); // Customer saved addresses
app.use('/api/ad-banners', adBannersRoutes); // Hero advert banners

// Simple SendGrid test endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    const to = (req.query.to as string) || process.env.ADMIN_EMAIL || 'vmaktproject@gmail.com';
    await emailService.sendWelcomeEmail(to, 'Test', 'customer');
    res.json({ ok: true, to });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to send test email' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Express backend is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database with connection check
    console.log('[INIT] Initializing database connection...');
    console.log('[INIT] DATABASE_HOST:', process.env.DATABASE_HOST);
    console.log('[INIT] DATABASE_NAME:', process.env.DATABASE_NAME);
    console.log('[INIT] DATABASE_URL:', process.env.DATABASE_URL ? '***SET***' : 'NOT SET');
    
    // FIX ENUM FIRST - must run before any other database operations
    console.log('[INIT] ===> ATTEMPTING TO FIX PRODUCTION DATABASE ENUM...');
    try {
      await fixProductionEnum();
    } catch (error: any) {
      console.error('[INIT] ⚠️ Enum fix failed:', error.message);
      console.log('[INIT] ℹ️ This may be normal on first startup or if database is still initializing');
      console.log('[INIT] ℹ️ Proceeding with TypeORM initialization - may still work...');
      // Don't throw - allow server to continue
      // TypeORM will try to sync and may succeed anyway
    }
    
    // Run pre-initialization fixes before TypeORM initializes
    await preinitializationFix();
    
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');
    console.log('📊 TypeORM initialized');

    // Initialize feed ranking cron jobs (delayed to ensure all metadata is loaded)
    setTimeout(() => {
      try {
        RotationCronService.startCronJobs(AppDataSource);
        console.log('⏰ Feed ranking cron jobs started');
      } catch (cronError) {
        console.warn('⚠️ Cron job initialization failed (continuing):', cronError);
      }
    }, 10000); // Wait 10 seconds for full TypeORM initialization and metadata loading

    setTimeout(() => {
      try {
        InstallmentAutoDebitService.startCronJobs();
      } catch (cronError) {
        console.warn('âš ï¸ Installment auto-debit cron init failed (continuing):', cronError);
      }
    }, 12000);

    setTimeout(() => {
      autoReconcilePendingInstallments().catch((error) => {
        console.warn('[INSTALLMENT] Auto-reconcile init failed (continuing):', error);
      });
      setInterval(() => {
        autoReconcilePendingInstallments().catch((error) => {
          console.warn('[INSTALLMENT] Auto-reconcile scheduled run failed:', error);
        });
      }, 60 * 1000);
    }, 1000);

    // Fix payment status enum in database (non-blocking)
    try {
      await fixPaymentStatusEnum();
    } catch (error: any) {
      console.warn('⚠️ Migration warning (continuing anyway):', error.message);
    }

    // Run database migration to fix existing orders (non-blocking)
    try {
      await migrateExistingOrders();
    } catch (error: any) {
      console.warn('⚠️ Migration warning (continuing anyway):', error.message);
    }

    // Start Express server
    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Express server running on http://0.0.0.0:${PORT}`);
      console.log(`📚 API endpoint: http://localhost:${PORT}/api`);
      console.log(`🔄 Feed API: http://localhost:${PORT}/api/feed`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📍 Locations API: http://localhost:${PORT}/api/locations`);
      console.log(`\n✅ Server is ready to accept requests\n`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use. Please stop other instances first.\n`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
    });

    // Graceful shutdown - SIGTERM
    process.on('SIGTERM', async () => {
      console.log('\n👋 SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        try {
          if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('Database connections closed');
          }
        } catch (err) {
          console.error('Error closing database:', err);
        }
        process.exit(0);
      });
    });

    // Graceful shutdown - SIGINT
    process.on('SIGINT', async () => {
      console.log('\n👋 SIGINT signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        try {
          if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('Database connections closed');
          }
        } catch (err) {
          console.error('Error closing database:', err);
        }
        process.exit(0);
      });
    });
  } catch (error: any) {
    console.error('\n❌ Database connection failed:', error.message || error);
    console.error('Please ensure your DATABASE_URL is correct and the database is accessible.');
    
    // Still start the server in development mode without database for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n⚠️ Running in development mode without database connection...\n');
      const server = http.createServer(app);
      initSocket(server);
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Express server running on http://0.0.0.0:${PORT} (no database)`);
      });
      
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${PORT} is already in use`);
        } else {
          console.error('Server error:', error);
        }
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  }
}

// Start the server
startServer();

export default app;
