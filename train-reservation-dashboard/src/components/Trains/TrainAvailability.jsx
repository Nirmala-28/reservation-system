// TrainAvailability.jsx - Updated for Smart Scheduling System
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './TrainAvailability.module.css';

const TrainAvailability = () => {
  const [availabilities, setAvailabilities] = useState([]);
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const { get, post, delete: deleteApi } = useApi();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [availabilityResponse, trainsResponse] = await Promise.all([
          get('/api/train-availability'),
          get('/api/trains')
        ]);
        
        if (availabilityResponse?.data && Array.isArray(availabilityResponse.data)) {
          setAvailabilities(availabilityResponse.data);
        } else {
          setAvailabilities([]);
        }
        
        if (trainsResponse?.data && Array.isArray(trainsResponse.data)) {
          setTrains(trainsResponse.data);
        } else {
          setTrains([]);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [get]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this train schedule?')) {
      try {
        const response = await deleteApi(`/api/admin/train-availability/${id}`);
        if (response.success) {
          setAvailabilities(availabilities.filter(availability => availability._id !== id));
          alert(response.message);
        }
      } catch (error) {
        console.error('Failed to delete availability:', error);
        setError('Failed to delete schedule. Please try again.');
      }
    }
  };

  const handleProcessQueue = async (availabilityId) => {
    setProcessingId(availabilityId);
    try {
      const response = await post(`/api/train-availability/${availabilityId}/process-queue`);
      
      if (response.success) {
        // Update the availability with new metrics
        setAvailabilities(prev => 
          prev.map(availability => 
            availability._id === availabilityId 
              ? { ...availability, metrics: response.metrics }
              : availability
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

  const handleAddToQueue = async (availabilityId) => {
    try {
      const response = await post(`/api/train-availability/${availabilityId}/booking-queue`, {});
      
      if (response.success) {
        alert(`Test booking added to queue\nQueue position: ${response.queuePosition}`);
        
        // Update queue count in UI
        setAvailabilities(prev => 
          prev.map(availability => 
            availability._id === availabilityId 
              ? { 
                  ...availability, 
                  bookingQueue: [...(availability.bookingQueue || []), response.booking]
                }
              : availability
          )
        );
      }
    } catch (error) {
      console.error('Failed to add to queue:', error);
      setError('Failed to add booking to queue.');
    }
  };

  const getMetricsBadge = (metrics) => {
    if (!metrics) return <span className={styles.noMetrics}>No metrics</span>;
    
    return (
      <div className={styles.metricsContainer}>
        <span className={styles.metric}>
          ⏱️ {Math.round(metrics.averageWaitTime || 0)}min
        </span>
        <span className={styles.metric}>
          📊 {Math.round(metrics.utilizationRate || 0)}%
        </span>
        <span className={styles.metric}>
          ✅ {metrics.throughput || 0}
        </span>
      </div>
    );
  };

  if (loading) {
    return <div className={styles.loading}>📡 Loading train schedules...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.retryButton}>
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.availabilityList}>
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
      
      <div className={styles.statsPanel}>
        <div className={styles.statCard}>
          <h4>Total Schedules</h4>
          <span className={styles.statNumber}>{availabilities.length}</span>
        </div>
        <div className={styles.statCard}>
          <h4>Available Trains</h4>
          <span className={styles.statNumber}>{trains.filter(t => t.isActive).length}</span>
        </div>
        <div className={styles.statCard}>
          <h4>Active Schedules</h4>
          <span className={styles.statNumber}>
            {availabilities.filter(a => a.isActive !== false).length}
          </span>
        </div>
        <div className={styles.statCard}>
          <h4>Total Queue Items</h4>
          <span className={styles.statNumber}>
            {availabilities.reduce((total, a) => total + (a.bookingQueue?.length || 0), 0)}
          </span>
        </div>
      </div>
      
      {availabilities.length === 0 ? (
        <div className={styles.noAvailabilities}>
          <h3>No schedules found</h3>
          <p>Create your first train schedule to start using the smart scheduling system.</p>
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
                <th>System Config</th>
                <th>Performance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {availabilities.map((availability) => (
                <tr key={availability._id}>
                  <td>
                    <div className={styles.trainDetails}>
                      <strong>{availability.trainNumber}</strong>
                      <br />
                      <span className={styles.trainName}>{availability.trainName}</span>
                      <br />
                      <span className={styles.rating}>⭐ {availability.rating || 0}</span>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.routeSchedule}>
                      <div className={styles.route}>
                        <strong>📍 {availability.departureStation}</strong>
                        <div className={styles.arrow}>↓</div>
                        <strong>🎯 {availability.arrivalStation}</strong>
                      </div>
                      <div className={styles.schedule}>
                        <div>{availability.departureDate} {availability.departureTime}</div>
                        <div className={styles.duration}>⏱️ {availability.duration}</div>
                        <div className={styles.runDays}>
                          📅 {availability.runDays === 'Everyday' && availability.departureDate && availability.arrivalDate
                            ? `Specific: ${new Date(availability.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : availability.runDays}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.systemInfo}>
                      <span className={styles.systemBadge}>
                        🎯 Smart Scheduling
                      </span>
                      <div className={styles.systemDetails}>
                        <div className={styles.interval}>
                          ⏰ {availability.timeQuantum || 30}min intervals
                        </div>
                        <div className={styles.slots}>
                          🎰 {availability.scheduleSlots?.length || 0} slots
                        </div>
                        <div className={styles.currentSlot}>
                          📍 Current: #{availability.currentSlotIndex || 0}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.performance}>
                      {getMetricsBadge(availability.metrics)}
                      <div className={styles.queueInfo}>
                        📋 {availability.bookingQueue?.length || 0} in queue
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => handleProcessQueue(availability._id)}
                        className={styles.processButton}
                        disabled={processingId === availability._id}
                        title="Process queue with smart scheduling"
                      >
                        {processingId === availability._id ? '⏳' : '🔄'} Process
                      </button>
                      
                      <button
                        onClick={() => handleAddToQueue(availability._id)}
                        className={styles.queueButton}
                        title="Add test booking to queue"
                      >
                        ➕ Add Test
                      </button>
                      
                      <Link
                        to={`/dashboard/train-availability/edit/${availability._id}`}
                        className={styles.editButton}
                        state={{ availability }}
                      >
                        ✏️ Edit
                      </Link>
                      
                      <Link
                        to={`/dashboard/train-availability/metrics/${availability._id}`}
                        className={styles.metricsButton}
                        state={{ schedule: availability }}
                        title="View performance metrics"
                      >
                        📊 Metrics
                      </Link>
                      
                      <button
                        onClick={() => handleDelete(availability._id)}
                        className={styles.deleteButton}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {availabilities.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryStats}>
            <span><strong>Total Schedules:</strong> {availabilities.length}</span>
            <span><strong>Active Systems:</strong> {availabilities.filter(a => a.isActive !== false).length}</span>
            <span><strong>Avg Processing Interval:</strong> {Math.round(availabilities.reduce((sum, a) => sum + (a.timeQuantum || 30), 0) / availabilities.length)}min</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainAvailability;