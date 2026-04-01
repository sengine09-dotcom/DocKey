import axios from 'axios';

const API_BASE_URL = '/api';

export type MainDocumentType = 'quotation' | 'invoice' | 'receipt' | 'purchase_order' | 'work_order';

const normalizeDocumentType = (type: string) => String(type || '').trim().toLowerCase().replace(/-/g, '_');

const documentService = {
  getAll: (type: MainDocumentType | string) =>
    axios.get(`${API_BASE_URL}/documents/${encodeURIComponent(normalizeDocumentType(type))}`),
  getById: (type: MainDocumentType | string, id: string) =>
    axios.get(`${API_BASE_URL}/documents/${encodeURIComponent(normalizeDocumentType(type))}/${encodeURIComponent(id)}`),
  save: (type: MainDocumentType | string, payload: any) =>
    axios.post(`${API_BASE_URL}/documents/${encodeURIComponent(normalizeDocumentType(type))}`, payload),
  delete: (type: MainDocumentType | string, id: string) =>
    axios.delete(`${API_BASE_URL}/documents/${encodeURIComponent(normalizeDocumentType(type))}/${encodeURIComponent(id)}`),
};

export default documentService;