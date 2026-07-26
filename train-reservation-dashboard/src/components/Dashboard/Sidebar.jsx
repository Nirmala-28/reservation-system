import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className={styles.mobileMenuButton}
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <span className={styles.hamburger}></span>
        <span className={styles.hamburger}></span>
        <span className={styles.hamburger}></span>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className={styles.mobileOverlay} 
          onClick={closeMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobileMenuOpen ? styles.mobileOpen : ''}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            {!isCollapsed ? 'Admin Panel' : 'TR'}
          </div>
          <button 
            className={styles.collapseButton}
            onClick={toggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              {isCollapsed ? (
                <path d="M9 18l6-6-6-6" />
              ) : (
                <path d="M15 18l-6-6 6-6" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <NavLink
            to="/dashboard/trains"
            className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
            onClick={closeMobileMenu}
            title="Trains"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="4" width="16" height="12" rx="2"/>
              <path d="M8 8v4"/>
              <path d="M16 8v4"/>
              <path d="M8 20v-2"/>
              <path d="M16 18v2"/>
            </svg>
            {!isCollapsed && <span>Trains</span>}
          </NavLink>

          {/* NEW: Train Scheduling Section */}
          <NavLink
            to="/dashboard/train-availability"
            className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
            onClick={closeMobileMenu}
            title="Train Scheduling"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <circle cx="8" cy="14" r="1"/>
              <circle cx="12" cy="14" r="1"/>
              <circle cx="16" cy="14" r="1"/>
              <circle cx="8" cy="18" r="1"/>
              <circle cx="12" cy="18" r="1"/>
            </svg>
            {!isCollapsed && <span>Scheduling</span>}
          </NavLink>

          <NavLink
            to="/dashboard/meals"
            className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
            onClick={closeMobileMenu}
            title="Meals"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20m8-18H4l4 4h8l4-4z"/>
            </svg>
            {!isCollapsed && <span>Meals</span>}
          </NavLink>

          <NavLink
            to="/dashboard/coupons"
            className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
            onClick={closeMobileMenu}
            title="Coupons"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12c-2 0-3-1-3-3s1-3 3-3 3 1 3 3-1 3-3 3"/>
              <path d="M3 12c2 0 3-1 3-3s-1-3-3-3-3 1-3 3 1 3 3 3"/>
              <path d="M21 9H3"/>
              <path d="M21 15H3"/>
            </svg>
            {!isCollapsed && <span>Coupons</span>}
          </NavLink>

          <NavLink
            to="/dashboard/bookings"
            className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
            onClick={closeMobileMenu}
            title="Bookings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
            {!isCollapsed && <span>Bookings</span>}
          </NavLink>

          <NavLink
            to="/dashboard/stats"
            className={({ isActive }) => 
              isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
            }
            onClick={closeMobileMenu}
            title="Statistics"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M20.5 20.5L15 15M15 15V20.5M15 15H20.5"/>
            </svg>
            {!isCollapsed && <span>Statistics</span>}
          </NavLink>

        </nav>

        {/* Footer Section */}
        <div className={styles.footer}>
          {/* Logout Button */}
          <button 
            onClick={handleLogout} 
            className={styles.logoutButton}
            title="Logout"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!isCollapsed && <span>Logout</span>}
          </button>
          
          {/* Copyright Notice */}
          <div className={`${styles.copyright} ${isCollapsed ? styles.collapsedCopyright : ''}`}>
            {!isCollapsed ? (
              <>
                <p>© {new Date().getFullYear()} All rights reserved</p>
                <p>Made by Nirmala Chapagain</p>
              </>
            ) : (
              <p>© {new Date().getFullYear()}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;