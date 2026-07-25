// hooks/useApi.js - Fixed with proper imports
import { useState } from 'react';
import api from '../services/api';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = async (method, url, data = null, config = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`🔄 API ${method.toUpperCase()}: ${url}`, data ? { data } : '');
      
      const response = await api[method](url, data, config);
      
      console.log(`✅ API ${method.toUpperCase()} Success:`, response.data);
      return response.data;
      
    } catch (err) {
      console.error(`❌ API ${method.toUpperCase()} Error:`, {
        url,
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data
      });
      
      // More specific error messages
      let errorMessage = 'An error occurred';
      
      if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Cannot connect to server. Please check if the server is running on port 5002.';
      } else if (err.code === 'ERR_INSUFFICIENT_RESOURCES') {
        errorMessage = 'Server is overloaded or not responding. Please try again.';
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check the server routes.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please check server logs.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    get: (url, config) => request('get', url, null, config),
    post: (url, data, config) => request('post', url, data, config),
    put: (url, data, config) => request('put', url, data, config),
    delete: (url, config) => request('delete', url, null, config),
  };
};

export default useApi;