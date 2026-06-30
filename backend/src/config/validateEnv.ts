// Environment variable validation
// Add to server startup to ensure production safety

export function validateEnvironment() {
  const errors: string[] = [];

  // Check JWT Secret
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be set and at least 32 characters long');
  }

  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    errors.push('JWT_SECRET is still using default value! Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  }

  // Check JWT Refresh Secret
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be set and at least 32 characters long');
  }

  if (process.env.JWT_REFRESH_SECRET === 'your-super-secret-refresh-key-change-in-production') {
    errors.push('JWT_REFRESH_SECRET is still using default value!');
  }

  // Check Database Password
  if (!process.env.DATABASE_PASSWORD) {
    errors.push('DATABASE_PASSWORD must be set');
  }

  if (process.env.DATABASE_PASSWORD === 'postgres' || process.env.DATABASE_PASSWORD === 'password') {
    errors.push('DATABASE_PASSWORD is using a weak/default password');
  }

  // Check Paystack Keys (warn in production)
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith('sk_test_')) {
      errors.push('Production environment should use live Paystack keys (sk_live_...)');
    }
  }

  // Print warnings
  if (errors.length > 0) {
    console.error('\n🔴 SECURITY CONFIGURATION ERRORS:\n');
    errors.forEach(err => console.error(`  ❌ ${err}`));
    console.error('\n');

    // Exit in production
    if (process.env.NODE_ENV === 'production') {
      console.error('🛑 Cannot start server with security issues in production!\n');
      process.exit(1);
    } else {
      console.warn('⚠️  WARNING: Development mode - server starting with security warnings\n');
    }
  } else {
    console.log('✅ Environment variables validated successfully\n');
  }
}
