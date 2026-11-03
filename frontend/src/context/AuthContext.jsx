import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import { requestAdminLogin } from './adminLogin';
const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';
const API = `${API_BASE}/api/admin`;

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const s = sessionStorage.getItem('rv-admin');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const [token, setToken] = useState(
    () => sessionStorage.getItem('rv-token') || null
  );

  const login = useCallback(async (email, password) => {
    const { token: t, admin: a } = await requestAdminLogin(axios, API_BASE, email, password);
    setToken(t);
    setAdmin(a);
    sessionStorage.setItem('rv-token', t);
    sessionStorage.setItem('rv-admin', JSON.stringify(a));
    return a;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await axios.post(`${API}/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          return axios.post(`${API_BASE}/api_admin.php?action=logout`, {}, {
            headers: { Authorization: `Bearer ${token}` },
          });
        });
      }
    } catch { /* ignore */ }
    setToken(null);
    setAdmin(null);
    sessionStorage.removeItem('rv-token');
    sessionStorage.removeItem('rv-admin');
  }, [token]);

  const hasPermission = useCallback((perm) => {
    if (!admin) return false;
    if (admin.is_super_admin) return true;
    return !!(admin.permissions?.[perm]);
  }, [admin]);

  // Axios helper with auth header
  const authAxios = useCallback(() => {
    const instance = axios.create({
      baseURL: `${API_BASE}/api/admin`,
      headers: { Authorization: `Bearer ${token}` },
    });
    instance.interceptors.response.use(
      res => res,
      err => {
        if (err.response && err.response.status === 401) {
          setToken(null);
          setAdmin(null);
          sessionStorage.removeItem('rv-token');
          sessionStorage.removeItem('rv-admin');
        }
        return Promise.reject(err);
      }
    );
    return instance;
  }, [token]);

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, hasPermission, authAxios }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
