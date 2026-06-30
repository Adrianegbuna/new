import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import { Store } from '../models/Store';
import { Referral } from '../models/Referral';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { emailService } from '../services/emailService';
import { validatePhoneNumber } from '../utils/phoneValidation';
import { validateEmail } from '../utils/emailValidation';
import { validateCompanyRegistration } from '../utils/companyValidation';
import { serializeCookie, setResponseCookies } from '../utils/cookieHelper';
import { getRequiredJwtSecret } from '../utils/jwtSecrets';

const userRepository = AppDataSource.getRepository(User);
const storeRepository = AppDataSource.getRepository(Store);

export const register = async (req: Request, res: Response) => {
  try {
    // Check validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, phone, country, city, accountType, businessName, businessRegNumber, certifications, yearsOfExperience, serviceAreas, adminLevel, interestedInPaySmallSmall } = req.body;
    const isVendorAccount = accountType === 'vendor' || accountType === 'ev_vendor';

    // Comprehensive email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ 
        message: emailValidation.error,
        suggestion: emailValidation.suggestion 
      });
    }

    // Prevent non-SA00 from registering new admins (security measure)
    // In local development, this check can be bypassed by setting ADMIN_REGISTRATION_ENABLED=true
    if (accountType === 'admin' && process.env.NODE_ENV === 'production') {
      return res.status(400).json({ 
        message: 'Admin registration requires special authorization. Use /admin/create-admin endpoint.' 
      });
    }

    // Phone number validation
    if (phone) {
      const phoneValidation = validatePhoneNumber(phone, country || 'Nigeria');
      if (!phoneValidation.isValid) {
        return res.status(400).json({ message: phoneValidation.error || 'Invalid phone number' });
      }
    }

    // Password strength validation - must contain uppercase, lowercase, numbers, and special characters
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters and contain uppercase letters, lowercase letters, numbers, and special characters (@$!%*?&)' 
      });
    }

    // Check if user exists (case-insensitive) - No email can be used more than once
    const existingUser = await userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
    
    if (existingUser) {
      return res.status(409).json({ 
        message: 'This email is already registered. Please use a different email or login to your existing account.' 
      });
    }

    // Validate business registration number for vendors
    if (isVendorAccount && businessRegNumber) {
      const regValidation = validateCompanyRegistration(businessRegNumber, country || 'Nigeria');
      if (!regValidation.isValid) {
        return res.status(400).json({ 
          message: regValidation.error,
          suggestion: regValidation.suggestion 
        });
      }

      // Check if business registration number already exists
      const existingBusiness = await userRepository
        .createQueryBuilder('user')
        .where('UPPER(user.businessRegNumber) = UPPER(:businessRegNumber)', { 
          businessRegNumber: regValidation.normalizedValue 
        })
        .getOne();
      
      if (existingBusiness) {
        return res.status(409).json({ 
          message: 'This business registration number is already registered. Each business can only be registered once.' 
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine role and admin level
    let role = UserRole.CUSTOMER;
    let resolvedAdminLevel = null;
    
    if (isVendorAccount) role = UserRole.VENDOR;
    if (accountType === 'installer') role = UserRole.INSTALLER;
    if (accountType === 'admin') {
      role = UserRole.ADMIN;
      // Set admin level (default to SA20 if not specified, must be one of: SA00, SA10, SA20)
      const validAdminLevels = ['SA00', 'SA10', 'SA20'];
      resolvedAdminLevel = (adminLevel && validAdminLevels.includes(adminLevel)) ? adminLevel : 'SA20';
    }

    // Normalize business registration number if provided
    let normalizedRegNumber = businessRegNumber;
    if (isVendorAccount && businessRegNumber) {
      const regValidation = validateCompanyRegistration(businessRegNumber, country || 'Nigeria');
      if (regValidation.normalizedValue) {
        normalizedRegNumber = regValidation.normalizedValue;
      }
    }

    // Create user
    const userData = {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      country,
      city,
      role,
      adminLevel: resolvedAdminLevel || undefined, // Set admin level if admin account, otherwise undefined
      accountType, // Store accountType for reference
      // Only set businessName for vendors
      businessName: isVendorAccount ? businessName : undefined,
      businessRegNumber: normalizedRegNumber,
      certifications,
      yearsOfExperience,
      serviceAreas,
      interestedInPaySmallSmall: Boolean(interestedInPaySmallSmall),
    };

    const user = userRepository.create(userData);
    
    // Generate unique referral code
    let referralCode = generateReferralCode();
    let existingCode = await userRepository.findOne({ where: { referralCode } });
    while (existingCode) {
      referralCode = generateReferralCode();
      existingCode = await userRepository.findOne({ where: { referralCode } });
    }
    user.referralCode = referralCode;

    const savedUser: User = await userRepository.save(user);

    // Auto-create Referral record for commission tracking
    const referralRepo = AppDataSource.getRepository(Referral);
    try {
      const referral = referralRepo.create({
        referrerId: savedUser.id,
        referralCode: referralCode,
        referralLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`,
        status: 'active' as any,
        totalReferred: 0,
        totalCommission: 0,
        successfulPurchases: 0
      });
      const savedReferral = await referralRepo.save(referral);
      savedReferral.referrer = savedUser;
      console.log(`✅ Referral code created for user ${savedUser.email}: ${referralCode}`);
    } catch (error) {
      console.error('Failed to create referral code record:', error);
      // Continue - don't block registration if referral creation fails
    }
    let storeSlug: string | undefined;
    if (role === UserRole.VENDOR && businessName) {
      try {
        storeSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const store = storeRepository.create({
          name: businessName,
          description: accountType === 'ev_vendor'
            ? `Official EV store for ${businessName}`
            : `Official store for ${businessName}`,
          ownerId: savedUser.id,
          slug: storeSlug,
          country: savedUser.country,
          city: savedUser.city,
          categories: accountType === 'ev_vendor'
            ? ['Electric Vehicles & Parts']
            : undefined,
        });
        await storeRepository.save(store);
        console.log(`✅ Vendor store created with slug: ${storeSlug}`);
      } catch (error) {
        console.error('Failed to create store:', error);
      }
    }

    // Send emails (don't block registration if emails fail)
    emailService.sendWelcomeEmail(savedUser.email, savedUser.firstName, accountType || 'customer', storeSlug).catch(err => 
      console.error('Failed to send welcome email:', err)
    );
    emailService.sendAdminRegistrationNotification({
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      email: savedUser.email,
      phone: savedUser.phone,
      country: savedUser.country,
      city: savedUser.city,
      accountType: accountType || 'customer',
      businessName: savedUser.businessName,
    }).catch(err => 
      console.error('Failed to send admin notification:', err)
    );

    // Generate tokens
    const jwtSecret = getRequiredJwtSecret('JWT_SECRET');
    const jwtRefreshSecret = getRequiredJwtSecret('JWT_REFRESH_SECRET');

    const accessToken = jwt.sign(
      { email: savedUser.email, sub: savedUser.id, role: savedUser.role },
      jwtSecret,
      { expiresIn: '30d' }
    );

    const refreshToken = jwt.sign(
      { email: savedUser.email, sub: savedUser.id, role: savedUser.role },
      jwtRefreshSecret,
      { expiresIn: '90d' }
    );

    res.status(201).json({
      user: {
        id: savedUser.id,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role,
        adminLevel: savedUser.adminLevel, // Include admin level in response
        country: savedUser.country,
        city: savedUser.city,
        accountType: savedUser.accountType, // Include accountType in response
        interestedInPaySmallSmall: savedUser.interestedInPaySmallSmall,
        mfaEnabled: savedUser.mfaEnabled,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Case-insensitive email search for admin logins
    const user = await userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const shouldRequireMfa = Boolean(user.mfaEnabled && user.mfaSecret);
    if (shouldRequireMfa) {
      const jwtSecret = getRequiredJwtSecret('JWT_SECRET');
      const mfaToken = jwt.sign(
        { email: user.email, sub: user.id, role: user.role, purpose: 'mfa-login' },
        jwtSecret,
        { expiresIn: '10m' }
      );

      return res.status(200).json({
        requiresMfa: true,
        mfaToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          adminLevel: user.adminLevel,
          accountType: user.accountType,
          mfaEnabled: true,
        },
      });
    }

    // Send login notifications (don't block login if emails fail)
    emailService.sendLoginNotification(user.email, user.firstName, {
      city: user.city,
      country: user.country,
    }).catch(err => 
      console.error('Failed to send login notification:', err)
    );
    emailService.sendAdminLoginNotification({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      city: user.city,
      country: user.country,
    }).catch(err => 
      console.error('Failed to send admin login notification:', err)
    );

    const jwtSecret = getRequiredJwtSecret('JWT_SECRET');
    const jwtRefreshSecret = getRequiredJwtSecret('JWT_REFRESH_SECRET');

    const accessToken = jwt.sign(
      { email: user.email, sub: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '30d' }
    );

    const refreshToken = jwt.sign(
      { email: user.email, sub: user.id, role: user.role },
      jwtRefreshSecret,
      { expiresIn: '90d' }
    );

    // Set secure HTTP-only cookies for tokens
    const isProduction = process.env.NODE_ENV === 'production';
    const accessTokenCookie = serializeCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    const refreshTokenCookie = serializeCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: '/',
    });

    // Set user cookie (not httpOnly - needed for client-side)
    const userCookie = serializeCookie('user', JSON.stringify({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      adminLevel: user.adminLevel,
      accountType: user.accountType,
      country: user.country,
      city: user.city,
      interestedInPaySmallSmall: user.interestedInPaySmallSmall,
      mfaEnabled: user.mfaEnabled,
    }), {
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Set all cookies
    setResponseCookies(res, [accessTokenCookie, refreshTokenCookie, userCookie]);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        adminLevel: user.adminLevel, // Include admin level for frontend
        accountType: user.accountType, // Include accountType for frontend
        country: user.country,
        city: user.city,
        interestedInPaySmallSmall: user.interestedInPaySmallSmall,
        mfaEnabled: user.mfaEnabled,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const jwtRefreshSecret = getRequiredJwtSecret('JWT_REFRESH_SECRET');
    const jwtSecret = getRequiredJwtSecret('JWT_SECRET');

    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as any;

    const user = await userRepository.findOne({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = jwt.sign(
      { email: user.email, sub: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '30d' }
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Clear all authentication cookies
  const accessTokenCookie = serializeCookie('accessToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  
  const refreshTokenCookie = serializeCookie('refreshToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  
  const userCookie = serializeCookie('user', '', {
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  
  // Set all cookies to expire
  setResponseCookies(res, [accessTokenCookie, refreshTokenCookie, userCookie]);
  
  res.json({ message: 'Logged out successfully' });
};


/**
 * Get current authenticated user
 */
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await userRepository.findOne({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      country: user.country,
      city: user.city,
      role: user.role,
      businessName: user.businessName,
      profilePhoto: user.profilePhoto,
      interestedInPaySmallSmall: user.interestedInPaySmallSmall,
      mfaEnabled: user.mfaEnabled,
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};
// Forgot Password - Send reset link
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email (case-insensitive)
    const user = await userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return res.status(200).json({ 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    // Generate reset token (expires in 1 hour)
    const jwtSecret = getRequiredJwtSecret('JWT_SECRET');
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'reset' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Store reset token in user record (temporary)
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    await userRepository.save(user);

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    await emailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl);

    res.status(200).json({ 
      message: 'If an account exists with this email, a password reset link has been sent.' 
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset', error: error.message });
  }
};

// Reset Password - Update password with token
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Verify token
    let decoded: any;
    try {
      const jwtSecret = getRequiredJwtSecret('JWT_SECRET');
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Find user
    const user = await userRepository.findOne({ where: { id: decoded.userId } });
    
    if (!user || user.resetToken !== token) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    // Check token expiry
    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      user.resetToken = undefined;
      user.resetTokenExpiry = undefined;
      await userRepository.save(user);
      return res.status(400).json({ message: 'Password reset link has expired' });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters and contain uppercase letters, lowercase letters, numbers, and special characters (@$!%*?&)' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await userRepository.save(user);

    res.status(200).json({ message: 'Password updated successfully. You can now login with your new password.' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};

/**
 * Generate a unique 8-character referral code
 */
export function generateReferralCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}
