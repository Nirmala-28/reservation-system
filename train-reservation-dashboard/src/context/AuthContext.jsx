import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('admin_token') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const { data } = await api.get('/api/auth/me');
          if (!data?.data || data.data.role !== 'admin') {
            logout();
            return;
          }
          setUser(data.data);
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });

      if (data?.data?.role !== 'admin') {
        localStorage.removeItem('admin_token');
        setToken(null);
        setUser(null);
        throw new Error('Only admin users may access the admin dashboard');
      }

      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
      setUser(data.data);
      navigate('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);