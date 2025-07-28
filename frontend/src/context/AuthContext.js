import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'react-toastify';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
};

// Action types
const AUTH_SUCCESS = 'AUTH_SUCCESS';
const AUTH_ERROR = 'AUTH_ERROR';
const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
const LOGIN_FAIL = 'LOGIN_FAIL';
const LOGOUT = 'LOGOUT';
const CLEAR_ERRORS = 'CLEAR_ERRORS';
const SET_LOADING = 'SET_LOADING';
const UPDATE_USER = 'UPDATE_USER';

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case AUTH_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case LOGIN_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
    case AUTH_ERROR:
    case LOGIN_FAIL:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
    case LOGOUT:
      localStorage.removeItem('token');
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Set auth token
const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['x-auth-token'] = token;
  } else {
    delete api.defaults.headers.common['x-auth-token'];
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user
  const loadUser = async () => {
    if (localStorage.token) {
      setAuthToken(localStorage.token);
    }

    try {
      const res = await api.get('/api/auth/user');
      dispatch({
        type: AUTH_SUCCESS,
        payload: res.data
      });
    } catch (err) {
      dispatch({
        type: AUTH_ERROR,
        payload: err.response?.data?.message || 'Kullanıcı yüklenemedi'
      });
    }
  };

  // Login user
  const login = async (formData) => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      dispatch({ type: SET_LOADING, payload: true });
      const res = await api.post('/api/auth/login', formData, config);
      
      dispatch({
        type: LOGIN_SUCCESS,
        payload: res.data
      });
      
      setAuthToken(res.data.token);
      toast.success('Başarıyla giriş yapıldı!');
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Giriş yapılamadı';
      dispatch({
        type: LOGIN_FAIL,
        payload: errorMsg
      });
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Register user
  const register = async (formData) => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      dispatch({ type: SET_LOADING, payload: true });
      const res = await api.post('/api/auth/register', formData, config);
      
      dispatch({
        type: LOGIN_SUCCESS,
        payload: res.data
      });
      
      setAuthToken(res.data.token);
      toast.success('Hesap başarıyla oluşturuldu!');
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Kayıt oluşturulamadı';
      dispatch({
        type: LOGIN_FAIL,
        payload: errorMsg
      });
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Logout
  const logout = () => {
    dispatch({ type: LOGOUT });
    setAuthToken(null);
    toast.info('Çıkış yapıldı');
  };

  // Update user profile
  const updateProfile = async (formData) => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      const res = await api.put('/api/auth/profile', formData, config);
      
      dispatch({
        type: UPDATE_USER,
        payload: res.data
      });
      
      toast.success('Profil güncellendi!');
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Profil güncellenemedi';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Change password
  const changePassword = async (formData) => {
    const config = {
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      await api.put('/api/auth/change-password', formData, config);
      toast.success('Şifre başarıyla değiştirildi!');
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Şifre değiştirilemedi';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Clear errors
  const clearErrors = useCallback(() => {
    dispatch({ type: CLEAR_ERRORS });
  }, []);

  // Check permissions
  const hasPermission = (permission) => {
    if (!state.user) return false;
    if (state.user.role === 'admin') return true;
    return state.user.permissions && state.user.permissions.includes(permission);
  };

  // Check if user is admin
  const isAdmin = () => {
    return state.user && state.user.role === 'admin';
  };

  // Check if user is manager
  const isManager = () => {
    return state.user && (state.user.role === 'admin' || state.user.role === 'manager');
  };

  // useEffect(() => {
  //   loadUser();
  // }, []);

  // Set up api interceptor for token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && state.isAuthenticated) {
          logout();
          toast.error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [state.isAuthenticated]);

  const value = {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    loadUser,
    updateProfile,
    changePassword,
    clearErrors,
    hasPermission,
    isAdmin,
    isManager
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;