import axios from 'axios';

const API_BASE_URL = '/api';

export const dashboardService = {
  // Get dashboard metrics and documents
  getMetrics: () => axios.get(`${API_BASE_URL}/dashboard/metrics`),
};

export default dashboardService;
