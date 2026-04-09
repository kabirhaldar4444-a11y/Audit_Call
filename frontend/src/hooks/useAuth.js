import { useState, useCallback } from 'react';
import api from '../utils/api';

export const useAuth = () => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const register = useCallback(async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      console.log('📝 Attempting registration...');
      const response = await api.post('/auth/register', { username, email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      console.log('✅ Registration successful');
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      console.error('❌ Registration error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔐 Attempting login...');
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      console.log('✅ Login successful');
      return response.data;
    } catch (err) {
      let errorMessage = 'Login failed';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Check if it's a network error
      if (err.message === 'Network Error') {
        errorMessage = 'Cannot connect to backend. Is the server running on http://localhost:5000?';
      }
      
      console.error('❌ Login error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  }, []);

  return { user, loading, error, register, login, logout };
};
