import type { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../auth/jwt.js';
import { findUserById, toAuthUser } from '../auth/service.js';
import type { AuthUser } from '../types.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', message: 'توکن ورود یافت نشد' });
  }
  try {
    const payload = verifyAccess(header.slice(7));
    const dbUser = await findUserById(payload.sub);
    if (!dbUser) return res.status(401).json({ error: 'unauthorized' });
    req.user = await toAuthUser(dbUser);
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'توکن نامعتبر یا منقضی شده' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const payload = verifyAccess(header.slice(7));
    const dbUser = await findUserById(payload.sub);
    if (dbUser) req.user = await toAuthUser(dbUser);
  } catch {
    /* ignore invalid token */
  }
  next();
}
