import express, { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ulid } from 'ulid';
import { prisma } from '../lib/prisma';
import { ensureUserTableExists } from '../lib/ensureUserTable';
import { getUserPresence } from '../lib/userPresence';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-dockey-2026';
const TOKEN_COOKIE_NAME = 'auth_token';

type AuthTokenPayload = { id: string };
type AuthenticatedRequest = Request & {
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
};

const getTokenFromRequest = (req: Request): string | null => {
  const cookieToken = req.cookies?.[TOKEN_COOKIE_NAME];
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await ensureUserTableExists();

    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (String(user.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Administrator access is required' });
    }

    req.currentUser = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const countAdmins = async () => prisma.user.count({ where: { role: 'admin' } });

router.use(requireAdmin);

router.get('/users', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      data: users.map((user) => ({
        ...user,
        ...getUserPresence(user.id),
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load users' });
  }
});

router.post('/users', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureUserTableExists();

    const email = String(_req.body?.email || '').trim().toLowerCase();
    const password = String(_req.body?.password || '');
    const name = String(_req.body?.name || '').trim();
    const role = String(_req.body?.role || 'user').trim().toLowerCase();

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be admin or user' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        id: ulid(),
        email,
        password: hashedPassword,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
});

router.put('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureUserTableExists();

    const id = String(req.params.id || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim();
    const role = String(req.body?.role || 'user').trim().toLowerCase();

    if (!id || !email || !name) {
      return res.status(400).json({ success: false, message: 'User id, name, and email are required' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be admin or user' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const duplicateEmail = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id },
      },
      select: { id: true },
    });
    if (duplicateEmail) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    if (req.currentUser?.id === id && role !== 'admin') {
      return res.status(400).json({ success: false, message: 'You cannot remove your own administrator access' });
    }

    if (existingUser.role === 'admin' && role !== 'admin') {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'At least one administrator must remain in the system' });
      }
    }

    const updateData: Record<string, any> = {
      email,
      name,
      role,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({ success: true, data: updatedUser });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureUserTableExists();

    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ success: false, message: 'User id is required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.currentUser?.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    if (existingUser.role === 'admin') {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'At least one administrator must remain in the system' });
      }
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
});

export default router;