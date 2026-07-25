import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import styles from "../Home/Booking.module.css";
import { 
    FaTrain, 
    FaUser,
    FaUserPlus,
    FaUserCircle,
    FaSignOutAlt,
    FaChevronDown,
    FaHistory
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <div 
            className={styles.logo}
            onClick={() => navigate('/')} 
            style={{ cursor: 'pointer' }} 
          >
            <FaTrain className={styles.logoIcon} />
            <span className={styles.logoText}>YatraRails</span>
          </div>
          
          {isAuthenticated ? (
            <div className={styles.userSection} ref={dropdownRef}>
              <button 
                className={styles.userButton}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <FaUserCircle className={styles.userIcon} />
                <span className={styles.userName}>{user.name}</span>
                <FaChevronDown className={styles.dropdownIcon} />
              </button>
              
              {dropdownOpen && (
                <div className={styles.userDropdown}>
                  <button 
                    className={styles.dropdownItem}
                    onClick={() => {
                      navigate('/profile');
                      setDropdownOpen(false);
                    }}
                  >
                    <FaUser className={styles.dropdownIcon} />
                    <span>View Profile</span>
                  </button>
                  <button 
                    className={styles.dropdownItem}
                    onClick={() => {
                      navigate('/booking-history');
                      setDropdownOpen(false);
                    }}
                  >
                    <FaHistory className={styles.dropdownIcon} />
                    <span>Booking History</span>
                  </button>
                  <button 
                    className={styles.dropdownItem}
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className={styles.dropdownIcon} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authButtons}>
              <button 
                className={styles.loginButton}
                onClick={() => navigate('/login')}
              >
                <FaUser className={styles.authIcon} />
                <span className={styles.authText}>Login</span>
              </button>
              <button 
                className={styles.signupButton}
                onClick={() => navigate('/signup')}
              >
                <FaUserPlus className={styles.authIcon} />
                <span className={styles.authText}>Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}

export default Navbar;