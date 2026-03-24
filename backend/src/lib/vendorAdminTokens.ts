import mysql from 'mysql2/promise';

type AdminInitTokenRow = {
  id: string;
  token: string;
  customerName: string | null;
  customerEmail: string | null;
  description: string | null;
  isActive: number | boolean;
  expiresAt: Date | null;
  usedAt: Date | null;
  usedByEmail: string | null;
};

const getVendorPool = () => mysql.createPool({
  host: process.env.VENDOR_DB_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.VENDOR_DB_USER || process.env.DB_USER || 'root',
  password: process.env.VENDOR_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.VENDOR_DB_NAME || 'dbDockerVendor',
  port: Number(process.env.VENDOR_DB_PORT || process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

const vendorPool = getVendorPool();
const vendorApiBaseUrl = (process.env.VENDOR_API_BASE_URL || 'http://localhost:5100/api').replace(/\/$/, '');

const resolveStatusReason = (tokenRow: AdminInitTokenRow | null) => {
  if (!tokenRow) {
    return 'not-found';
  }

  if (!tokenRow.isActive) {
    return 'disabled';
  }

  if (tokenRow.usedAt) {
    return 'used';
  }

  if (tokenRow.expiresAt && new Date(tokenRow.expiresAt).getTime() <= Date.now()) {
    return 'expired';
  }

  return null;
};

export const getAdminInitTokenStatus = async (token: string) => {
  const [rows] = await vendorPool.query(
    `
      SELECT id, token, customerName, customerEmail, description, isActive, expiresAt, usedAt, usedByEmail
      FROM tblAdminInitToken
      WHERE token = ?
      LIMIT 1
    `,
    [token]
  );

  const tokenRow = ((rows as AdminInitTokenRow[]) || [])[0] || null;
  const reason = resolveStatusReason(tokenRow);

  return {
    valid: !reason,
    reason,
    token: tokenRow,
  };
};

export const consumeAdminInitToken = async (token: string, email: string) => {
  const [result] = await vendorPool.execute(
    `
      UPDATE tblAdminInitToken
      SET usedAt = CURRENT_TIMESTAMP(3), usedByEmail = ?, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE token = ?
        AND isActive = true
        AND usedAt IS NULL
        AND (expiresAt IS NULL OR expiresAt > CURRENT_TIMESTAMP(3))
    `,
    [email, token]
  );

  return Number((result as mysql.ResultSetHeader).affectedRows || 0) === 1;
};

export const releaseAdminInitToken = async (token: string) => {
  await vendorPool.execute(
    `
      UPDATE tblAdminInitToken
      SET usedAt = NULL, usedByEmail = NULL, updatedAt = CURRENT_TIMESTAMP(3)
      WHERE token = ?
    `,
    [token]
  );
};

export const getVendorRuntimeTokenStatus = async (token: string) => {
  const response = await fetch(`${vendorApiBaseUrl}/admin-init-tokens/runtime-status?id=${encodeURIComponent(token)}`);

  if (!response.ok) {
    throw new Error(`Vendor runtime token check failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload?.data || { active: false, reason: 'vendor-check-failed' };
};

export const sendVendorRuntimeHeartbeat = async (token: string) => {
  const response = await fetch(`${vendorApiBaseUrl}/admin-init-tokens/runtime-heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(`Vendor runtime heartbeat failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload?.data || { active: false, reason: 'vendor-heartbeat-failed' };
};

export const sendVendorRuntimeDisconnect = async (token: string) => {
  const response = await fetch(`${vendorApiBaseUrl}/admin-init-tokens/runtime-disconnect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(`Vendor runtime disconnect failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload?.data || { active: false, reason: 'vendor-disconnect-failed' };
};