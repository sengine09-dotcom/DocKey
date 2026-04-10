import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ulid } from 'ulid';
import { prisma } from '../lib/prisma';
import { ensureUserTableExists } from '../lib/ensureUserTable';
import { consumeAdminInitToken, getAdminInitTokenStatus, getVendorRuntimeTokenStatus, releaseAdminInitToken, sendVendorRuntimeDisconnect, sendVendorRuntimeHeartbeat } from '../lib/vendorAdminTokens';
import { clearSystemActivation, getStoredSystemActivation, saveSystemActivation } from '../lib/systemActivation';
import { markUserDisconnected, markUserHeartbeat } from '../lib/userPresence';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-dockey-2026';
const TOKEN_COOKIE_NAME = 'auth_token';
type AuthTokenPayload = { id: string; cid?: string | null };
type VendorExpirySummary = {
  warningLevel?: 'none' | 'healthy' | 'warning' | 'critical' | 'expired';
  daysUntilExpiry?: number | null;
  expiryMessage?: string | null;
  expiryShortLabel?: string | null;
  expiryDateLabel?: string | null;
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

const setAuthCookie = (res: Response, token: string) => {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
};

const clearAuthCookie = (res: Response) => {
  res.clearCookie(TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};

const findAuthenticatedUser = async (token: string) => {
  const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, name: true, role: true, companyId: true },
  });

  return user;
};

const getAuthenticatedUserFromRequest = async (req: Request) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }

  return findAuthenticatedUser(token);
};

const requireAdminFromRequest = async (req: Request) => {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return { user: null, error: { status: 401, message: 'No token provided' } };
  }

  if (String(user.role).toLowerCase() !== 'admin') {
    return { user: null, error: { status: 403, message: 'Administrator access is required' } };
  }

  return { user, error: null };
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const getExpiryWarningLevel = (expiresAt: Date | string | null | undefined) => {
  if (!expiresAt) {
    return { warningLevel: 'none', daysUntilExpiry: null };
  }

  const parsedExpiry = new Date(expiresAt);
  if (Number.isNaN(parsedExpiry.getTime())) {
    return { warningLevel: 'none', daysUntilExpiry: null };
  }

  const today = startOfDay(new Date());
  const expiryDay = startOfDay(parsedExpiry);
  const daysUntilExpiry = Math.ceil((expiryDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (daysUntilExpiry < 0) {
    return { warningLevel: 'expired', daysUntilExpiry };
  }

  if (daysUntilExpiry <= 3) {
    return { warningLevel: 'critical', daysUntilExpiry };
  }

  if (daysUntilExpiry <= 7) {
    return { warningLevel: 'warning', daysUntilExpiry };
  }

  return { warningLevel: 'healthy', daysUntilExpiry };
};

const getExpirySummaryFallback = (expiresAt: Date | string | null | undefined): Required<VendorExpirySummary> => {
  const warning = getExpiryWarningLevel(expiresAt);
  const expiryDateLabel = !expiresAt || Number.isNaN(new Date(expiresAt).getTime())
    ? '-'
    : `${String(new Date(expiresAt).getDate()).padStart(2, '0')}/${String(new Date(expiresAt).getMonth() + 1).padStart(2, '0')}/${new Date(expiresAt).getFullYear()}`;

  if (warning.warningLevel === 'expired') {
    return {
      warningLevel: 'expired',
      daysUntilExpiry: warning.daysUntilExpiry,
      expiryMessage: 'หมดอายุแล้ว',
      expiryShortLabel: 'หมดอายุแล้ว',
      expiryDateLabel,
    };
  }

  if (warning.warningLevel === 'critical' && warning.daysUntilExpiry === 0) {
    return {
      warningLevel: 'critical',
      daysUntilExpiry: warning.daysUntilExpiry,
      expiryMessage: 'หมดอายุวันนี้',
      expiryShortLabel: 'หมดอายุวันนี้',
      expiryDateLabel,
    };
  }

  if (warning.warningLevel === 'critical' && warning.daysUntilExpiry === 1) {
    return {
      warningLevel: 'critical',
      daysUntilExpiry: warning.daysUntilExpiry,
      expiryMessage: 'พรุ่งนี้หมดอายุ',
      expiryShortLabel: 'พรุ่งนี้หมดอายุ',
      expiryDateLabel,
    };
  }

  if (warning.warningLevel === 'critical') {
    return {
      warningLevel: 'critical',
      daysUntilExpiry: warning.daysUntilExpiry,
      expiryMessage: `ใกล้หมดอายุในอีก ${warning.daysUntilExpiry} วัน`,
      expiryShortLabel: `อีก ${warning.daysUntilExpiry} วัน`,
      expiryDateLabel,
    };
  }

  if (warning.warningLevel === 'warning') {
    return {
      warningLevel: 'warning',
      daysUntilExpiry: warning.daysUntilExpiry,
      expiryMessage: `ใกล้หมดอายุในอีก ${warning.daysUntilExpiry} วัน`,
      expiryShortLabel: `อีก ${warning.daysUntilExpiry} วัน`,
      expiryDateLabel,
    };
  }

  if (warning.warningLevel === 'healthy') {
    return {
      warningLevel: 'healthy',
      daysUntilExpiry: warning.daysUntilExpiry,
      expiryMessage: null,
      expiryShortLabel: warning.daysUntilExpiry == null ? 'No expiry limit' : `เหลือ ${warning.daysUntilExpiry} วัน`,
      expiryDateLabel,
    };
  }

  return {
    warningLevel: 'none',
    daysUntilExpiry: null,
    expiryMessage: null,
    expiryShortLabel: 'No expiry limit',
    expiryDateLabel,
  };
};

const resolveVendorTokenSnapshot = async (adminToken: string) => {
  let vendorReachable = true;
  let runtimeStatus: any = null;

  try {
    runtimeStatus = await getVendorRuntimeTokenStatus(adminToken);
  } catch (_error) {
    vendorReachable = false;
  }

  const directStatus = await getAdminInitTokenStatus(adminToken);
  const tokenRecord = directStatus.token;

  return {
    vendorReachable,
    active: runtimeStatus?.active ?? directStatus.valid,
    reason: runtimeStatus?.reason ?? directStatus.reason ?? null,
    expiresAt: runtimeStatus?.expiresAt ?? tokenRecord?.expiresAt ?? null,
    customerName: runtimeStatus?.customerName ?? tokenRecord?.customerName ?? null,
    customerEmail: runtimeStatus?.customerEmail ?? tokenRecord?.customerEmail ?? null,
    usedAt: runtimeStatus?.usedAt ?? tokenRecord?.usedAt ?? null,
    lastSeenAt: runtimeStatus?.lastSeenAt ?? null,
    warningLevel: runtimeStatus?.warningLevel,
    daysUntilExpiry: runtimeStatus?.daysUntilExpiry,
    expiryMessage: runtimeStatus?.expiryMessage,
    expiryShortLabel: runtimeStatus?.expiryShortLabel,
    expiryDateLabel: runtimeStatus?.expiryDateLabel,
  };
};

const hasConfiguredAdmin = async () => {
  await ensureUserTableExists();
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' },
    select: { id: true },
  });

  return Boolean(admin);
};

const getDocKeyActivationState = async () => {
  await ensureUserTableExists();

  const localActivation = await getStoredSystemActivation();
  if (!localActivation) {
    return { activated: false, reason: 'activation-token-missing', token: null };
  }

  const adminConfigured = await hasConfiguredAdmin();
  if (!adminConfigured) {
    return { activated: false, reason: 'admin-not-configured', token: localActivation.adminToken };
  }

  try {
    const vendorStatus = await getVendorRuntimeTokenStatus(localActivation.adminToken);
    if (!vendorStatus.active) {
      return { activated: false, reason: vendorStatus.reason || 'vendor-token-inactive', token: localActivation.adminToken };
    }
  } catch (vendorStatusError) {
    console.warn('Vendor runtime status unavailable, allowing customer access with local activation only.', vendorStatusError);
    return { activated: true, reason: null, token: localActivation.adminToken };
  }

  try {
    await sendVendorRuntimeHeartbeat(localActivation.adminToken);
  } catch (_heartbeatError) {
    console.warn('Vendor heartbeat unavailable, keeping customer access active until vendor returns.');
    return { activated: true, reason: null, token: localActivation.adminToken };
  }

  return { activated: true, reason: null, token: localActivation.adminToken };
};

router.get('/activation-status', async (_req: Request, res: Response) => {
  try {
    const activationState = await getDocKeyActivationState();
    return res.json({ success: true, data: activationState });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load activation status' });
  }
});

router.post('/runtime-disconnect', async (_req: Request, res: Response) => {
  try {
    const localActivation = await getStoredSystemActivation();
    if (!localActivation?.adminToken) {
      return res.status(204).end();
    }

    await sendVendorRuntimeDisconnect(localActivation.adminToken);
    return res.status(204).end();
  } catch (_error) {
    return res.status(204).end();
  }
});

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    await ensureUserTableExists();

    const activationState = await getDocKeyActivationState();
    if (!activationState.activated) {
      return res.status(403).json({ success: false, message: 'DocKey is locked until the administrator is activated from the setup link' });
    }

    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: ulid(),
        email,
        password: hashedPassword,
        name,
        role: 'user',
      },
    });

    // Generate JWT
    const token = jwt.sign({ id: user.id, cid: user.companyId ?? null }, JWT_SECRET, { expiresIn: '7d' });
    markUserHeartbeat(user.id);

    setAuthCookie(res, token);

    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId ?? null },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    await ensureUserTableExists();

    const activationState = await getDocKeyActivationState();
    if (!activationState.activated) {
      return res.status(403).json({ success: false, message: 'DocKey is locked until the administrator is activated from the setup link' });
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, cid: user.companyId ?? null }, JWT_SECRET, { expiresIn: '7d' });
    markUserHeartbeat(user.id);

    setAuthCookie(res, token);

    res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId ?? null },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUserFromRequest(req);
    if (user?.id) {
      markUserDisconnected(user.id);
    }
  } catch (_error) {
    // Best effort only.
  }

  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/user-presence/heartbeat', async (req: Request, res: Response) => {
  try {
    const activationState = await getDocKeyActivationState();
    if (!activationState.activated) {
      return res.status(403).json({ success: false, message: 'DocKey license is inactive', reason: activationState.reason });
    }

    const user = await getAuthenticatedUserFromRequest(req);
    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    markUserHeartbeat(user.id);
    return res.status(204).end();
  } catch (_error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

router.post('/user-presence/disconnect', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUserFromRequest(req);
    if (user?.id) {
      markUserDisconnected(user.id);
    }
  } catch (_error) {
    // Best effort only.
  }

  return res.status(204).end();
});

router.get('/token-status', async (req: Request, res: Response) => {
  try {
    const activationState = await getDocKeyActivationState();
    if (!activationState.activated) {
      return res.status(403).json({ success: false, message: 'DocKey license is inactive', reason: activationState.reason });
    }

    const adminCheck = await requireAdminFromRequest(req);
    if (adminCheck.error) {
      return res.status(adminCheck.error.status).json({ success: false, message: adminCheck.error.message });
    }

    const localActivation = await getStoredSystemActivation();
    if (!localActivation) {
      return res.status(404).json({ success: false, message: 'Activation token is missing' });
    }

    const vendorSnapshot = await resolveVendorTokenSnapshot(localActivation.adminToken);
    const expiresAt = vendorSnapshot.expiresAt;
    const expirySummary = vendorSnapshot.warningLevel
      ? {
          warningLevel: vendorSnapshot.warningLevel,
          daysUntilExpiry: vendorSnapshot.daysUntilExpiry ?? null,
          expiryMessage: vendorSnapshot.expiryMessage ?? null,
          expiryShortLabel: vendorSnapshot.expiryShortLabel ?? null,
          expiryDateLabel: vendorSnapshot.expiryDateLabel ?? null,
        }
      : getExpirySummaryFallback(expiresAt);

    return res.json({
      success: true,
      data: {
        token: localActivation.adminToken,
        adminEmail: localActivation.adminEmail || null,
        activatedAt: localActivation.activatedAt,
        vendorReachable: vendorSnapshot.vendorReachable,
        active: vendorSnapshot.active,
        reason: vendorSnapshot.reason,
        expiresAt,
        customerName: vendorSnapshot.customerName,
        customerEmail: vendorSnapshot.customerEmail,
        usedAt: vendorSnapshot.usedAt,
        warningLevel: expirySummary.warningLevel,
        daysUntilExpiry: expirySummary.daysUntilExpiry,
        expiryMessage: expirySummary.expiryMessage,
        expiryShortLabel: expirySummary.expiryShortLabel,
        expiryDateLabel: expirySummary.expiryDateLabel,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load token status' });
  }
});

router.get('/token-expiry', async (req: Request, res: Response) => {
  try {
    const activationState = await getDocKeyActivationState();
    if (!activationState.activated) {
      return res.status(403).json({ success: false, message: 'DocKey license is inactive', reason: activationState.reason });
    }

    const user = await getAuthenticatedUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const localActivation = await getStoredSystemActivation();
    if (!localActivation) {
      return res.status(404).json({ success: false, message: 'Activation token is missing' });
    }

    const vendorSnapshot = await resolveVendorTokenSnapshot(localActivation.adminToken);
    const expiresAt = vendorSnapshot.expiresAt;
    const expirySummary = vendorSnapshot.warningLevel
      ? {
          warningLevel: vendorSnapshot.warningLevel,
          daysUntilExpiry: vendorSnapshot.daysUntilExpiry ?? null,
          expiryMessage: vendorSnapshot.expiryMessage ?? null,
          expiryShortLabel: vendorSnapshot.expiryShortLabel ?? null,
          expiryDateLabel: vendorSnapshot.expiryDateLabel ?? null,
        }
      : getExpirySummaryFallback(expiresAt);

    return res.json({
      success: true,
      data: {
        active: vendorSnapshot.active,
        reason: vendorSnapshot.reason,
        expiresAt,
        vendorReachable: vendorSnapshot.vendorReachable,
        warningLevel: expirySummary.warningLevel,
        daysUntilExpiry: expirySummary.daysUntilExpiry,
        expiryMessage: expirySummary.expiryMessage,
        expiryShortLabel: expirySummary.expiryShortLabel,
        expiryDateLabel: expirySummary.expiryDateLabel,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load token expiry status' });
  }
});

router.get('/init-admin/status', async (req: Request, res: Response) => {
  try {
    await ensureUserTableExists();

    const token = String(req.query.id || req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (existingAdmin) {
      return res.json({
        success: true,
        data: {
          valid: false,
          reason: 'admin-configured',
        },
      });
    }

    const status = await getAdminInitTokenStatus(token);

    return res.json({
      success: true,
      data: {
        valid: status.valid,
        reason: status.reason,
        customerName: status.token?.customerName || null,
        customerEmail: status.token?.customerEmail || null,
        description: status.token?.description || null,
        expiresAt: status.token?.expiresAt || null,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to validate token' });
  }
});

router.post('/init-admin/claim', async (req: Request, res: Response) => {
  let tokenConsumed = false;

  try {
    await ensureUserTableExists();

    const token = String(req.body?.token || req.body?.id || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!token || !email || !password) {
      return res.status(400).json({ success: false, message: 'Token, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existingAdmin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: 'Administrator is already configured' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const status = await getAdminInitTokenStatus(token);
    if (!status.valid) {
      return res.status(400).json({ success: false, message: 'Token is invalid or unavailable', reason: status.reason });
    }

    tokenConsumed = await consumeAdminInitToken(token, email);
    if (!tokenConsumed) {
      return res.status(409).json({ success: false, message: 'Token has already been used or expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        id: ulid(),
        email,
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
      },
    });

    try {
      await saveSystemActivation(token, email);
    } catch (saveActivationError) {
      await prisma.user.delete({ where: { id: user.id } });
      await releaseAdminInitToken(token);
      await clearSystemActivation();
      throw saveActivationError;
    }

    const authToken = jwt.sign({ id: user.id, cid: null }, JWT_SECRET, { expiresIn: '7d' });
    markUserHeartbeat(user.id);
    setAuthCookie(res, authToken);

    return res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: null },
    });
  } catch (error: any) {
    if (tokenConsumed) {
      try {
        await releaseAdminInitToken(String(req.body?.token || req.body?.id || '').trim());
      } catch (_releaseError) {
        // Best effort only; claim token should be reusable if user creation failed.
      }
    }

    return res.status(500).json({ success: false, message: error.message || 'Failed to create administrator' });
  }
});

// Current User (cookie or bearer token)
router.get('/me', async (req: Request, res: Response) => {
  try {
    const activationState = await getDocKeyActivationState();
    if (!activationState.activated) {
      return res.status(403).json({ success: false, message: 'DocKey license is inactive', reason: activationState.reason });
    }

    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const user = await findAuthenticatedUser(token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    markUserHeartbeat(user.id);

    return res.json({ success: true, user });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Verify Token (for protected routes)
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const activationState = await getDocKeyActivationState();
    if (!activationState.activated) {
      return res.status(403).json({ success: false, message: 'DocKey license is inactive', reason: activationState.reason });
    }

    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const user = await findAuthenticatedUser(token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    markUserHeartbeat(user.id);

    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Register a new company with its first admin user
router.post('/register-company', async (req: Request, res: Response) => {
  try {
    await ensureUserTableExists();

    const activationState = await getDocKeyActivationState();
    if (!activationState.activated) {
      return res.status(403).json({ success: false, message: 'DocKey is locked until the system is activated' });
    }

    const { companyCode, companyName, adminEmail, adminPassword, adminName } = req.body;

    if (!companyCode || !companyName || !adminEmail || !adminPassword || !adminName) {
      return res.status(400).json({ success: false, message: 'companyCode, companyName, adminEmail, adminPassword and adminName are required' });
    }

    if (String(adminPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existingCompany = await prisma.company.findUnique({ where: { companyCode } });
    if (existingCompany) {
      return res.status(400).json({ success: false, message: 'Company code already exists' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const companyId = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

    const [company, user] = await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          id: companyId,
          companyCode,
          name: companyName,
          isActive: true,
        },
      });

      const newUser = await tx.user.create({
        data: {
          id: ulid(),
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'admin',
          companyId: newCompany.id,
        },
      });

      return [newCompany, newUser];
    });

    const token = jwt.sign({ id: user.id, cid: company.id }, JWT_SECRET, { expiresIn: '7d' });
    markUserHeartbeat(user.id);
    setAuthCookie(res, token);

    return res.json({
      success: true,
      company: { id: company.id, companyCode: company.companyCode, name: company.name },
      user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId },
    });
  } catch (error: any) {
    console.error('Register company error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to register company' });
  }
});

export default router;
