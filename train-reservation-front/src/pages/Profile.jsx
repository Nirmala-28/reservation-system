import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../components/Home/Profile.module.css';
import { 
  FaUser, FaEnvelope, FaPhone, FaCalendarAlt, FaVenusMars, FaUserTag, 
  FaClock, FaKey, FaEye, FaEyeSlash, FaEdit, FaCamera, FaShieldAlt,
  FaChartLine, FaCheckCircle, FaStar, FaGem, FaCrown, FaArrowLeft
} from 'react-icons/fa';

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Animation states
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`http://localhost:5002/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const result = await response.json();
        
        if (result.success) {
          setProfileData(result.data);
        } else {
          throw new Error(result.message || 'Failed to get profile data');
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
        setTimeout(() => setIsVisible(true), 100);
      }
    };

    fetchProfileData();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getAccountAge = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months`;
    return `${Math.floor(diffDays / 365)} years`;
  };

  const getUserLevel = (role, accountAge) => {
    if (role === 'admin') return { level: 'VIP', icon: FaCrown, color: '#ffd700' };
    if (accountAge.includes('years')) return { level: 'Pro', icon: FaGem, color: '#9333ea' };
    if (accountAge.includes('months')) return { level: 'Plus', icon: FaStar, color: '#3b82f6' };
    return { level: 'Basic', icon: FaCheckCircle, color: '#10b981' };
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (passwordError) {
      setPasswordError('');
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5002/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPasswordSuccess('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
        
        setTimeout(() => {
          setPasswordSuccess('');
        }, 3000);
      } else {
        setPasswordError(result.message || 'Failed to change password');
      }
    } catch (error) {
      setPasswordError('Network error. Please try again.');
      console.error('Password change error:', error);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancelPasswordChange = () => {
    setShowPasswordForm(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleBackClick = () => {
    // Replace with actual navigation logic (e.g., useNavigate from react-router-dom)
    window.history.back();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>Oops! Something went wrong</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.retryBtn}>
          Try Again
        </button>
      </div>
    );
  }

  if (!profileData) {
    return <div className={styles.error}>Profile data not available</div>;
  }

  const accountAge = getAccountAge(profileData.createdAt);
  const userLevel = getUserLevel(profileData.role, accountAge);
  const LevelIcon = userLevel.icon;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.backgroundPattern}></div>
      
      {/* Back Button */}
      <div className={styles.backButton}>
        <button
          onClick={handleBackClick}
          className={`${styles.backBtn} ${isVisible ? styles.slideInLeft : ''}`}
        >
          <FaArrowLeft className={styles.backIcon} />
          <span>Back</span>
        </button>
      </div>
      
      {/* Header Section */}
      <div className={`${styles.profileHeader} ${isVisible ? styles.slideInDown : ''}`}>
        <div className={styles.profileBanner}>
          <div className={styles.bannerOverlay}></div>
          <div className={styles.profileMainInfo}>
            <div className={styles.avatarContainer}>
              <div className={styles.profileAvatar}>
                <FaUser size={40} />
                <div className={styles.statusIndicator}></div>
              </div>
            </div>
            
            <div className={styles.userInfo}>
              <h1 className={styles.userName}>{profileData.name}</h1>
              <div className={styles.userMeta}>
                <span className={styles.userRole}>{profileData.role}</span>
              </div>
              <p className={styles.userEmail}>{profileData.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`${styles.tabNavigation} ${isVisible ? styles.slideInLeft : ''}`}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FaUser /> Overview
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'security' ? styles.active : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <FaShieldAlt /> Security
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'activity' ? styles.active : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <FaChartLine /> Activity
        </button>
      </div>

      {/* Content Area */}
      <div className={`${styles.profileContent} ${isVisible ? styles.slideInUp : ''}`}>
        {activeTab === 'overview' && (
          <div className={styles.overviewTab}>
            <div className={styles.statsCards}>
              <div className={`${styles.statCard} ${styles.gradientBlue}`}>
                <div className={styles.statIcon}>
                  <FaCalendarAlt />
                </div>
                <div className={styles.statContent}>
                  <h3>Account Age</h3>
                  <p>{accountAge}</p>
                </div>
              </div>
              
              <div className={`${styles.statCard} ${styles.gradientGreen}`}>
                <div className={styles.statIcon}>
                  <FaCheckCircle />
                </div>
                <div className={styles.statContent}>
                  <h3>Status</h3>
                  <p>Active</p>
                </div>
              </div>
              
              {/* <div className={`${styles.statCard} ${styles.gradientPurple}`}>
                <div className={styles.statIcon}>
                  <LevelIcon />
                </div>
                <div className={styles.statContent}>
                  <h3>Level</h3>
                  <p>{userLevel.level}</p>
                </div>
              </div> */}
            </div>

            <div className={styles.infoCards}>
              <div 
                className={`${styles.infoCard} ${hoveredCard === 'personal' ? styles.hovered : ''}`}
                onMouseEnter={() => setHoveredCard('personal')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className={styles.cardHeader}>
                  <h3>Personal Information</h3>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <FaUser className={styles.infoIcon} />
                      <div>
                        <p className={styles.infoLabel}>Full Name</p>
                        <p className={styles.infoValue}>{profileData.name}</p>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <FaEnvelope className={styles.infoIcon} />
                      <div>
                        <p className={styles.infoLabel}>Email</p>
                        <p className={styles.infoValue}>{profileData.email}</p>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <FaPhone className={styles.infoIcon} />
                      <div>
                        <p className={styles.infoLabel}>Phone</p>
                        <p className={styles.infoValue}>{profileData.phone}</p>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <FaCalendarAlt className={styles.infoIcon} />
                      <div>
                        <p className={styles.infoLabel}>Age</p>
                        <p className={styles.infoValue}>{profileData.age} years</p>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <FaVenusMars className={styles.infoIcon} />
                      <div>
                        <p className={styles.infoLabel}>Gender</p>
                        <p className={styles.infoValue}>{profileData.gender}</p>
                      </div>
                    </div>
                    
                    <div className={styles.infoItem}>
                      <FaClock className={styles.infoIcon} />
                      <div>
                        <p className={styles.infoLabel}>Member Since</p>
                        <p className={styles.infoValue}>{formatDate(profileData.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className={styles.securityTab}>
            <div className={styles.securityCard}>
              <div className={styles.cardHeader}>
                <h3>Password & Security</h3>
                <FaShieldAlt className={styles.securityIcon} />
              </div>
              
              <div className={styles.securityItem}>
                <div className={styles.securityInfo}>
                  <FaKey className={styles.securityItemIcon} />
                  <div>
                    <h4>Password</h4>
                    <p>Last changed: Recently</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className={styles.securityBtn}
                >
                  {showPasswordForm ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showPasswordForm && (
                <div className={styles.passwordFormContainer}>
                  <div className={styles.passwordForm}>
                    <div className={styles.passwordField}>
                      <label htmlFor="currentPassword">Current Password</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          id="currentPassword"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter current password"
                          required
                        />
                        <button
                          type="button"
                          className={styles.togglePasswordBtn}
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <div className={styles.passwordField}>
                      <label htmlFor="newPassword">New Password</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          id="newPassword"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Enter new password"
                          required
                        />
                        <button
                          type="button"
                          className={styles.togglePasswordBtn}
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    <div className={styles.passwordField}>
                      <label htmlFor="confirmPassword">Confirm New Password</label>
                      <div className={styles.passwordInputWrapper}>
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          placeholder="Confirm new password"
                          required
                        />
                        <button
                          type="button"
                          className={styles.togglePasswordBtn}
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      </div>
                    </div>

                    {passwordError && (
                      <div className={styles.passwordError}>
                        {passwordError}
                      </div>
                    )}

                    <div className={styles.passwordFormActions}>
                      <button
                        onClick={handlePasswordSubmit}
                        className={styles.submitBtn}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? 'Changing...' : 'Change Password'}
                      </button>
                      <button
                        onClick={handleCancelPasswordChange}
                        className={styles.cancelBtn}
                        disabled={passwordLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {passwordSuccess && (
                <div className={styles.passwordSuccess}>
                  {passwordSuccess}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className={styles.activityTab}>
            <div className={styles.activityCard}>
              <div className={styles.cardHeader}>
                <h3>Recent Activity</h3>
                <FaChartLine className={styles.activityIcon} />
              </div>
              <div className={styles.activityList}>
                <div className={styles.activityItem}>
                  <div className={styles.activityDot}></div>
                  <div className={styles.activityContent}>
                    <h4>Account Created</h4>
                    <p>{formatDate(profileData.createdAt)}</p>
                  </div>
                </div>
                <div className={styles.activityItem}>
                  <div className={styles.activityDot}></div>
                  <div className={styles.activityContent}>
                    <h4>Profile Updated</h4>
                    <p>Information synced successfully</p>
                  </div>
                </div>
                <div className={styles.activityItem}>
                  <div className={styles.activityDot}></div>
                  <div className={styles.activityContent}>
                    <h4>Security Check</h4>
                    <p>All systems secure</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;