import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { createError, getCookie, setCookie } from 'h3';

const config = {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  cookieHttpOnly: process.env.COOKIE_HTTPONLY !== 'false',
  cookieSecure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAMESITE || 'strict'
};

export function generateAccessToken(userId) {
  return jwt.sign(
    { userId, type: 'access' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createError({ statusCode: 401, statusMessage: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      throw createError({ statusCode: 401, statusMessage: 'Invalid token' });
    }
    throw createError({ statusCode: 401, statusMessage: 'Authentication failed' });
  }
}

export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw createError({ statusCode: 401, statusMessage: 'Refresh token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      throw createError({ statusCode: 401, statusMessage: 'Invalid refresh token' });
    }
    throw createError({ statusCode: 401, statusMessage: 'Refresh authentication failed' });
  }
}

export function extractUserFromEvent(event) {
  const token = getCookie(event, 'access-token');
  
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'No authentication token provided' });
  }
  
  const decoded = verifyAccessToken(token);
  return decoded.userId;
}

export function setAuthCookies(event, accessToken, refreshToken) {
  console.log('[COOKIES] Setting auth cookies with config:', {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite
  });
  
  // Set the actual JWT tokens as httpOnly for security
  setCookie(event, 'access-token', accessToken, {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/'
  });
  console.log('[COOKIES] Set access-token cookie');
  
  setCookie(event, 'refresh-token', refreshToken, {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
    path: '/'
  });
  console.log('[COOKIES] Set refresh-token cookie');
  
  // Set a non-httpOnly cookie that indicates user is logged in
  // This is readable by JavaScript for client-side auth checks
  setCookie(event, 'auth-check', 'true', {
    httpOnly: false, // Readable by JavaScript
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    path: '/'
  });
  console.log('[COOKIES] Set auth-check cookie (non-httpOnly)');
}

export function clearAuthCookies(event) {
  setCookie(event, 'access-token', '', {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 0,
    path: '/'
  });
  
  setCookie(event, 'refresh-token', '', {
    httpOnly: config.cookieHttpOnly,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 0,
    path: '/'
  });
  
  setCookie(event, 'auth-check', '', {
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    maxAge: 0,
    path: '/'
  });
}

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

export function validatePassword(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}