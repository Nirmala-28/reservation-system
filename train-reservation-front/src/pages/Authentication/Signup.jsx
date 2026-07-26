import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Signup.module.css';
import { FaCheckCircle, FaTimes, FaExclamationCircle, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { API_BASE_URL } from '../../config/api';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    age: '',
    gender: 'Male',
    terms: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Enhanced email validation function
  const validateEmailFormat = (email) => {
    if (!email) {
      return 'Email is required';
    }

    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }

    // More comprehensive email validation
    const advancedEmailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!advancedEmailRegex.test(email)) {
      return 'Please enter a valid email address format';
    }

    // Check for common email issues
    if (email.length > 254) {
      return 'Email address is too long';
    }

    const localPart = email.split('@')[0];
    if (localPart.length > 64) {
      return 'Email local part is too long';
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      return 'Email cannot contain consecutive dots';
    }

    // Check for leading/trailing dots
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return 'Email cannot start or end with a dot';
    }

    // Check for valid domain
    const domain = email.split('@')[1];
    if (!domain || domain.length < 2) {
      return 'Please enter a valid email domain';
    }

    // Check for valid TLD
    const tld = domain.split('.').pop();
    if (!tld || tld.length < 2) {
      return 'Please enter a valid email domain extension';
    }

    return null; // No error
  };

  const validateForm = () => {
    const newErrors = {};
    const { firstName, lastName, email, password, confirmPassword, phone, age, terms } = formData;
    
    // First Name validation
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(firstName.trim())) {
      newErrors.firstName = 'First name should contain only letters and spaces';
    }
    
    // Last Name validation
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(lastName.trim())) {
      newErrors.lastName = 'Last name should contain only letters and spaces';
    }
    
    // Email validation
    const emailError = validateEmailFormat(email.trim());
    if (emailError) {
      newErrors.email = emailError;
    }
    
    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase, one lowercase, one number and one special character';
    }
    
    // Confirm Password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Phone validation
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    } else if (phone.startsWith('0')) {
      newErrors.phone = 'Phone number should not start with 0';
    }
    
    // Age validation
    if (!age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(age) || age < 1 || age > 120) {
      newErrors.age = 'Please enter a valid age (1-120)';
    } else if (age < 13) {
      newErrors.age = 'You must be at least 13 years old to register';
    }
    
    // Terms validation
    if (!terms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;

    // Process specific fields
    if (name === 'email') {
      processedValue = value.toLowerCase().trim();
    } else if (name === 'firstName' || name === 'lastName') {
      // Capitalize first letter of each word
      processedValue = value.replace(/\b\w/g, l => l.toUpperCase());
    } else if (name === 'phone') {
      // Only allow digits
      processedValue = value.replace(/\D/g, '');
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : processedValue
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  // Real-time email validation on blur
  const handleEmailBlur = () => {
    if (formData.email) {
      const emailError = validateEmailFormat(formData.email);
      if (emailError) {
        setErrors({
          ...errors,
          email: emailError
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setNotificationMessage('Please fix the errors in the form');
      setNotificationType('error');
      setShowNotification(true);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(API_BASE_URL + '/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phone: formData.phone,
          age: parseInt(formData.age, 10),
          gender: formData.gender
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific backend errors
        if (data.message && data.message.includes('already exists')) {
          if (data.message.toLowerCase().includes('email')) {
            setErrors({
              ...errors,
              email: 'This email is already registered. Please use a different email or try logging in.'
            });
          } else if (data.message.toLowerCase().includes('phone')) {
            setErrors({
              ...errors,
              phone: 'This phone number is already registered. Please use a different phone number.'
            });
          }
        }
        throw new Error(data.message || 'Registration failed');
      }
      
      setNotificationMessage('Registration successful! Redirecting to login...');
      setNotificationType('success');
      setShowNotification(true);
      
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please login with your credentials.',
            email: formData.email.trim().toLowerCase()
          }
        });
      }, 2000);
      
    } catch (err) {
      if (!err.message.includes('already')) {
        setNotificationMessage(err.message || 'An error occurred during registration');
        setNotificationType('error');
        setShowNotification(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className={styles.container}>
      {showNotification && (
        <div className={`${styles.notification} ${notificationType === 'error' ? styles.error : styles.success}`}>
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
          <h1 className={styles.formTitle}>Create Account</h1>
          <p className={styles.formSubtitle}>Join us today</p>
        </div>
        
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName" className={styles.formLabel}>First Name*</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className={`${styles.formInput} ${errors.firstName ? styles.errorInput : ''}`}
                placeholder="Nirmala"
                maxLength="50"
              />
              {errors.firstName && <span className={styles.errorText}>{errors.firstName}</span>}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="lastName" className={styles.formLabel}>Last Name*</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className={`${styles.formInput} ${errors.lastName ? styles.errorInput : ''}`}
                placeholder="Chapagain"
                maxLength="50"
              />
              {errors.lastName && <span className={styles.errorText}>{errors.lastName}</span>}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>Email*</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleEmailBlur}
              className={`${styles.formInput} ${errors.email ? styles.errorInput : ''}`}
              placeholder="nirmala.chapagain@example.com"
              maxLength="254"
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
            <div className={styles.inputHelp}>
              <small>We'll never share your email with anyone else</small>
            </div>
          </div>
          
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="phone" className={styles.formLabel}>Phone Number*</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={`${styles.formInput} ${errors.phone ? styles.errorInput : ''}`}
                placeholder="9876543210"
                maxLength="10"
              />
              {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="age" className={styles.formLabel}>Age*</label>
              <input
                id="age"
                name="age"
                type="number"
                min="1"
                max="120"
                value={formData.age}
                onChange={handleChange}
                className={`${styles.formInput} ${errors.age ? styles.errorInput : ''}`}
                placeholder="25"
              />
              {errors.age && <span className={styles.errorText}>{errors.age}</span>}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="gender" className={styles.formLabel}>Gender*</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={styles.formInput}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>Password*</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className={`${styles.formInput} ${errors.password ? styles.errorInput : ''}`}
                placeholder="Create a strong password"
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
            {errors.password && <span className={styles.errorText}>{errors.password}</span>}
            <div className={styles.passwordHelp}>
              <small>Must contain: uppercase, lowercase, number, and special character (@$!%*?&)</small>
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>Confirm Password*</label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`${styles.formInput} ${errors.confirmPassword ? styles.errorInput : ''}`}
                placeholder="Confirm your password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
          </div>
          
          <div className={styles.formOptions}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="terms"
                checked={formData.terms}
                onChange={handleChange}
                className={styles.checkboxInput}
              />
              <span className={styles.checkboxText}>
                I agree to the <a href="#" className={styles.termsLink}>Terms and Conditions</a> and <a href="#" className={styles.termsLink}>Privacy Policy</a>
              </span>
            </label>
            {errors.terms && <span className={styles.errorText}>{errors.terms}</span>}
          </div>
          
          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
          
          <div className={styles.formFooter}>
            <p className={styles.footerText}>
              Already have an account? <a href="/login" className={styles.footerLink}>Sign in</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
