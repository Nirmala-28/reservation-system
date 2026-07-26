// Single source of truth for the backend API origin.
// Override by setting VITE_API_URL in .env (see .env.example).
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default API_BASE_URL;
