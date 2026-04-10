import jwt from 'jsonwebtoken';
import { Request } from 'express';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-dockey-2026';
const TOKEN_COOKIE_NAME = 'auth_token';

export type CompanyContext = {
  userId: string;
  companyId: string;
  role: string;
};

const getTokenFromRequest = (req: Request): string | null => {
  const cookieToken = req.cookies?.[TOKEN_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) return authHeader.split(' ')[1];

  return null;
};

/**
 * Resolves company context from the authenticated user's DB record.
 * companyId is always read from DB — never from JWT or request body.
 * Returns null if unauthenticated or user has no company assigned.
 */
export const resolveCompanyContext = async (req: Request): Promise<CompanyContext | null> => {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user || !user.companyId) return null;

    return {
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    };
  } catch {
    return null;
  }
};
