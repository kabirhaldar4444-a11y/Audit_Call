import axios from 'axios';

const getApiUrl = () => {
  const { hostname } = window.location;
  // On Vercel, the backend is now hosted on the SAME domain under /api
  if (hostname.includes('vercel.app')) {
    return '/api';
  }
  // Fallback for local development
  return process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000, 
});

// Add token to requests
// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token expiration (401)
api.interceptors.response.use(
  (response) => {
    // Ensure data exists to prevent frontend crashes
    if (response && !response.data) {
      response.data = {};
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
