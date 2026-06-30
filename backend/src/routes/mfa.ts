import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User';
import {
  generateBackupCodes,
  generateOtpAuthUrl,
  generateTotpSecret,
  hashBackupCode,
  verifyTotpCode,
} from '../utils/totp';
import { getRequiredJwtSecret } from '../utils/jwtSecrets';
import { serializeCookie, setResponseCookies } from '../utils/cookieHelper';

const router = Router();
const userRepo = AppDataSource.getRepository(User);

const parseUserFromMfaToken = (mfaToken: string): { sub: string } => {
  const secret = getRequiredJwtSecret('JWT_SECRET');
  return jwt.verify(mfaToken, secret) as { sub: string };
};

const finalizeLogin = (res: any, user: User): void => {
  const jwtSecret = getRequiredJwtSecret('JWT_SECRET');
  const jwtRefreshSecret = getRequiredJwtSecret('JWT_REFRESH_SECRET');
  const accessToken = jwt.sign(
    { email: user.email, sub: user.id, role: user.role, adminLevel: user.adminLevel },
    jwtSecret,
    { expiresIn: '30d' }
  );
  const refreshToken = jwt.sign(
    { email: user.email, sub: user.id, role: user.role, adminLevel: user.adminLevel },
    jwtRefreshSecret,
    { expiresIn: '90d' }
  );

  const isProduction = process.env.NODE_ENV === 'production';
  const accessTokenCookie = serializeCookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
  const refreshTokenCookie = serializeCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 90 * 24 * 60 * 60,
    path: '/',
  });
  const userCookie = serializeCookie(
    'user',
    JSON.stringify({
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
    }),
    {
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    }
  );
  setResponseCookies(res, [accessTokenCookie, refreshTokenCookie, userCookie]);

  res.json({
    user: {
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
    },
    accessToken,
    refreshToken,
  });
};

const verifyMfaCode = (user: User, code: string): boolean => {
  const normalized = String(code || '').trim();
  if (!normalized) return false;

  if (/^\d{6}$/.test(normalized) && user.mfaSecret) {
    return verifyTotpCode(user.mfaSecret, normalized, 1);
  }

  const hashed = hashBackupCode(normalized);
  const existing = (user.mfaBackupCodes || []).find((value) => value === hashed);
  if (!existing) return false;

  user.mfaBackupCodes = (user.mfaBackupCodes || []).filter((value) => value !== hashed);
  void userRepo.save(user);
  return true;
};

router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  const user = await userRepo.findOne({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  res.json({
    enabled: Boolean(user.mfaEnabled),
    requiredForRole: [UserRole.ADMIN, UserRole.VENDOR].includes(user.role),
    configuredAt: user.mfaEnabledAt || null,
    backupCodesRemaining: (user.mfaBackupCodes || []).length,
  });
});

router.post('/setup', authMiddleware, async (req: AuthRequest, res) => {
  const user = await userRepo.findOne({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const secret = generateTotpSecret();
  user.mfaSecret = secret;
  user.mfaEnabled = false;
  user.mfaBackupCodes = [];
  await userRepo.save(user);

  const otpauthUrl = generateOtpAuthUrl(user.email, secret);
  res.json({
    secret,
    otpauthUrl,
    issuer: 'RenewableZmart',
    message: 'Scan with Google Authenticator, Authy, or any TOTP app, then verify to enable.',
  });
});

router.post('/enable', authMiddleware, async (req: AuthRequest, res) => {
  const { code } = req.body;
  const user = await userRepo.findOne({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!user.mfaSecret) return res.status(400).json({ message: 'Run setup first' });
  if (!verifyTotpCode(user.mfaSecret, String(code || '').trim(), 1)) {
    return res.status(400).json({ message: 'Invalid MFA code' });
  }

  const backupCodes = generateBackupCodes(8);
  user.mfaEnabled = true;
  user.mfaEnabledAt = new Date();
  user.mfaBackupCodes = backupCodes.map((entry) => hashBackupCode(entry));
  await userRepo.save(user);

  res.json({
    message: 'MFA enabled successfully',
    backupCodes,
  });
});

router.post('/disable', authMiddleware, async (req: AuthRequest, res) => {
  const { code } = req.body;
  const user = await userRepo.findOne({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!user.mfaEnabled) return res.status(400).json({ message: 'MFA is not enabled' });

  const ok = verifyMfaCode(user, String(code || ''));
  if (!ok) return res.status(400).json({ message: 'Invalid MFA code' });

  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.mfaBackupCodes = [];
  user.mfaEnabledAt = null;
  await userRepo.save(user);

  res.json({ message: 'MFA disabled successfully' });
});

router.post('/verify-login', async (req, res) => {
  const { mfaToken, code } = req.body;
  if (!mfaToken || !code) {
    return res.status(400).json({ message: 'mfaToken and code are required' });
  }

  let decoded: { sub: string };
  try {
    decoded = parseUserFromMfaToken(String(mfaToken));
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired MFA token' });
  }

  const user = await userRepo.findOne({ where: { id: decoded.sub } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (!user.mfaEnabled || !user.mfaSecret) return res.status(400).json({ message: 'MFA is not enabled' });

  const ok = verifyMfaCode(user, String(code));
  if (!ok) return res.status(400).json({ message: 'Invalid MFA code' });

  finalizeLogin(res, user);
});

export default router;

