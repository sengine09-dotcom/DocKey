import axios from 'axios';

const API_BASE_URL = '/api';

export type DocKeyUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  companyId: string | null;
  online?: boolean;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

const userService = {
  getAll: () => axios.get(`${API_BASE_URL}/users`),
  create: (payload: { name: string; email: string; password: string; role: 'admin' | 'user' }) => axios.post(`${API_BASE_URL}/users`, payload),
  update: (id: string, payload: { name: string; email: string; password?: string; role: 'admin' | 'user' }) => axios.put(`${API_BASE_URL}/users/${id}`, payload),
  delete: (id: string) => axios.delete(`${API_BASE_URL}/users/${id}`),
};

export default userService;