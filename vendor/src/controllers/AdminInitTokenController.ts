import { Request, Response } from 'express';
import { ulid } from 'ulid';
import { prisma } from '../lib/prisma';

const PRESENCE_WINDOW_MS = 30 * 1000;
const tokenPresence = new Map<string, { lastHeartbeatAt: number; disconnectedAt: number | null }>();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeOptionalText = (value: unknown) => {
  if (value == null) {
    return '';
  }

  return String(value).trim();
};

const parseExpiryDate = (value: unknown) => {
  if (value == null || value === '') {
    return { value: null as Date | null, error: null as string | null };
  }

  const raw = String(value).trim();
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = datePattern.exec(raw);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const parsed = new Date(year, month - 1, day, 23, 59, 59, 999);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return { value: null as Date | null, error: 'Expire date must use a valid dd/mm/yyyy value.' };
    }

    return { value: parsed, error: null as string | null };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { value: null as Date | null, error: 'Expire date must use dd/mm/yyyy format.' };
  }

  return { value: parsed, error: null as string | null };
};

const validateTokenPayload = (payload: {
  customerName: unknown;
  customerEmail: unknown;
  description: unknown;
  expiresAt: Date | null;
}) => {
  const customerName = normalizeOptionalText(payload.customerName);
  const customerEmail = normalizeOptionalText(payload.customerEmail).toLowerCase();
  const description = normalizeOptionalText(payload.description);

  if (!customerName) {
    return { valid: false, message: 'Customer name is required.' };
  }

  if (customerName.length > 255) {
    return { valid: false, message: 'Customer name must be 255 characters or fewer.' };
  }

  if (!customerEmail) {
    return { valid: false, message: 'Customer email is required.' };
  }

  if (customerEmail.length > 191) {
    return { valid: false, message: 'Customer email must be 191 characters or fewer.' };
  }

  if (!EMAIL_PATTERN.test(customerEmail)) {
    return { valid: false, message: 'Customer email format is invalid.' };
  }

  if (description.length > 255) {
    return { valid: false, message: 'Description must be 255 characters or fewer.' };
  }

  if (payload.expiresAt && payload.expiresAt.getTime() <= Date.now()) {
    return { valid: false, message: 'Expire date must be later than the current time.' };
  }

  return {
    valid: true,
    data: {
      customerName,
      customerEmail,
      description,
    },
  };
};

const getRecordedActivityAt = (token: string, lastSeenAt?: Date | string | null) => {
  const presence = tokenPresence.get(token);
  if (presence?.disconnectedAt && presence.disconnectedAt >= presence.lastHeartbeatAt) {
    return null;
  }

  if (presence?.lastHeartbeatAt) {
    return presence.lastHeartbeatAt;
  }

  if (!lastSeenAt) {
    return null;
  }

  const parsed = new Date(lastSeenAt).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const isTokenOnline = (tokenRecord: any) => {
  if (!tokenRecord?.token) {
    return false;
  }

  const activityAt = getRecordedActivityAt(tokenRecord.token, tokenRecord.lastSeenAt);
  if (!activityAt) {
    return false;
  }

  return Date.now() - activityAt <= PRESENCE_WINDOW_MS;
};

const markTokenHeartbeat = (token: string) => {
  tokenPresence.set(token, {
    lastHeartbeatAt: Date.now(),
    disconnectedAt: null,
  });
};

const markTokenDisconnected = (token: string) => {
  const current = tokenPresence.get(token);
  tokenPresence.set(token, {
    lastHeartbeatAt: current?.lastHeartbeatAt || 0,
    disconnectedAt: Date.now(),
  });
};

const buildClaimUrl = (token: string) => {
  const baseUrl = (process.env.CUSTOMER_CLAIM_BASE_URL || 'https://customer-domain.com/dockey/init/admin').trim();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}id=${encodeURIComponent(token)}`;
};

const toTokenResponse = (tokenRecord: any) => ({
  ...tokenRecord,
  online: isTokenOnline(tokenRecord),
  claimUrl: buildClaimUrl(tokenRecord.token),
});

const normalizeStatus = (tokenRecord: any) => {
  if (!tokenRecord) {
    return { valid: false, reason: 'not-found' };
  }

  if (!tokenRecord.isActive) {
    return { valid: false, reason: 'disabled' };
  }

  if (tokenRecord.usedAt) {
    return { valid: false, reason: 'used' };
  }

  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, reason: null };
};

const normalizeRuntimeStatus = (tokenRecord: any) => {
  if (!tokenRecord) {
    return { active: false, reason: 'not-found' };
  }

  if (!tokenRecord.isActive) {
    return { active: false, reason: 'disabled' };
  }

  if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt).getTime() <= Date.now()) {
    return { active: false, reason: 'expired' };
  }

  return { active: true, reason: null };
};

class AdminInitTokenController {
  static async list(_req: Request, res: Response) {
    try {
      const tokens = await prisma.adminInitToken.findMany({
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: tokens.map(toTokenResponse),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to load tokens' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { customerName, customerEmail, description, expiresAt } = req.body;
      const parsedExpiryDate = parseExpiryDate(expiresAt);

      if (parsedExpiryDate.error) {
        return res.status(400).json({ success: false, message: parsedExpiryDate.error });
      }

      const validation = validateTokenPayload({
        customerName,
        customerEmail,
        description,
        expiresAt: parsedExpiryDate.value,
      });

      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const tokenRecord = await prisma.adminInitToken.create({
        data: {
          id: ulid(),
          token: ulid(),
          customerName: validation.data.customerName,
          customerEmail: validation.data.customerEmail,
          description: validation.data.description || null,
          expiresAt: parsedExpiryDate.value,
          isActive: true,
        },
      });

      res.status(201).json({
        success: true,
        data: toTokenResponse(tokenRecord),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to create token' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { customerName, customerEmail, description, expiresAt } = req.body;

      const existing = await prisma.adminInitToken.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Token not found' });
      }

      const parsedExpiryDate = parseExpiryDate(expiresAt);

      if (parsedExpiryDate.error) {
        return res.status(400).json({ success: false, message: parsedExpiryDate.error });
      }

      const validation = validateTokenPayload({
        customerName,
        customerEmail,
        description,
        expiresAt: parsedExpiryDate.value,
      });

      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const updated = await prisma.adminInitToken.update({
        where: { id },
        data: {
          customerName: validation.data.customerName,
          customerEmail: validation.data.customerEmail,
          description: validation.data.description || null,
          expiresAt: parsedExpiryDate.value,
        },
      });

      return res.json({
        success: true,
        data: toTokenResponse(updated),
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to update token' });
    }
  }

  static async disable(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const updated = await prisma.adminInitToken.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        data: toTokenResponse(updated),
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to disable token' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const tokenRecord = await prisma.adminInitToken.findUnique({
        where: { id },
      });

      if (!tokenRecord) {
        return res.status(404).json({ success: false, message: 'Token not found' });
      }

      await prisma.adminInitToken.delete({
        where: { id },
      });

      tokenPresence.delete(tokenRecord.token);

      return res.json({
        success: true,
        message: 'Token deleted successfully',
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to delete token' });
    }
  }

  static async status(req: Request, res: Response) {
    try {
      const token = String(req.query.id || req.query.token || '').trim();
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      const tokenRecord = await prisma.adminInitToken.findUnique({
        where: { token },
      });

      const status = normalizeStatus(tokenRecord);

      return res.json({
        success: true,
        data: {
          ...status,
          customerName: tokenRecord?.customerName || null,
          customerEmail: tokenRecord?.customerEmail || null,
          description: tokenRecord?.description || null,
          expiresAt: tokenRecord?.expiresAt || null,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to validate token' });
    }
  }

  static async runtimeStatus(req: Request, res: Response) {
    try {
      const token = String(req.query.id || req.query.token || '').trim();
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      const tokenRecord = await prisma.adminInitToken.findUnique({
        where: { token },
      });

      const status = normalizeRuntimeStatus(tokenRecord);

      return res.json({
        success: true,
        data: {
          ...status,
          customerName: tokenRecord?.customerName || null,
          customerEmail: tokenRecord?.customerEmail || null,
          expiresAt: tokenRecord?.expiresAt || null,
          usedAt: tokenRecord?.usedAt || null,
          lastSeenAt: tokenRecord?.lastSeenAt || null,
          online: isTokenOnline(tokenRecord),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to validate runtime token' });
    }
  }

  static async heartbeat(req: Request, res: Response) {
    try {
      const token = String(req.body?.token || req.body?.id || '').trim();
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      const tokenRecord = await prisma.adminInitToken.findUnique({
        where: { token },
      });

      const status = normalizeRuntimeStatus(tokenRecord);
      if (!status.active) {
        return res.status(400).json({ success: false, message: 'Token is inactive', data: status });
      }

      const updated = await prisma.adminInitToken.update({
        where: { token },
        data: { lastSeenAt: new Date() },
      });

      markTokenHeartbeat(token);

      return res.json({
        success: true,
        data: {
          active: true,
          reason: null,
          lastSeenAt: updated.lastSeenAt,
          online: true,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to update heartbeat' });
    }
  }

  static async disconnect(req: Request, res: Response) {
    try {
      const token = String(req.body?.token || req.body?.id || '').trim();
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }

      const tokenRecord = await prisma.adminInitToken.findUnique({
        where: { token },
      });

      const status = normalizeRuntimeStatus(tokenRecord);
      if (!status.active) {
        return res.status(400).json({ success: false, message: 'Token is inactive', data: status });
      }

      markTokenDisconnected(token);

      return res.json({
        success: true,
        data: {
          active: true,
          reason: null,
          lastSeenAt: tokenRecord?.lastSeenAt || null,
          online: false,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to update disconnect status' });
    }
  }
}

export default AdminInitTokenController;