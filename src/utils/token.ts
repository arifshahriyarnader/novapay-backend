import jwt, { SignOptions } from 'jsonwebtoken';
import { ApiError } from './ApiError';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const signToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ApiError(500, 'JWT secret is not configured');

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) ?? '15m',
  };

  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ApiError(500, 'JWT secret is not configured');

  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
};