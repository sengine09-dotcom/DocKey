import axios from 'axios';

const BASE = '/api/so';

export type SOStatus = 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

export interface SOItemPayload {
  productCode?: string;
  description: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  amount: number;
  remark?: string;
}

export interface SOPayload {
  customerCode?: string;
  customerName: string;
  salesPerson?: string;
  soDate?: string;
  requiredDate?: string;
  paymentTerm?: string;
  remark?: string;
  items: SOItemPayload[];
}

export interface SOItem {
  id: string;
  soId: string;
  lineNo: number;
  productCode: string | null;
  description: string;
  qty: number;
  unit: string | null;
  unitPrice: number;
  discount: number;
  amount: number;
  deliveredQty: number;
  convertedToPr: boolean;
  prNumber: string | null;
  remark: string | null;
}

export interface SaleOrder {
  id: string;
  soNumber: string;
  customerCode: string | null;
  customerName: string;
  salesPerson: string | null;
  soDate: string;
  requiredDate: string | null;
  status: SOStatus;
  paymentTerm: string | null;
  remark: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  items: SOItem[];
}

export interface SOWorkflowStatus {
  di: {
    documentNumber: string;
    status: string;
    depositPercentage: number;
    depositAmount: number;
  } | null;
  dr: {
    documentNumber: string;
    status: string;
    paymentAmount: number;
    receivedDate: string | null;
  } | null;
  invoice: {
    documentNumber: string;
    status: string;
    total: number;
  } | null;
  receipt: {
    documentNumber: string;
    status: string;
    total: number;
    receivedDate: string | null;
  } | null;
  do: {
    documentNumber: string;
    status: string;
  } | null;
}

export async function fetchSOWorkflowStatus(soId: string): Promise<SOWorkflowStatus> {
  const res = await axios.get<{ success: boolean; data: SOWorkflowStatus }>(
    `${BASE}/${encodeURIComponent(soId)}/deposit-status`
  );
  return res.data.data;
}

export interface SOItemGRStatus {
  poNumber: string | null;
  grNumber: string | null;
  grStatus: string | null;
  grReceived: boolean;
}

export async function fetchSOItemsGRStatus(soId: string): Promise<Record<string, SOItemGRStatus>> {
  const res = await axios.get<{ success: boolean; data: Record<string, SOItemGRStatus> }>(
    `${BASE}/${encodeURIComponent(soId)}/items-gr-status`
  );
  return res.data.data;
}

const soService = {
  getAll: () => axios.get<{ success: boolean; data: SaleOrder[] }>(BASE),
  getById: (id: string) => axios.get<{ success: boolean; data: SaleOrder }>(`${BASE}/${encodeURIComponent(id)}`),
  create: (payload: SOPayload) => axios.post<{ success: boolean; data: SaleOrder }>(BASE, payload),
  update: (id: string, payload: SOPayload) => axios.put<{ success: boolean; data: SaleOrder }>(`${BASE}/${encodeURIComponent(id)}`, payload),
  delete: (id: string) => axios.delete(`${BASE}/${encodeURIComponent(id)}`),
  confirm: (id: string) => axios.patch(`${BASE}/${encodeURIComponent(id)}/confirm`),
  cancel: (id: string) => axios.patch(`${BASE}/${encodeURIComponent(id)}/cancel`),
  complete: (id: string) => axios.patch<{ success: boolean; data: SaleOrder }>(`${BASE}/${encodeURIComponent(id)}/complete`),
  markItemsConverted: (id: string, data: { itemIds: string[]; prNumber: string }) =>
    axios.patch(`${BASE}/${encodeURIComponent(id)}/mark-items-converted`, data),
  payFull: (id: string, serialNumbers: string[]) =>
    axios.post<{ success: boolean; data: { rcId: string; doId: string; invId: string } }>(
      `${BASE}/${encodeURIComponent(id)}/pay-full`,
      { serialNumbers },
    ),
  createDO: (id: string) =>
    axios.post<{ success: boolean; data: { doId: string; doNumber: string } }>(
      `${BASE}/${encodeURIComponent(id)}/create-do`,
    ),
};

export default soService;
