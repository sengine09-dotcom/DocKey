import axios from 'axios';

const BASE = '/api/purchase';

export type PRStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export interface PRItemPayload {
  productCode?: string;
  description: string;
  qty: number;
  unit?: string;
  estimatedPrice: number;
  remark?: string;
}

export interface PRPayload {
  title: string;
  vendorCode?: string;
  requiredDate?: string;
  remark?: string;
  items: PRItemPayload[];
}

export type GRStatus = 'DRAFT' | 'CONFIRMED';

export interface GRItemPayload {
  productCode?: string;
  description: string;
  poQty: number;
  receivedQty: number;
  unit?: string;
  unitPrice?: number;
  remark?: string;
}

export interface GRPayload {
  poId: string;
  poNumber: string;
  vendorCode?: string;
  receivedDate?: string;
  remark?: string;
  items: GRItemPayload[];
}

const purchaseService = {
  // PR
  pr: {
    getAll: () => axios.get(`${BASE}/pr`),
    getById: (id: string) => axios.get(`${BASE}/pr/${encodeURIComponent(id)}`),
    create: (payload: PRPayload) => axios.post(`${BASE}/pr`, payload),
    update: (id: string, payload: PRPayload) => axios.put(`${BASE}/pr/${encodeURIComponent(id)}`, payload),
    delete: (id: string) => axios.delete(`${BASE}/pr/${encodeURIComponent(id)}`),
    submit: (id: string) => axios.patch(`${BASE}/pr/${encodeURIComponent(id)}/submit`),
    approve: (id: string) => axios.patch(`${BASE}/pr/${encodeURIComponent(id)}/approve`),
    reject: (id: string, reason?: string) => axios.patch(`${BASE}/pr/${encodeURIComponent(id)}/reject`, { reason }),
    convert: (id: string) => axios.patch(`${BASE}/pr/${encodeURIComponent(id)}/convert`),
    markItemsConverted: (id: string, data: { itemIds: string[]; poNumber: string }) =>
      axios.patch(`${BASE}/pr/${encodeURIComponent(id)}/mark-items-converted`, data),
  },

  // GR
  gr: {
    getAll: () => axios.get(`${BASE}/gr`),
    getById: (id: string) => axios.get(`${BASE}/gr/${encodeURIComponent(id)}`),
    create: (payload: GRPayload) => axios.post(`${BASE}/gr`, payload),
    update: (id: string, payload: Partial<GRPayload>) => axios.put(`${BASE}/gr/${encodeURIComponent(id)}`, payload),
    delete: (id: string) => axios.delete(`${BASE}/gr/${encodeURIComponent(id)}`),
    confirm: (id: string) => axios.patch(`${BASE}/gr/${encodeURIComponent(id)}/confirm`),
  },
};

export default purchaseService;
