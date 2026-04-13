import axios from 'axios';

const getApiUrl = () => {
  const { hostname } = window.location;
  // If we are on the live Vercel site, ALWAYS use the production backend
  if (hostname.includes('vercel.app')) {
    return 'https://audit-call-backend.vercel.app/api';
  }
  // Otherwise use the environment variable or local default
  return process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 300000, 
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
