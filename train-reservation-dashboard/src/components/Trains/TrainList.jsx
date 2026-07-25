// TrainList.jsx - Simplified version without infinite loop
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './TrainList.module.css';

const TrainList = () => {
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const { get, delete: deleteApi } = useApi();

  // Fetch trains - only run once when component mounts
  useEffect(() => {
    const fetchTrains = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📡 Fetching trains from /api/trains...');
        const response = await get('/api/trains');
        
        console.log('📦 Raw response:', response);
        
        if (response && response.data && Array.isArray(response.data)) {
          console.log(`✅ Loaded ${response.data.length} trains`);
          setTrains(response.data);
        } else if (response && Array.isArray(response)) {
          // Handle case where response is directly an array
          console.log(`✅ Loaded ${response.length} trains (direct array)`);
          setTrains(response);
        } else {
          console.error('❌ Unexpected response format:', response);
          setTrains([]);
          setError('Invalid data format received from server');
        }
      } catch (error) {
        console.error('❌ Failed to fetch trains:', error);
        
        // More specific error handling
        if (error.code === 'ERR_NETWORK') {
          setError('Cannot connect to server. Please ensure the server is running on port 5002.');
        } else if (error.code === 'ERR_INSUFFICIENT_RESOURCES') {
          setError('Server is overloaded. Please wait a moment and try again.');
        } else {
          setError(`Failed to load trains: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrains();
  }, []); // Empty dependency array - only run once on mount

  const handleDelete = async (id, trainNumber) => {
    const confirmMessage = 'Are you sure you want to delete this train? This will also remove all associated availability records and schedules.';
    
    if (window.confirm(confirmMessage)) {
      try {
        setDeleteLoading(id);
        const response = await deleteApi(`/api/admin/trains/${id}`);
        
        if (response && response.success && response.message) {
          alert(response.message);
        }
        
        // Update state by removing the deleted train
        setTrains(prevTrains => prevTrains.filter(train => train._id !== id));
      } catch (error) {
        console.error('Failed to delete train:', error);
        setError('Failed to delete train. Please try again.');
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handleRetry = () => {
    window.location.reload(); // Simple retry by reloading the page
  };

  const getTypeColor = (type) => {
    const colors = {
      'Express': '#3b82f6',
      'Superfast': '#ef4444', 
      'Local': '#10b981',
      'Shatabdi': '#f59e0b',
      'Rajdhani': '#8b5cf6'
    };
    return colors[type] || '#6b7280';
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div>📡 Loading trains...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <h3>❌ Error Loading Trains</h3>
        <p>{error}</p>
        <button onClick={handleRetry} className={styles.retryButton}>
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.trainList}>
      <div className={styles.header}>
        <h2>Train Management</h2>
        <div className={styles.headerActions}>
          <Link to="/dashboard/trains/add" className={styles.addButton}>
            Add New Train
          </Link>
          <Link to="/dashboard/train-availability" className={styles.availabilityButton}>
            Manage Schedules
          </Link>
        </div>
      </div>
      
      <div className={styles.infoCard}>
        <h4>📋 Train Management System</h4>
        <p>This section manages basic train information (Train Number, Name, Type, Capacity, etc.). 
           To create schedules with algorithm optimization, use the <strong>Manage Schedules</strong> section.</p>
      </div>
      
      {trains.length === 0 ? (
        <div className={styles.noTrains}>
          <h3>No trains found</h3>
          <p>Get started by adding your first train.</p>
          <Link to="/dashboard/trains/add" className={styles.addButton}>Add New Train</Link>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Train Details</th>
                <th>Type & Capacity</th>
                <th>Facilities</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trains.map((train) => (
                <tr key={train._id}>
                  <td>
                    <div className={styles.trainDetails}>
                      <strong className={styles.trainNumber}>{train.trainNumber}</strong>
                      <div className={styles.trainName}>{train.trainName}</div>
                      <small className={styles.createdDate}>
                        Created: {new Date(train.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.typeCapacity}>
                      <span 
                        className={styles.typeTag}
                        style={{ backgroundColor: getTypeColor(train.trainType) }}
                      >
                        {train.trainType}
                      </span>
                      <div className={styles.capacity}>
                        👥 {train.totalCapacity} passengers
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.facilitiesList}>
                      {train.facilities && train.facilities.length > 0 ? (
                        <>
                          {train.facilities.slice(0, 3).map((facility, index) => (
                            <span key={index} className={styles.facilityTag}>
                              {facility}
                            </span>
                          ))}
                          {train.facilities.length > 3 && (
                            <span className={styles.moreFacilities}>
                              +{train.facilities.length - 3} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span className={styles.noFacilities}>No facilities</span>
                      )}
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.statusContainer}>
                      <span className={`${styles.statusTag} ${train.isActive ? styles.active : styles.inactive}`}>
                        {train.isActive ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </div>
                  </td>
                  
                  <td>
                    <div className={styles.actionButtons}>
                      <Link 
                        to={`/dashboard/trains/edit/${train._id}`} 
                        className={styles.editButton}
                        state={{ train }}
                        title="Edit basic train information"
                      >
                        ✏️ Edit
                      </Link>
                      
                      <Link 
                        to={`/dashboard/train-availability/add`}
                        state={{ 
                          trainNumber: train.trainNumber, 
                          trainName: train.trainName 
                        }}
                        className={styles.scheduleButton}
                        title="Create schedule with algorithms"
                      >
                        📅 Schedule
                      </Link>
                      
                      <button 
                        onClick={() => handleDelete(train._id, train.trainNumber)} 
                        className={styles.deleteButton}
                        disabled={deleteLoading === train._id}
                        title="Delete train and all schedules"
                      >
                        {deleteLoading === train._id ? '⏳' : '🗑️'} Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {trains.length > 0 && (
        <div className={styles.summary}>
          <p>
            <strong>Total Trains:</strong> {trains.length} | 
            <strong> Active:</strong> {trains.filter(t => t.isActive).length} | 
            <strong> Inactive:</strong> {trains.filter(t => !t.isActive).length}
          </p>
        </div>
      )}
    </div>
  );
};

export default TrainList;