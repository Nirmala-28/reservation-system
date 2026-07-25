import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import styles from './Layout.module.css';

const DashboardLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSidebarToggle = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar onToggle={handleSidebarToggle} />
      <div className={`${styles.mainContent} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;