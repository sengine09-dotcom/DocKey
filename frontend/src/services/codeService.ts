import axios from 'axios';

const API_BASE_URL = '/api';

const codeService = {
  getAll: (type: string) => axios.get(`${API_BASE_URL}/codes/${type}`),
  create: (type: string, payload: any) => axios.post(`${API_BASE_URL}/codes/${type}`, payload),
  update: (type: string, id: string, payload: any) => axios.put(`${API_BASE_URL}/codes/${type}/${id}`, payload),
  delete: (type: string, id: string) => axios.delete(`${API_BASE_URL}/codes/${type}/${id}`),
};

export default codeService;