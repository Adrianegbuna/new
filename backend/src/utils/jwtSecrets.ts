export const getRequiredJwtSecret = (name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'): string => {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} is missing or too short`);
  }
  return value;
};

