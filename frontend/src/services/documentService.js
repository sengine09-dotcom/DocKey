import axios from 'axios';

const API_BASE_URL = '/api';

const documentService = {
  getAll: (search = '', status = '') => {
    return axios.get(`${API_BASE_URL}/documents`, {
      params: {
        search,
        status
      }
    });
  },

  create: (fileName, customerName) => {
    return axios.post(`${API_BASE_URL}/documents`, {
      fileName,
      customerName
    });
  },

  delete: (id) => {
    return axios.delete(`${API_BASE_URL}/documents/${id}`);
  }
};

export default documentService;
