import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const leftPad = (value: string, length: number): string => value.padStart(length, '0');

export const toBase32 = (buffer: Buffer): string => {
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
};

export const fromBase32 = (value: string): Buffer => {
  const clean = value.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';

  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) {
      throw new Error('Invalid base32 character');
    }
    bits += idx.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const hotp = (secretBase32: string, counter: number, digits = 6): string => {
  const key = fromBase32(secretBase32);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return leftPad(String(code % 10 ** digits), digits);
};

export const generateTotpSecret = (): string => {
  const raw = crypto.randomBytes(20);
  return toBase32(raw);
};

export const generateOtpAuthUrl = (email: string, secret: string, issuer = 'RenewableZmart'): string => {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
};

export const verifyTotpCode = (secret: string, code: string, window = 1): boolean => {
  const normalized = String(code || '').trim();
  if (!/^\d{6}$/.test(normalized)) return false;

  const timestep = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / timestep);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = hotp(secret, currentCounter + offset);
    if (expected === normalized) return true;
  }
  return false;
};

export const generateBackupCodes = (count = 8): string[] => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codes: string[] = [];

  for (let i = 0; i < count; i += 1) {
    let code = '';
    for (let j = 0; j < 10; j += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }
  return codes;
};

export const hashBackupCode = (code: string): string =>
  crypto.createHash('sha256').update(String(code || '').trim().toUpperCase()).digest('hex');

