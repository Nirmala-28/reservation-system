// ScheduleList.jsx - Complete Smart Scheduling Version
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './ScheduleList.module.css';

const ScheduleList = () => {
  const [schedules, setSchedules] = useState([]);
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const { get, post, delete: deleteApi } = useApi();

  // Fetch data - only run once when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📡 Fetching schedules and trains...');
        const [scheduleResponse, trainsResponse] = await Promise.all([
          get('/api/train-availability'),
          get('/api/trains')
        ]);
        
        console.log('📦 Schedule response:', scheduleResponse);
        console.log('📦 Trains response:', trainsResponse);
        
        if (scheduleResponse?.data && Array.isArray(scheduleResponse.data)) {
          console.log(`✅ Loaded ${scheduleResponse.data.length} schedules`);
          setSchedules(scheduleResponse.data);
        } else {
          console.log('⚠️ No schedules found or invalid format');
          setSchedules([]);
        }
        
        if (trainsResponse?.data && Array.isArray(trainsResponse.data)) {
          console.log(`✅ Loaded ${trainsResponse.data.length} trains`);
          setTrains(trainsResponse.data);
        } else {
          console.log('⚠️ No trains found or invalid format');
          setTrains([]);
        }
      } catch (error) {
        console.error('❌ Failed to fetch data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array - only run once on mount

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this train schedule?')) {
      try {
        const response = await deleteApi(`/api/admin/train-availability/${id}`);
        if (response && response.success) {
          setSchedules(prevSchedules => prevSchedules.filter(schedule => schedule._id !== id));
          alert(response.message || 'Schedule deleted successfully');
        }
      } catch (error) {
        console.error('Failed to delete schedule:', error);
        setError('Failed to delete schedule. Please try again.');
      }
    }
  };

  const handleProcessQueue = async (scheduleId) => {
    setProcessingId(scheduleId);
    try {
      const response = await post(`/api/train-availability/${scheduleId}/process-queue`);
      
      if (response && response.success) {
        // Update the schedule with new metrics
        setSchedules(prev => 
          prev.map(schedule => 
            schedule._id === scheduleId 
              ? { ...schedule, metrics: response.metrics }
              : schedule
          )
        );
        
        alert(`Smart scheduling processed successfully!\nAllocation: ${response.allocationResult?.success ? 'Success' : 'No slots available'}`);
      }
    } catch (error) {
      console.error('Failed to process queue:', error);
      setError('Failed to process booking queue. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddToQueue = async (scheduleId) => {
    try {
      const response = await post(`/api/train-availability/${scheduleId}/booking-queue`, {});
      
      if (response && response.success) {
        alert(`Test booking added to queue\nQueue position: ${response.queuePosition}`);
        
        // Update queue count in UI
        setSchedules(prev => 
          prev.map(schedule => 
            schedule._id === scheduleId 
              ? { 
                  ...schedule, 
                  bookingQueue: [...(schedule.bookingQueue || []), response.booking]
                }
              : schedule
          )
        );
      }
    } catch (error) {
      console.error('Failed to add to queue:', error);
      setError('Failed to add booking to queue.');
    }
  };

  const handleRetry = () => {
    window.location.reload(); // Simple retry by reloading the page
  };

  const getMetricsBadge = (metrics) => {
    if (!metrics) return <span className={styles.noMetrics}>No metrics</span>;
    
    return (
      <div className={styles.metricsContainer}>
        <span className={styles.metric} title="Average Wait Time">
          ⏱️ {Math.round(metrics.averageWaitTime || 0)}min
        </span>
        <span className={styles.metric} title="Utilization Rate">
          📊 {Math.round(metrics.utilizationRate || 0)}%
        </span>
        <span className={styles.metric} title="Throughput">
          ✅ {metrics.throughput || 0}
        </span>
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return timeString || 'Not set';
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div>📡 Loading train schedules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h3>❌ Error Loading Schedules</h3>
        <p>{error}</p>
        <button onClick={handleRetry} className={styles.retryButton}>
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.scheduleList}>
      <div className={styles.header}>
        <h2>Train Schedules Management</h2>
        <div className={styles.headerActions}>
          <Link to="/dashboard/train-availability/add" className={styles.addButton}>
            Create New Schedule
          </Link>
          <Link to="/dashboard/trains" className={styles.trainsButton}>
            Manage Trains
          </Link>
        </div>
      </div>
      

      
      {schedules.length === 0 ? (
        <div className={styles.noSchedules}>
          <h3>No train schedules found</h3>
          <p>Create your first train schedule to get started.</p>
          <div className={styles.emptyActions}>
            <Link to="/dashboard/train-availability/add" className={styles.addButton}>
              Create New Schedule
            </Link>
            <Link to="/dashboard/trains" className={styles.trainsButton}>
              Manage Trains First
            </Link>
          </div>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Train Details</th>
                <th>Route & Schedule</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) => (
                <tr key={schedule._id}>
                  <td>
                    <div className={styles.trainDetails}>
                      <strong className={styles.trainNumber}>{schedule.trainNumber}</strong>
                      <div className={styles.trainName}>{schedule.trainName}</div>
                      <div className={styles.rating}>
                        ⭐ {schedule.rating || 0} | 📅 {schedule.runDays}
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.routeSchedule}>
                      <div className={styles.route}>
                        <div className={styles.station}>
                          <strong>📍 {schedule.departureStation}</strong>
                          <small>{formatDate(schedule.departureDate)} {formatTime(schedule.departureTime)}</small>
                        </div>
                        <div className={styles.routeDivider}>
                          <span className={styles.routeLine}></span>
                          <span className={styles.routeArrow}>&#8595;</span>
                          <span className={styles.routeLine}></span>
                        </div>
                        <div className={styles.station}>
                          <strong>🎯 {schedule.arrivalStation}</strong>
                          <small>{formatDate(schedule.arrivalDate)} {formatTime(schedule.arrivalTime)}</small>
                        </div>
                      </div>
                      <div className={styles.duration}>
                        ⏱️ Duration: {schedule.duration || 'Not calculated'}
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.actionButtons}>
                      <Link
                        to={`/dashboard/train-availability/edit/${schedule._id}`}
                        className={styles.editButton}
                        state={{ availability: schedule }}
                        title="Edit schedule"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Edit
                      </Link>
                      
                      <button
                        onClick={() => handleDelete(schedule._id)}
                        className={styles.deleteButton}
                        title="Delete schedule"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {schedules.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryStats}>
            <span><strong>Total Schedules:</strong> {schedules.length}</span>
            <span><strong>Active Schedules:</strong> {schedules.filter(s => s.isActive !== false).length}</span>
            <span><strong>Average Processing Interval:</strong> {Math.round(schedules.reduce((sum, s) => sum + (s.timeQuantum || 30), 0) / schedules.length)}min</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleList;