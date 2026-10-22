import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const data = await api.getMe();
      if (data && data.admin) {
        setAdmin(data.admin);
        localStorage.setItem('admin_user', JSON.stringify(data.admin));
      } else {
        setAdmin(null);
        localStorage.removeItem('admin_user');
      }
    } catch (err) {
      setAdmin(null);
      localStorage.removeItem('admin_user');
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    const data = await api.login({ username, password });
    if (data.token) {
      localStorage.setItem('admin_token', data.token);
    }
    if (data.admin) {
      setAdmin(data.admin);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));
    }
    return data;
  }

  async function logout() {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      setAdmin(null);
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
