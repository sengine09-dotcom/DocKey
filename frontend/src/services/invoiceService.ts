import axios from 'axios';

const API_BASE_URL = '/api';

const invoiceService = {
  getAll: () => axios.get(`${API_BASE_URL}/invoices`),
  getById: (id: string) => axios.get(`${API_BASE_URL}/invoices/${id}`),
  save: (payload: any) => axios.post(`${API_BASE_URL}/invoices`, payload),
  delete: (id: string) => axios.delete(`${API_BASE_URL}/invoices/${id}`),
};

export default invoiceService;
