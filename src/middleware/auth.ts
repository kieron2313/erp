import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users, allowedEmails } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: typeof users.$inferSelect;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Unauthorized: Missing token format' });
  }

  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
  } catch (error: any) {
    if (error?.code === 'auth/id-token-expired') {
      console.warn('Firebase ID token expired for request to', req.originalUrl || req.url);
      return res.status(401).json({ error: 'Token expired', code: 'auth/id-token-expired' });
    }
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ 
      error: error?.message || 'Unauthorized: Invalid token',
      code: error?.code || 'auth/invalid-token' 
    });
  }

  const email = (decodedToken.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(401).json({ error: 'Unauthorized: No email associated with token' });
  }

  const SUPER_ADMIN = 'wdsolutionnet@gmail.com';
  let isAllowed = email === SUPER_ADMIN;

  try {
    // Check if email is in the allowedEmails table
    if (!isAllowed) {
      const dbAllowed = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email));
      isAllowed = dbAllowed.length > 0;
    }

    // Fallback to APPROVED_EMAILS environment variable
    if (!isAllowed) {
      const approvedEmailsStr = process.env.APPROVED_EMAILS;
      if (approvedEmailsStr) {
        const envApproved = approvedEmailsStr.split(',').map(e => e.trim().toLowerCase());
        if (envApproved.includes(email)) {
          isAllowed = true;
        }
      } else {
        // If no allowed emails in the database and no env var, bootstrap first user
        const allAllowed = await db.select().from(allowedEmails).limit(1);
        if (allAllowed.length === 0) {
          await db.insert(allowedEmails).values({ email, addedBy: 'system_bootstrap' });
          isAllowed = true;
        }
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ 
        error: `Access Denied: The account ${email} is not authorized to access this ERP system. Please contact an administrator to authorize your email.` 
      });
    }

    // Ensure super admin or bootstrapped email exists in allowedEmails table
    try {
      const existing = await db.select().from(allowedEmails).where(eq(allowedEmails.email, email));
      if (existing.length === 0) {
        await db.insert(allowedEmails).values({
          email,
          addedBy: email === SUPER_ADMIN ? 'owner' : 'system'
        });
      }
    } catch {
      // Ignore if concurrent insert happens
    }

    // Check if user exists in db or create/update them
    const result = await db.insert(users)
      .values({
        uid: decodedToken.uid,
        email: email,
        role: email === SUPER_ADMIN ? 'admin' : 'user',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email,
          role: email === SUPER_ADMIN ? 'admin' : sql`COALESCE(${users.role}, 'user')`,
        },
      })
      .returning();
      
    req.dbUser = result[0];

    next();
  } catch (dbError: any) {
    console.error('Database error in requireAuth:', dbError);
    if (email === SUPER_ADMIN) {
      // Fallback super admin in memory so administrator is never locked out by db hiccups
      req.dbUser = {
        id: 1,
        uid: decodedToken.uid,
        email: email,
        role: 'admin',
        createdAt: new Date(),
      };
      return next();
    }
    return res.status(500).json({ error: 'Database service unavailable. Please retry in a few moments.' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.dbUser || req.dbUser.role !== 'admin') {
     return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
