// Vendor API base URL
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
  const response = await fetch(`${vendorApiBaseUrl}/admin-init-tokens/status?id=${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw new Error(`Vendor token status check failed with status ${response.status}`);
  }
  const payload = await response.json();
  return payload?.data || { valid: false, reason: 'vendor-check-failed', token: null };
};

export const consumeAdminInitToken = async (token: string, email: string) => {
  
  console.log('consumeAdminInitToken', token, email);

  const response = await fetch(`${vendorApiBaseUrl}/admin-init-tokens/consume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, email }),
  });
  if (!response.ok) {
    return false;
  }
  const payload = await response.json();
  return payload?.success === true;
};

export const releaseAdminInitToken = async (token: string) => {
  const response = await fetch(`${vendorApiBaseUrl}/admin-init-tokens/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    return false;
  }
  const payload = await response.json();
  return payload?.success === true;
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