import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export type AdminInitToken = {
  id: string;
  token: string;
  customerName?: string | null;
  customerEmail?: string | null;
  description?: string | null;
  isActive: boolean;
  online?: boolean;
  expiresAt?: string | null;
  usedAt?: string | null;
  usedByEmail?: string | null;
  lastSeenAt?: string | null;
  warningLevel?: 'none' | 'healthy' | 'warning' | 'critical' | 'expired';
  daysUntilExpiry?: number | null;
  expiryMessage?: string | null;
  expiryShortLabel?: string | null;
  expiryDateLabel?: string | null;
  createdAt: string;
  updatedAt: string;
  claimUrl: string;
};

const adminInitTokenService = {
  list: async () => {
    const response = await api.get('/admin-init-tokens');
    return response.data.data as AdminInitToken[];
  },
  create: async (payload: {
    customerName?: string;
    customerEmail?: string;
    description?: string;
    expiresAt?: string;
  }) => {
    const response = await api.post('/admin-init-tokens', payload);
    return response.data.data as AdminInitToken;
  },
  disable: async (id: string) => {
    const response = await api.patch(`/admin-init-tokens/${id}/disable`);
    return response.data.data as AdminInitToken;
  },
  update: async (
    id: string,
    payload: {
      customerName?: string;
      customerEmail?: string;
      description?: string;
      expiresAt?: string;
    }
  ) => {
    const response = await api.patch(`/admin-init-tokens/${id}`, payload);
    return response.data.data as AdminInitToken;
  },
  remove: async (id: string) => {
    await api.delete(`/admin-init-tokens/${id}`);
  },
};

export default adminInitTokenService;