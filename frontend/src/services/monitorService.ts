import axios from 'axios';

const API_BASE_URL = '/api';

const monitorService = {
  getAll: () => axios.get(`${API_BASE_URL}/monitors`),
  getById: (id: string) => axios.get(`${API_BASE_URL}/monitors/${id}`),
  save: (payload: any) => axios.post(`${API_BASE_URL}/monitors`, payload),
  delete: (id: string) => axios.delete(`${API_BASE_URL}/monitors/${id}`),
};

export default monitorService;
