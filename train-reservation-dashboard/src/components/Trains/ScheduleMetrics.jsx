// ScheduleMetrics.jsx - Detailed Performance Analytics
import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './ScheduleMetrics.module.css';

const ScheduleMetrics = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { get } = useApi();
  
  const [metrics, setMetrics] = useState(null);
  const [schedule, setSchedule] = useState(location.state?.schedule || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await get(`/api/train-availability/${id}/metrics`);
        
        if (response.success) {
          setMetrics(response.metrics);
        } else {
          setError('Failed to load metrics');
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
        setError('Failed to load performance metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [id, get]);

  const getPerformanceRating = (utilizationRate) => {
    if (utilizationRate >= 80) return { rating: 'Excellent', color: '#10b981', icon: '🚀' };
    if (utilizationRate >= 60) return { rating: 'Good', color: '#f59e0b', icon: '👍' };
    if (utilizationRate >= 40) return { rating: 'Fair', color: '#f97316', icon: '⚠️' };
    return { rating: 'Poor', color: '#ef4444', icon: '⛔' };
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.round(minutes % 60);
    return `${hours}h ${remainingMins}min`;
  };

  if (loading) {
    return (
      <div className={styles.metricsPage}>
        <div className={styles.loading}>
          📊 Loading performance metrics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.metricsPage}>
        <div className={styles.error}>
          <h3>❌ Error Loading Metrics</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard/train-availability')} className={styles.backButton}>
            ← Back to Schedules
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={styles.metricsPage}>
        <div className={styles.noMetrics}>
          <h3>📊 No Metrics Available</h3>
          <p>Performance metrics will be available after processing bookings.</p>
          <button onClick={() => navigate('/dashboard/train-availability')} className={styles.backButton}>
            ← Back to Schedules
          </button>
        </div>
      </div>
    );
  }

  const performance = getPerformanceRating(metrics.utilizationRate || 0);

  return (
    <div className={styles.metricsPage}>
      <div className={styles.header}>
        <button onClick={() => navigate('/dashboard/train-availability')} className={styles.backButton}>
          ← Back to Schedules
        </button>
        <h2>📊 Performance Analytics</h2>
      </div>

      {schedule && (
        <div className={styles.scheduleInfo}>
          <h3>🚂 {schedule.trainNumber} - {schedule.trainName}</h3>
          <div className={styles.routeInfo}>
            <span>📍 {schedule.departureStation} → 🎯 {schedule.arrivalStation}</span>
            <span className={styles.statusBadge}>
              Smart Scheduling Active
            </span>
          </div>
        </div>
      )}

      <div className={styles.metricsGrid}>
        {/* Overall Performance */}
        <div className={styles.performanceCard}>
          <h4>🎯 Overall Performance</h4>
          <div className={styles.performanceRating}>
            <span className={styles.ratingIcon}>{performance.icon}</span>
            <span className={styles.ratingText} style={{ color: performance.color }}>
              {performance.rating}
            </span>
            <span className={styles.ratingValue}>
              {Math.round(metrics.utilizationRate || 0)}% Utilization
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className={styles.metricsCard}>
          <h4>⏱️ Wait Time Analytics</h4>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Average Wait Time</span>
            <span className={styles.metricValue}>
              {formatTime(metrics.averageWaitTime || 0)}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ 
                width: `${Math.min((metrics.averageWaitTime || 0) / 60 * 100, 100)}%`,
                backgroundColor: metrics.averageWaitTime > 30 ? '#ef4444' : '#10b981'
              }}
            />
          </div>
        </div>

        <div className={styles.metricsCard}>
          <h4>📈 Throughput Metrics</h4>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Processed Bookings</span>
            <span className={styles.metricValue}>{metrics.throughput || 0}</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Queue Length</span>
            <span className={styles.metricValue}>{metrics.queueLength || 0}</span>
          </div>
        </div>

        <div className={styles.metricsCard}>
          <h4>🎰 Slot Management</h4>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Total Slots</span>
            <span className={styles.metricValue}>{metrics.totalSlots || 0}</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Available Slots</span>
            <span className={styles.metricValue}>{metrics.availableSlots || 0}</span>
          </div>
          <div className={styles.slotUtilization}>
            <span className={styles.utilizationLabel}>Slot Utilization</span>
            <div className={styles.utilizationBar}>
              <div 
                className={styles.utilizationFill}
                style={{ 
                  width: `${metrics.slotUtilization || 0}%`,
                  backgroundColor: '#3b82f6'
                }}
              />
            </div>
            <span className={styles.utilizationValue}>
              {Math.round(metrics.slotUtilization || 0)}%
            </span>
          </div>
        </div>
      </div>

      {/* System Performance Info */}
      <div className={styles.systemDetails}>
        <h4>🧠 System Performance</h4>
        <div className={styles.systemInfo}>
          <div className={styles.systemType}>
            <strong>Scheduling System:</strong> Intelligent Queue Management
          </div>
          <div className={styles.systemStats}>
            <div>Optimized processing | Fair allocation across all requests</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className={styles.recommendations}>
        <h4>💡 Performance Recommendations</h4>
        <div className={styles.recommendationsList}>
          {metrics.utilizationRate < 50 && (
            <div className={styles.recommendation}>
              <span className={styles.recIcon}>⚠️</span>
              <span>Low utilization detected. Consider optimizing slot allocation or adjusting processing intervals.</span>
            </div>
          )}
          {metrics.averageWaitTime > 45 && (
            <div className={styles.recommendation}>
              <span className={styles.recIcon}>🕐</span>
              <span>High wait times detected. Consider prioritizing urgent bookings or increasing processing capacity.</span>
            </div>
          )}
          {metrics.queueLength > 10 && (
            <div className={styles.recommendation}>
              <span className={styles.recIcon}>📋</span>
              <span>Large queue detected. Process queue more frequently or add more time slots.</span>
            </div>
          )}
          {metrics.utilizationRate >= 80 && metrics.averageWaitTime <= 30 && (
            <div className={styles.recommendation}>
              <span className={styles.recIcon}>🎉</span>
              <span>Excellent performance! The current system configuration is working well.</span>
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      <div className={styles.lastUpdated}>
        <small>
          📅 Last updated: {metrics.lastUpdated ? new Date(metrics.lastUpdated).toLocaleString() : 'Never'}
        </small>
      </div>
    </div>
  );
};

export default ScheduleMetrics;