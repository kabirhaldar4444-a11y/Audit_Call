import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');
  const { login, register: registerUser, loading, error } = useAuth();

  // Check if backend is running
  useEffect(() => {
    const checkServer = async () => {
      try {
        await api.get('/health');
        setServerStatus('connected');
      } catch (err) {
        console.error('Server connection error:', err);
        setServerStatus('disconnected');
      }
    };

    checkServer();
    // Check every 5 seconds
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await registerUser(username, email, password);
      } else {
        await login(username, password);
      }
      onLoginSuccess();
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const getStatusMessage = () => {
    if (serverStatus === 'checking') return '🔄 Checking server...';
    if (serverStatus === 'connected') return '✅ Server connected';
    return '❌ Server not running';
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Call Audit System</h1>
        <p className="subtitle">{isRegister ? 'Register' : 'Admin Login'}</p>

        <div className={`server-status ${serverStatus}`}>
          {getStatusMessage()}
        </div>

        {serverStatus === 'disconnected' && (
          <div className="error-message">
            ⚠️ Backend server is not running!
            <br />
            <small>Start it with: cd backend && npm run dev</small>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="login-btn" 
            disabled={loading}
          >
            {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
          </button>

          <button
            type="button"
            className="toggle-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setUsername('');
              setEmail('');
              setPassword('');
            }}
            disabled={loading}
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
