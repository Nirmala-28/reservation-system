import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './ScheduleForm.module.css';

const ScheduleForm = () => {
const { id } = useParams();
const navigate = useNavigate();
const location = useLocation();
const { get, post, put } = useApi();

// Get data from navigation state
const existingData = location.state?.availability;
const preselectedTrain = location.state?.trainNumber && location.state?.trainName
? { trainNumber: location.state.trainNumber, trainName: location.state.trainName }
: null;

console.log('[ScheduleForm] Component mounted');
console.log('[ScheduleForm] Route ID:', id);
console.log('[ScheduleForm] Location state:', location.state);
console.log('[ScheduleForm] Existing data from state:', existingData);
console.log('[ScheduleForm] Preselected train:', preselectedTrain);
console.log('[ScheduleForm] Will fetch data:', id && !existingData); 

const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);
const [trains, setTrains] = useState([]);
const [trainsLoaded, setTrainsLoaded] = useState(false); // Add loading state tracker
const [editingFareOption, setEditingFareOption] = useState(null);
const [showFareModal, setShowFareModal] = useState(false);
const [dataLoading, setDataLoading] = useState(false); // Loading state for fetching existing data
const [stopsListInput, setStopsListInput] = useState(
(existingData?.stopsList || []).join(', ')
);

// Fetch existing data function
const fetchExistingData = async () => {
  console.log('[ScheduleForm] Fetching existing data for ID:', id);
  if (id && !existingData) {
    try {
      setDataLoading(true);
      const response = await get(`/api/admin/train-availability/${id}`);
      console.log('[ScheduleForm] API response:', response);
      if (response.success) {
        const data = response.data;
        setSchedule({
          trainNumber: data.trainNumber || '',
          trainName: data.trainName || '',
          rating: data.rating || 0,
          departureTime: data.departureTime || '',
          departureStation: data.departureStation || '',
          departureDate: data.departureDate || '',
          arrivalTime: data.arrivalTime || '',
          arrivalStation: data.arrivalStation || '',
          arrivalDate: data.arrivalDate || '',
          duration: data.duration || '',
          stopsList: Array.isArray(data.stopsList) ? data.stopsList : [],

          algorithmType: data.algorithmType || 'RoundRobin',
          timeQuantum: data.timeQuantum || 30,
          fareOptions: Array.isArray(data.fareOptions) ? data.fareOptions : []
        });
        setStopsListInput(Array.isArray(data.stopsList) ? data.stopsList.join(', ') : '');
        console.log('[ScheduleForm] Data loaded successfully');

        // Automatically load real-time availability if departure date is set
        if (data.departureDate && Array.isArray(data.fareOptions) && data.fareOptions.length > 0) {
          console.log('[ScheduleForm] Auto-loading real-time availability...');
          try {
            const updatedFareOptions = await Promise.all(
              data.fareOptions.map(async (fare) => {
                try {
                  const inventoryResponse = await post(`/api/admin/debug/inventory`, {
                    trainAvailabilityId: id,
                    travelDate: data.departureDate,
                    classInfo: fare.class
                  });
                  if (inventoryResponse.success && inventoryResponse.data.inventory) {
                    return {
                      ...fare,
                      realTimeAvailable: inventoryResponse.data.inventory.availableSeats,
                      inventoryData: inventoryResponse.data.inventory,
                      waitlistActual: inventoryResponse.data.waitlist?.actual || 0
                    };
                  }
                  return fare;
                } catch (error) {
                  console.error(`Failed to load inventory for class ${fare.class}:`, error);
                  return fare;
                }
              })
            );
            setSchedule(prev => ({ ...prev, fareOptions: updatedFareOptions }));
            console.log('[ScheduleForm] Real-time availability auto-loaded');
          } catch (error) {
            console.error('[ScheduleForm] Failed to auto-load real-time availability:', error);
            // Don't fail the whole load if real-time fails
          }
        }
      } else {
        console.error('[ScheduleForm] API returned false success');
        setError('Failed to load schedule data');
      }
    } catch (error) {
      console.error('[ScheduleForm] Error fetching schedule data:', error);
      setError('Failed to load schedule data');
    } finally {
      setDataLoading(false);
    }
  } else {
    console.log('[ScheduleForm] Skipping fetch - id:', id, 'existingData:', !!existingData);
  }
};
 

const [schedule, setSchedule] = useState(() => {
if (id && existingData) {
return {
trainNumber: existingData.trainNumber || '',
trainName: existingData.trainName || '',
rating: existingData.rating || 0,
departureTime: existingData.departureTime || '',
departureStation: existingData.departureStation || '',
departureDate: existingData.departureDate || '',
arrivalTime: existingData.arrivalTime || '',
arrivalStation: existingData.arrivalStation || '',
arrivalDate: existingData.arrivalDate || '',
duration: existingData.duration || '',
stopsList: Array.isArray(existingData.stopsList) ? existingData.stopsList : [],

algorithmType: 'RoundRobin', // Always Round Robin
timeQuantum: existingData.timeQuantum || 30,
fareOptions: Array.isArray(existingData.fareOptions) ? existingData.fareOptions : []
};
}


return {
trainNumber: preselectedTrain?.trainNumber || '',
trainName: preselectedTrain?.trainName || '',
rating: 0,
departureTime: '',
departureStation: '',
departureDate: '',
arrivalTime: '',
arrivalStation: '',
arrivalDate: '',
duration: '',
stopsList: [],

algorithmType: 'RoundRobin', // Always Round Robin
timeQuantum: 30,
fareOptions: []
};
});

const [newFareOption, setNewFareOption] = useState({
class: '',
price: '',
totalSeats: '',
availableSeats: '',
waitingList: '',
color: '#90EE90'
});

// Memoized fetch function to prevent recreation
const fetchTrains = useCallback(async () => {
if (trainsLoaded) return; // Prevent multiple calls
 

try {
console.log('🔄 Fetching trains (one time only)...');
const response = await get('/api/trains');
if (response?.data && Array.isArray(response.data)) {
setTrains(response.data.filter(train => train.isActive));
setTrainsLoaded(true); // Mark as loaded
console.log('✅ Trains loaded successfully:', response.data.length);
}
} catch (error) {
console.error('❌ Failed to fetch trains:', error);
setError('Failed to load trains. Please try again.');
}
}, [get, trainsLoaded]);

// Fetch available trains - only once
useEffect(() => {
fetchTrains();
}, [fetchTrains]);

// Show warning if editing without data
useEffect(() => {
if (id && !existingData) {
fetchExistingData();
}
}, [id]);

const handleChange = (e) => {
const { name, value, type } = e.target;
 

if (type === 'number') {
setSchedule(prev => ({ ...prev, [name]: value === '' ? '' : (parseFloat(value) || 0) }));
} else {
setSchedule(prev => ({ ...prev, [name]: value }));
}
};

const handleStopsListChange = (e) => {
const raw = e.target.value;
setStopsListInput(raw);
setSchedule(prev => ({
...prev,
stopsList: raw.split(',').map(s => s.trim()).filter(Boolean)
}));
};

const handleTrainSelect = (e) => {
const selectedTrainNumber = e.target.value;
const selectedTrain = trains.find(train => train.trainNumber === selectedTrainNumber);
 

if (selectedTrain) {
setSchedule(prev => ({
...prev,
trainNumber: selectedTrain.trainNumber,
trainName: selectedTrain.trainName
}));
}
};

const handleFareOptionAdd = () => {
const { class: fareClass, price, totalSeats, availableSeats } = newFareOption;


if (fareClass?.trim() && price?.trim() && totalSeats) {
const seatsNum = parseInt(totalSeats) || 0;
const availableNum = availableSeats !== '' && availableSeats !== undefined 
  ? parseInt(availableSeats) 
  : seatsNum; // Default to total seats if not specified


setSchedule(prev => ({
...prev,
fareOptions: [
...(Array.isArray(prev.fareOptions) ? prev.fareOptions : []),
{
class: fareClass.trim(),
price: price.trim(),
totalSeats: seatsNum,
availableSeats: Math.min(availableNum, seatsNum),
waitingList: parseInt(newFareOption.waitingList) || 0,
color: newFareOption.color || '#90EE90'
}
]
}));


setNewFareOption({
class: '',
price: '',
totalSeats: '',
availableSeats: '',
waitingList: '',
color: '#90EE90'
});
}
};

const handleFareOptionRemove = (index) => {
setSchedule(prev => ({
...prev,
fareOptions: Array.isArray(prev.fareOptions) ? prev.fareOptions.filter((_, i) => i !== index) : []
}));
};

const handleFareOptionEdit = (index) => {
const fareOption = schedule.fareOptions[index];
// originalClass is kept separate from the (possibly edited) class field
// below, so the update request can still find the fare option after
// its class name is changed in the modal.
setEditingFareOption({ ...fareOption, index, originalClass: fareOption.class });
setShowFareModal(true);
};

const handleFareOptionSave = async () => {
  try {
    setLoading(true);
    setError(null);

    const { index, originalClass, ...fareOptionData } = editingFareOption;

    // Update existing fare option — the URL's class segment is the
    // ORIGINAL class name (identifies which record to update), while the
    // body carries the new values, including a renamed class if changed.
    const response = await put(`/api/admin/train-availability/${id}/fare-options/${originalClass}`, {
      fareOption: fareOptionData
    });
    
    if (response.success) {
      // Update local state
      setSchedule(prev => ({
        ...prev,
        fareOptions: Array.isArray(prev.fareOptions) 
          ? prev.fareOptions.map((f, i) => i === index ? fareOptionData : f)
          : []
      }));
      
      setSuccess('Fare option updated successfully!');
      setShowFareModal(false);
      setEditingFareOption(null);
      
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(response.message || 'Failed to update fare option');
    }
  } catch (error) {
    console.error('Error updating fare option:', error);
    setError('Failed to update fare option');
  } finally {
    setLoading(false);
  }
};

const handleFareOptionChange = (e) => {
const { name, value } = e.target;
setNewFareOption(prev => ({ ...prev, [name]: value }));
};

// Memoized duration calculation to prevent unnecessary recalculations
const calculateDuration = useCallback(() => {
if (schedule.departureTime && schedule.arrivalTime) {
const [depHour, depMin] = schedule.departureTime.split(':').map(Number);
const [arrHour, arrMin] = schedule.arrivalTime.split(':').map(Number);
 

let depMinutes = depHour * 60 + depMin;
let arrMinutes = arrHour * 60 + arrMin;
 

// Handle next day arrival
if (arrMinutes < depMinutes) {
arrMinutes += 24 * 60;
}
 

const diffMinutes = arrMinutes - depMinutes;
const hours = Math.floor(diffMinutes / 60);
const minutes = diffMinutes % 60;
 

const duration = `${hours}h ${minutes}m`;
 

// Only update if duration actually changed
setSchedule(prev => {
if (prev.duration !== duration) {
return { ...prev, duration };
}
return prev;
});
}
}, [schedule.departureTime, schedule.arrivalTime]);

useEffect(() => {
calculateDuration();
}, [calculateDuration]);

const handleSubmit = async (e) => {
e.preventDefault();
 

// Validate required fields
if (!schedule.trainNumber || !schedule.trainName) {
setError('Please select a train.');
return;
}
 

if (!schedule.departureStation || !schedule.arrivalStation) {
setError('Departure and arrival stations are required.');
return;
}
 

if (!schedule.departureDate || !schedule.departureTime || !schedule.arrivalTime) {
setError('Departure date and times are required.');
return;
}
 

try {
setLoading(true);
setError(null);
setSuccess(null);
 

// Ensure Round Robin algorithm is set
const submitData = {
...schedule,
algorithmType: 'RoundRobin'
};
 
if (submitData.timeQuantum === '' || submitData.timeQuantum === 0 || isNaN(submitData.timeQuantum)) {
  submitData.timeQuantum = 30; // Default if left blank
}

console.log('Submitting schedule data:', submitData);
 

let response;
if (id) {
// Update existing schedule
response = await put(`/api/admin/train-availability/${id}`, submitData);
} else {
// Create new schedule
response = await post('/api/admin/train-availability', submitData);
}
 

if (response.success) {
setSuccess(response.message || `Schedule ${id ? 'updated' : 'created'} successfully with Round Robin algorithm!`);
 

// Navigate after a short delay to show success message
setTimeout(() => {
navigate('/dashboard/train-availability');
}, 2000);
}
} catch (error) {
console.error('Submit error:', error);
setError(`Failed to ${id ? 'update' : 'create'} schedule: ${error.response?.data?.message || error.message}`);
} finally {
setLoading(false);
}
};

// Error state
if (error && id) {
return (
<div className={styles.scheduleForm}>
<div className={styles.error}>
<h3>Cannot Edit Schedule</h3>
<p>{error}</p>
<div style={{ marginTop: '1rem' }}>
<button onClick={() => navigate('/dashboard/train-availability')}>
Back to Schedules List
</button>
</div>
</div>
</div>
);
}

// Loading state for data fetching
if (dataLoading) {
return (
<div className={styles.scheduleForm}>
<div className={styles.loading}>
<div>📡 Loading schedule data...</div>
</div>
</div>
);
}

return (
<div className={styles.scheduleForm}>
<h2>{id ? 'Edit Train Schedule' : 'Create New Train Schedule'}</h2>


{id && (existingData || schedule.trainNumber) && (
<div className={styles.editingInfo}>
📝 Editing: {schedule.trainNumber} - {schedule.trainName}
</div>
)}

{error && (
<div className={styles.error}>
<p>{error}</p>
</div>)} 

 

{success && (
<div className={styles.success}>
<p>{success}</p>
</div>
)}
 

<form onSubmit={handleSubmit}>
{/* Train Selection */}
<div className={styles.section}>
<h3>🚉 Train Information</h3>
<div className={styles.formRow}>
<div className={styles.formGroup}>
<label>Select Train <span className={styles.required}>*</span></label>
{preselectedTrain ? (
<div className={styles.preselectedTrain}>
<strong>{preselectedTrain.trainNumber}</strong> - {preselectedTrain.trainName}
<input type="hidden" name="trainNumber" value={schedule.trainNumber} />
<input type="hidden" name="trainName" value={schedule.trainName} />
</div>
) : (
<select
value={schedule.trainNumber}
onChange={handleTrainSelect}
required
disabled={!!id || !trainsLoaded}
>
<option value="">
{trainsLoaded ? "Select a train..." : "Loading trains..."}
</option>
{trains.map(train => (
<option key={train._id} value={train.trainNumber}>
{train.trainNumber} - {train.trainName} ({train.trainType})
</option>
))}
</select>
)}
</div>
 

<div className={styles.formGroup}>
<label>Rating</label>
<input
type="number"
name="rating"
value={schedule.rating}
onChange={handleChange}
min="0"
max="5"
step="0.1"
placeholder="4.5"
/>
</div>
</div>
</div>

{/* Algorithm Configuration */}
<div className={styles.section}>
  <h3>🧠 Algorithm Configuration</h3>
  
  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' }}>
    <span className={styles.algorithmBadge} style={{ background: '#e0f2fe', color: '#0369a1' }}>🌲 Segment Tree (Active)</span>
    <span className={styles.algorithmBadge} style={{ background: '#fce7f3', color: '#be185d' }}>👑 Priority Queue (Active)</span>
    <span className={styles.algorithmBadge} style={{ background: '#dcfce7', color: '#15803d' }}>📍 Dijkstra (Active)</span>
  </div>
  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '15px', fontStyle: 'italic' }}>
    Note: The above 3 algorithms are zero-configuration and run automatically. Round Robin requires a manual time quantum below.
  </p>

  <div className={styles.algorithmCard}>
    <div className={styles.algorithmHeader}>
      <h4>Round Robin Scheduling</h4>
      <span className={styles.algorithmBadge}>Active</span>
    </div>
    <p><strong>Description:</strong> Fair time slot allocation with equal time quantum for all bookings</p>
    <p><strong>Best for:</strong> Balanced resource allocation and ensuring no booking is starved</p>
 

<div className={styles.formGroup}>
<label>Time Quantum (minutes)</label>
<input
type="number"
name="timeQuantum"
value={schedule.timeQuantum}
onChange={handleChange}
min="0"
max="120"
/>
<small className={styles.helpText}>
Each booking gets exactly this amount of processing time before moving to the next
</small>
</div>
 

<div className={styles.quantumGuide}>
<h5>Time Quantum Guide:</h5>
<ul>
<li><strong>5-15 min:</strong> High-frequency bookings, quick turnaround</li>
<li><strong>30-60 min:</strong> Balanced operations (recommended)</li>
<li><strong>60-120 min:</strong> Long-running processes, batch operations</li>
</ul>
</div>
</div>
</div>

{/* Route Information */}
<div className={styles.section}>
<h3>🛤️ Route Information</h3>
<div className={styles.formRow}>
<div className={styles.formGroup}>
<label>Departure Station <span className={styles.required}>*</span></label>
<input
type="text"
name="departureStation"
value={schedule.departureStation}
onChange={handleChange}
required
placeholder="New Delhi"
/>
</div>
<div className={styles.formGroup}>
<label>Arrival Station <span className={styles.required}>*</span></label>
<input
type="text"
name="arrivalStation"
value={schedule.arrivalStation}
onChange={handleChange}
required
placeholder="Mumbai Central"
/>
</div>
</div>
<div className={styles.formRow}>
<div className={styles.formGroup} style={{ flex: 1 }}>
<label>Intermediate Stops (optional)</label>
<input
type="text"
value={stopsListInput}
onChange={handleStopsListChange}
placeholder="Kathmandu, Bharatpur, Butwal, Pokhara"
/>
<small className={styles.helpText}>
Comma-separated, in order, including the departure and arrival stations. Powers the Segment Tree
algorithm's partial-route seat sharing — without this, Segment Tree has nothing to check and every
booking on this schedule just logs a "skipped" result.
</small>
</div>
</div>
</div>

{/* Schedule Information */}
<div className={styles.section}>
<h3>⏰ Schedule Information</h3>
<div className={styles.formRow}>
<div className={styles.formGroup}>
<label>Departure Date <span className={styles.required}>*</span></label>
<input
type="date"
name="departureDate"
value={schedule.departureDate}
onChange={handleChange}
required
/>
</div>
<div className={styles.formGroup}>
<label>Departure Time <span className={styles.required}>*</span></label>
<input
type="time"
name="departureTime"
value={schedule.departureTime}
onChange={handleChange}
required
/>
</div>
</div>

<div className={styles.formRow}>
<div className={styles.formGroup}>
<label>Arrival Date</label>
<input
type="date"
name="arrivalDate"
value={schedule.arrivalDate}
onChange={handleChange}
placeholder="Auto-calculated if same day"
/>
</div>
<div className={styles.formGroup}>
<label>Arrival Time <span className={styles.required}>*</span></label>
<input
type="time"
name="arrivalTime"
value={schedule.arrivalTime}
onChange={handleChange}
required
/>
</div>
</div>

<div className={styles.formRow}>
<div className={styles.formGroup}>
<label>Duration</label>
<input
type="text"
name="duration"
value={schedule.duration}
onChange={handleChange}
placeholder="Auto-calculated"
readOnly
/>
<small className={styles.helpText}>Automatically calculated from times</small>
</div>
</div>
</div>

{/* Fare Options */}
<div className={styles.section}>
<h3>💰 Fare Options ({Array.isArray(schedule.fareOptions) ? schedule.fareOptions.length : 0} classes)</h3>
{id && (
  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
    <div style={{ flex: 1, padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', fontSize: '0.875rem', color: '#92400e' }}>
      ℹ️ <strong>Note:</strong> Real-time availability is auto-loaded. Use refresh to update.
    </div>
    <button
      type="button"
      onClick={async () => {
        try {
          setLoading(true);
          setError(null);

          // Load real-time availability for each fare class
          const updatedFareOptions = await Promise.all(
            schedule.fareOptions.map(async (fare) => {
              try {
                const response = await post(`/api/admin/debug/inventory`, {
                  trainAvailabilityId: id,
                  travelDate: schedule.departureDate,
                  classInfo: fare.class
                });
                if (response.success && response.data.inventory) {
                  // Auto-sync: Update base config to match real-time availability
                  const syncResponse = await put(`/api/admin/train-availability/${id}/fare-options/${fare.class}`, {
                    class: fare.class,
                    fareOption: {
                      class: fare.class,
                      price: fare.price,
                      totalSeats: fare.totalSeats,
                      availableSeats: response.data.inventory.availableSeats,
                      waitingList: fare.waitingList,
                      color: fare.color
                    }
                  });

                  if (syncResponse.success) {
                    return {
                      ...fare,
                      availableSeats: response.data.inventory.availableSeats,
                      realTimeAvailable: response.data.inventory.availableSeats,
                      inventoryData: response.data.inventory,
                      waitlistActual: response.data.waitlist?.actual || 0
                    };
                  }
                  return {
                    ...fare,
                    realTimeAvailable: response.data.inventory.availableSeats,
                    inventoryData: response.data.inventory,
                    waitlistActual: response.data.waitlist?.actual || 0
                  };
                }
                return fare;
              } catch (error) {
                console.error(`Failed to load inventory for class ${fare.class}:`, error);
                return fare;
              }
            })
          );

          setSchedule(prev => ({ ...prev, fareOptions: updatedFareOptions }));
          setSuccess('Real-time data refreshed and synced to base config!');
          setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
          console.error('Failed to refresh real-time availability:', error);
          setError('Failed to refresh real-time availability');
        } finally {
          setLoading(false);
        }
      }}
      className={styles.refreshButton}
      disabled={loading || !schedule.departureDate}
      style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
    >
      🔄 Refresh & Sync Real-time Data
    </button>
  </div>
)}
 

<div className={styles.fareOptionsTable}>
<table>
<thead>
<tr>
<th>Class</th>
<th>Price</th>
<th>Total Seats</th>
<th>Available (Base/Real-time)</th>
<th>Waiting List (Actual/Max)</th>
<th>Color</th>
<th>Action</th>
</tr>
</thead>
<tbody>
{Array.isArray(schedule.fareOptions) && schedule.fareOptions.length > 0 ? (
schedule.fareOptions.map((option, index) => (
<tr key={`fare-${index}-${option.class}`}>
<td>{option.class}</td>
<td>{option.price}</td>
<td>{option.totalSeats}</td>
<td>
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span>{option.availableSeats}</span>
    {option.realTimeAvailable !== undefined ? (
      <small style={{ color: option.realTimeAvailable !== option.availableSeats ? '#f59e0b' : '#10b981', fontSize: '11px' }}>
        Real-time: {option.realTimeAvailable}
        {option.realTimeAvailable !== option.availableSeats && (
          <span style={{ color: '#ef4444', marginLeft: '4px' }}>⚠️ Mismatch</span>
        )}
      </small>
    ) : (
      <small style={{ color: '#9ca3af', fontSize: '11px' }}>
        Base capacity only
      </small>
    )}
  </div>
</td>
<td>
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span>
      {option.waitlistActual !== undefined ? `${option.waitlistActual}/${option.waitingList}` : option.waitingList}
    </span>
    {option.waitlistActual !== undefined && (
      <small style={{ color: option.waitlistActual >= option.waitingList ? '#ef4444' : '#10b981', fontSize: '11px' }}>
        {option.waitlistActual >= option.waitingList ? 'Full' : 'Available'}
      </small>
    )}
  </div>
</td>
<td>
<span
className={styles.colorPreview}
style={{ backgroundColor: option.color }}
title={option.color}
/>
</td>
<td>
<div style={{ display: 'flex', gap: '8px' }}>
  <button
    type="button"
    onClick={() => handleFareOptionEdit(index)}
    className={styles.editButton}
    title="Edit fare option"
  >
    ✏️ Edit
  </button>
  <button
    type="button"
    onClick={() => handleFareOptionRemove(index)}
    className={styles.removeButton}
    title="Remove fare option"
  >
    🗑️ Remove
  </button>
</div>
</td>
</tr>
))
) : (
<tr>
<td colSpan="7" className={styles.noFareOptions}>
No fare options added yet
</td>
</tr>
)}
<tr className={styles.addRow}>
<td>
<input
type="text"
name="class"
value={newFareOption.class}
onChange={handleFareOptionChange}
placeholder="3A, 2A, SL"
/>
</td>
<td>
<input
type="text"
name="price"
value={newFareOption.price}
onChange={handleFareOptionChange}
placeholder="NPR 1500"
/>
</td>
<td>
<input
type="number"
name="totalSeats"
value={newFareOption.totalSeats}
onChange={handleFareOptionChange}
placeholder="72"
min="1"
/>
</td>
<td>
<input
type="number"
name="availableSeats"
value={newFareOption.availableSeats}
onChange={handleFareOptionChange}
placeholder="45"
min="0"
/>
</td>
<td>
<input
type="number"
name="waitingList"
value={newFareOption.waitingList}
onChange={handleFareOptionChange}
placeholder="Max (e.g., 10)"
min="0"
title="Maximum waitlist capacity"
/>
</td>
<td>
<input
type="color"
name="color"
value={newFareOption.color}
onChange={handleFareOptionChange}
/>
</td>
<td>
<button
type="button"
onClick={handleFareOptionAdd}
className={styles.addButton}
disabled={!newFareOption.class?.trim() || !newFareOption.price?.trim() || !newFareOption.totalSeats}
>
Add
</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>

<div className={styles.formActions}>
<button type="submit" className={styles.submitButton} disabled={loading}>
{loading ? (id ? 'Updating...' : 'Creating...') : (id ? 'Update Schedule' : 'Create Schedule')}
</button>
<button
type="button"
onClick={() => navigate('/dashboard/train-availability')}
className={styles.cancelButton}
disabled={loading}
>
Cancel
</button>
 

{!id && (
<div className={styles.nextStepInfo}>
<small>💡 After creating, you can process booking queues using Round Robin algorithm</small>
</div>
)}
</div>
</form>

{/* Fare Option Edit Modal */}
{showFareModal && editingFareOption && (
  <div className={styles.modalOverlay} onClick={() => setShowFareModal(false)}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalHeader}>
        <h3>✏️ Edit Fare Option</h3>
        <button 
          className={styles.closeButton} 
          onClick={() => setShowFareModal(false)}
        >
          ✕
        </button>
      </div>
      
      <div className={styles.modalBody}>
        <div className={styles.formGroup}>
          <label>Class</label>
          <input
            type="text"
            value={editingFareOption.class}
            onChange={(e) => setEditingFareOption({ ...editingFareOption, class: e.target.value })}
            placeholder="3A, 2A, SL"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label>Price (NPR)</label>
          <input
            type="text"
            value={editingFareOption.price}
            onChange={(e) => setEditingFareOption({ ...editingFareOption, price: e.target.value })}
            placeholder="NPR 1500"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label>Total Seats</label>
          <input
            type="number"
            value={editingFareOption.totalSeats}
            onChange={(e) => setEditingFareOption({ ...editingFareOption, totalSeats: parseInt(e.target.value) })}
            placeholder="72"
            min="1"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label>Available Seats</label>
          <input
            type="number"
            value={editingFareOption.availableSeats}
            onChange={(e) => setEditingFareOption({ ...editingFareOption, availableSeats: parseInt(e.target.value) })}
            placeholder="45"
            min="0"
            className={styles.input}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label>Waiting List (Max Capacity)</label>
          <input
            type="number"
            value={editingFareOption.waitingList}
            onChange={(e) => setEditingFareOption({ ...editingFareOption, waitingList: parseInt(e.target.value) })}
            placeholder="0"
            min="0"
            className={styles.input}
          />
          <small style={{ color: '#6b7280', fontSize: '12px' }}>Maximum number of people allowed on waitlist</small>
        </div>
        
        <div className={styles.formGroup}>
          <label>Color</label>
          <input
            type="color"
            value={editingFareOption.color}
            onChange={(e) => setEditingFareOption({ ...editingFareOption, color: e.target.value })}
            className={styles.colorInput}
          />
        </div>
      </div>
      
      <div className={styles.modalFooter}>
        <button 
          className={styles.cancelButton}
          onClick={() => setShowFareModal(false)}
        >
          Cancel
        </button>
        <button 
          className={styles.saveButton}
          onClick={handleFareOptionSave}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  </div>
)}
</div>
);
};

export default ScheduleForm;