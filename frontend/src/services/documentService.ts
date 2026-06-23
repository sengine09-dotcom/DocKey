import axios from 'axios';

const API_BASE_URL = '/api';

export type MainDocumentType = 'quotation' | 'invoice' | 'receipt' | 'deposit_receipt' | 'deposit_invoice' | 'purchase_order' | 'work_order' | 'delivery_order' | 'customer_return';

const normalizeDocumentType = (type: string) => String(type || '').trim().toLowerCase().replace(/-/g, '_');

export interface DocumentListParams {
  limit?: number;
  search?: string;
  customer?: string;
  vendorCode?: string;
}

const documentService = {
  getAll: (type: MainDocumentType | string, params?: DocumentListParams) =>
    axios.get(`${API_BASE_URL}/documents/${encodeURIComponent(normalizeDocumentType(type))}`, { params }),
  getById: (type: MainDocumentType | string, id: string) =>
    axios.get(`${API_BASE_URL}/documents/${encodeURIComponent(normalizeDocumentType(type))}/${encodeURIComponent(id)}`),
  save: (type: MainDocumentType | string, payload: any) =>
    axios.post(`${API_BASE_URL}/documents/${encodeURIComponent(normalizeDocumentType(type))}`, payload),
  delete: (type: MainDocumentType | string, id: string) =>
    axios.delete(`${API_BASE_URL}/documents/${encodeURIComponent(normalizeDocumentType(type))}/${encodeURIComponent(id)}`),
};

export default documentService;