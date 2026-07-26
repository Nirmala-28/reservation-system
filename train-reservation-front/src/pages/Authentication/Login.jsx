import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Login.module.css';
import { useAuth } from '../../context/AuthContext';
import { FaCheckCircle, FaTimes, FaExclamationCircle, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { API_BASE_URL } from '../../config/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Success notification state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success'); // 'success' or 'error'

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setNotificationMessage(location.state.message);
      setNotificationType('success');
      setShowNotification(true);
      
      // Clear the location state after displaying the message
      window.history.replaceState({}, document.title);
      
      // Auto-hide notification after 5 seconds
      const timer = setTimeout(() => {
        setShowNotification(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(API_BASE_URL + '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Store the token and user data
      login(data.data, data.token);
      
      // If remember me is checked, store the email
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Show success notification
      setNotificationMessage(`Welcome back, ${data.data.name}!`);
      setNotificationType('success');
      setShowNotification(true);
      
      // Redirect to home page after brief delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (err) {
      setError(err.message || 'An error occurred during login');
      
      // Show error notification
      setNotificationMessage(err.message || 'An error occurred during login');
      setNotificationType('error');
      setShowNotification(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if there's a remembered email when the component mounts
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className={styles.container}>
      {/* Success/Error Notification */}
      {showNotification && (
        <div className={`${styles.notification} ${notificationType === 'error' ? styles.notificationError : ''}`}>
          <div className={styles.notificationContent}>
            {notificationType === 'success' ? (
              <FaCheckCircle className={styles.notificationIcon} />
            ) : (
              <FaExclamationCircle className={styles.notificationIcon} />
            )}
            <span>{notificationMessage}</span>
          </div>
          <button 
            className={styles.notificationClose}
            onClick={() => setShowNotification(false)}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
      )}
      
      <div className={styles.formWrapper}>
        <div className={styles.formHeader}>
          <button 
            type="button" 
            className={styles.backButton}
            onClick={handleGoBack}
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>
          <h1 className={styles.formTitle}>Welcome Back</h1>
          <p className={styles.formSubtitle}>Sign in to your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.formInput}
              placeholder="Enter your email"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.formInput}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div className={styles.formOptions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>Remember me</span>
            </label>
          </div>
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
          
          <div className={styles.formFooter}>
            <p className={styles.footerText}>
              Don't have an account? <a href="/signup" className={styles.footerLink}>Sign up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
