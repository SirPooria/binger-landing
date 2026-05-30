import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { AuthUser } from '../types.js';

export interface AccessPayload {
  sub: string;
  email: string;
  type: 'access';
}

export function signAccess(user: AuthUser): string {
  const payload: AccessPayload = { sub: user.id, email: user.email, type: 'access' };
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.accessTtlSec });
}

export function verifyAccess(token: string): AccessPayload {
  const decoded = jwt.verify(token, config.auth.jwtSecret) as AccessPayload;
  if (decoded.type !== 'access') throw new Error('invalid_token_type');
  return decoded;
}
