import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './TrainForm.module.css';
 
const TrainForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { get, post, put } = useApi();
  
  // Get train data from navigation state
  const existingTrainData = location.state?.train;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [train, setTrain] = useState(() => {
    if (id && existingTrainData) {
      return {
        trainNumber: existingTrainData.trainNumber || '',
        trainName: existingTrainData.trainName || '',
        trainType: existingTrainData.trainType || 'Express',
        totalCapacity: existingTrainData.totalCapacity || 1000,
        facilities: Array.isArray(existingTrainData.facilities) ? existingTrainData.facilities : [],
        isActive: existingTrainData.isActive !== undefined ? existingTrainData.isActive : true
      };
    }
    
    return {
      trainNumber: '',
      trainName: '',
      trainType: 'Express',
      totalCapacity: 1000,
      facilities: [],
      isActive: true
    };
  });
 
  const trainTypes = [
    'Express',
    'Superfast', 
    'Local',
    'Shatabdi',
    'Rajdhani'
  ];
 
  const commonFacilities = [
    'WiFi', 'AC', 'Pantry', 'Charging Points', 
    'TV Entertainment', 'Reading Light', 'Blanket',
    'Bedding', 'Meal Service', 'Wheelchair Access'
  ];
 
  // Fetch train data if editing and no data passed
  useEffect(() => {
    const fetchTrainData = async () => {
      if (id && !existingTrainData) {
        try {
          setLoading(true);
          const response = await get(`/api/trains/${id}`);
          if (response.success && response.data) {
            setTrain({
              trainNumber: response.data.trainNumber || '',
              trainName: response.data.trainName || '',
              trainType: response.data.trainType || 'Express',
              totalCapacity: response.data.totalCapacity || 1000,
              facilities: Array.isArray(response.data.facilities) ? response.data.facilities : [],
              isActive: response.data.isActive !== undefined ? response.data.isActive : true
            });
          } else {
            setError('Train data not found');
          }
        } catch (error) {
          setError('Failed to fetch train data');
          console.error('Fetch error:', error);
        } finally {
          setLoading(false);
        }
      }
    };
 
    fetchTrainData();
  }, [id, existingTrainData, get]);
 
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setTrain(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setTrain(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setTrain(prev => ({ ...prev, [name]: value }));
    }
  };
 
  const handleFacilityToggle = (facility) => {
    if (train.facilities.includes(facility)) {
      // Remove facility
      setTrain(prev => ({
        ...prev,
        facilities: prev.facilities.filter(f => f !== facility)
      }));
    } else {
      // Add facility
      setTrain(prev => ({
        ...prev,
        facilities: [...prev.facilities, facility]
      }));
    }
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!train.trainNumber || !train.trainName) {
      setError('Train number and name are required.');
      return;
    }
    
    if (train.totalCapacity < 1) {
      setError('Total capacity must be at least 1.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      let response;
      if (id) {
        // Update existing train
        response = await put(`/api/admin/trains/${id}`, train);
      } else {
        // Create new train
        response = await post('/api/admin/trains', train);
      }
      
      if (response.success) {
        setSuccess(response.message || `Train ${id ? 'updated' : 'created'} successfully!`);
        
        // Navigate after a short delay to show success message
        setTimeout(() => {
          navigate('/dashboard/trains');
        }, 1500);
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError(`Failed to ${id ? 'update' : 'create'} train: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };
 
  if (loading && id && !existingTrainData) {
    return <div className={styles.loading}>Loading train data...</div>;
  }
 
  return (
    <div className={styles.trainForm}>
      <h2>{id ? 'Edit Train' : 'Add New Train'}</h2>
      
      <div className={styles.infoCard}>
        <h4>ℹ️ Train Basic Information</h4>
        <p>This form manages basic train details. After creating a train, you can manage its schedules and availability in the <strong>Train Availability</strong> section.</p>
      </div>
      
      {id && existingTrainData && (
        <div className={styles.editingInfo}>
          📝 Editing: {existingTrainData.trainNumber} - {existingTrainData.trainName}
        </div>
      )}
      
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className={styles.success}>
          <p>{success}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Train Number <span className={styles.required}>*</span></label>
            <input
              type="text"
              name="trainNumber"
              value={train.trainNumber}
              onChange={handleChange}
              required
              disabled={!!id} // Disable train number editing
              placeholder="e.g., 12345"
            />
            {id && (
              <small className={styles.helpText}>Train number cannot be changed after creation</small>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label>Train Name <span className={styles.required}>*</span></label>
            <input
              type="text"
              name="trainName"
              value={train.trainName}
              onChange={handleChange}
              required
              placeholder="e.g., Shatabdi Express"
            />
          </div>
          
          <div className={styles.formGroup}>
            <label>Train Type <span className={styles.required}>*</span></label>
            <select
              name="trainType"
              value={train.trainType}
              onChange={handleChange}
              required
            >
              {trainTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
 
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Total Capacity <span className={styles.required}>*</span></label>
            <input
              type="number"
              name="totalCapacity"
              value={train.totalCapacity}
              onChange={handleChange}
              min="1"
              max="2000"
              required
              placeholder="1000"
            />
            <small className={styles.helpText}>Maximum number of passengers</small>
          </div>
          
          <div className={styles.formGroup}>
            <label>Status</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={train.isActive}
                  onChange={handleChange}
                />
                <span>Active (available for scheduling)</span>
              </label>
            </div>
          </div>
        </div>
 
        <div className={styles.formGroup}>
          <label>Facilities ({train.facilities.length} selected)</label>
          
          {/* Facilities Grid */}
          <div className={styles.facilitiesGrid}>
            {commonFacilities.map(facility => (
              <div key={facility} className={styles.facilityItem}>
                <label className={styles.facilityLabel}>
                  <input
                    type="checkbox"
                    checked={train.facilities.includes(facility)}
                    onChange={() => handleFacilityToggle(facility)}
                  />
                  <span className={styles.facilityName}>{facility}</span>
                </label>
              </div>
            ))}
          </div>
          
          {/* Selected Facilities Summary */}
          {train.facilities.length > 0 && (
            <div className={styles.selectedFacilities}>
              <label className={styles.sectionLabel}>Selected Facilities:</label>
              <div className={styles.facilitiesContainer}>
                {train.facilities.map((facility, index) => (
                  <span key={`selected-${index}-${facility}`} className={styles.facilityTag}>
                    ✓ {facility}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
 
        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? (id ? 'Updating...' : 'Creating...') : (id ? 'Update Train' : 'Create Train')}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/dashboard/trains')}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          
          {!id && (
            <div className={styles.nextStepInfo}>
              <small>💡 After creating the train, you can add schedules in Train Availability</small>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
 
export default TrainForm;