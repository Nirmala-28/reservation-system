// api/index.js
import axios from "axios";

const API_URL = "http://localhost:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to add authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth APIs
export const register = async (userData) => {
  try {
    const response = await api.post("/auth/register", userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const login = async (credentials) => {
  try {
    const response = await api.post("/auth/login", credentials);
    // Save token to localStorage
    if (response.data.token) {
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.data));
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getUser = async () => {
  try {
    const response = await api.get("/auth/me");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

// Train APIs
export const getAllTrains = async () => {
  try {
    const response = await api.get("/trains");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const getTrain = async (id) => {
  try {
    const response = await api.get(`/trains/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const searchTrains = async (searchParams) => {
  try {
    const response = await api.post("/trains/search", searchParams);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

// Meal APIs
export const getMealsByTrain = async (trainNumber) => {
  try {
    const response = await api.get(`/meals/train/${trainNumber}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

// Coupon APIs
export const validateCoupon = async (code) => {
  try {
    const response = await api.post("/coupons/validate", { code });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const applyCoupon = async (code, totalAmount) => {
  try {
    const response = await api.post("/coupons/apply", { code, totalAmount });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

// Booking APIs
export const createBooking = async (bookingData) => {
  try {
    const response = await api.post("/bookings", bookingData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const getMyBookings = async () => {
  try {
    const response = await api.get("/bookings/my-bookings");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const getBooking = async (id) => {
  try {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const cancelBooking = async (id) => {
  try {
    const response = await api.put(`/bookings/${id}/cancel`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

// Payment APIs
export const createStripePayment = async (amount) => {
  try {
    const response = await api.post("/payments/stripe/create-intent", { amount });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const confirmStripePayment = async (paymentIntentId) => {
  try {
    const response = await api.post("/payments/stripe/confirm", { paymentIntentId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const createRazorpayOrder = async (amount) => {
  try {
    const response = await api.post("/payments/razorpay/create-order", { amount });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};

export const verifyRazorpayPayment = async (paymentData) => {
  try {
    const response = await api.post("/payments/razorpay/verify", paymentData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "An error occurred" };
  }
};