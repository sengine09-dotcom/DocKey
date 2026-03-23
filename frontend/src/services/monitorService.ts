import axios from 'axios';

const API_BASE_URL = '/api';

const monitorService = {
  getAll: () => axios.get(`${API_BASE_URL}/monitors`),
  getNextId: () => axios.get(`${API_BASE_URL}/monitors/next-id`),
  getById: (id: string) => axios.get(`${API_BASE_URL}/monitors/${id}`),
  save: (payload: any) => axios.post(`${API_BASE_URL}/monitors`, payload),
  delete: (id: string) => axios.delete(`${API_BASE_URL}/monitors/${id}`),
  markPrinted: (id: string) => axios.patch(`${API_BASE_URL}/monitors/${encodeURIComponent(id)}/print`),
};

export default monitorService;
