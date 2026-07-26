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
 

const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [success, setSuccess] = useState(null);
const [trains, setTrains] = useState([]);
const [trainsLoaded, setTrainsLoaded] = useState(false); // Add loading state tracker
 

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
runDays: existingData.runDays || 'Everyday',
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
runDays: 'Everyday',
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
setError('Schedule data not found. Please go back to the list and try again.');
}
}, [id, existingData]);

const handleChange = (e) => {
const { name, value, type } = e.target;
 

if (type === 'number') {
setSchedule(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
} else {
setSchedule(prev => ({ ...prev, [name]: value }));
}
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
const availableNum = parseInt(availableSeats) || seatsNum;
 

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
if (error && id && !existingData) {
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

return (
<div className={styles.scheduleForm}>
<h2>{id ? 'Edit Train Schedule' : 'Create New Train Schedule'}</h2>
 

{id && existingData && (
<div className={styles.editingInfo}>
📝 Editing: {existingData.trainNumber} - {existingData.trainName}
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

{/* Round Robin Configuration */}
<div className={styles.section}>
<h3>🔄 Round Robin Configuration</h3>
<div className={styles.algorithmCard}>
<div className={styles.algorithmHeader}>
<h4>Round Robin Algorithm</h4>
<span className={styles.algorithmBadge}>Active</span>
</div>
<p><strong>Description:</strong> Fair time slot allocation with equal time quantum for all bookings</p>
<p><strong>Best for:</strong> Balanced resource allocation and ensuring no booking is starved</p>
 

<div className={styles.formGroup}>
<label>Time Quantum (minutes) <span className={styles.required}>*</span></label>
<input
type="number"
name="timeQuantum"
value={schedule.timeQuantum}
onChange={handleChange}
min="5"
max="120"
required
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
<div className={styles.formGroup}>
<label>Run Days</label>
<select
name="runDays"
value={schedule.runDays}
onChange={handleChange}
required
>
<option value="Everyday">Everyday</option>
<option value="Weekdays">Weekdays</option>
<option value="Weekends">Weekends</option>
<option value="Specific Days">Specific Days</option>
</select>
</div>
</div>
</div>

{/* Fare Options */}
<div className={styles.section}>
<h3>💰 Fare Options ({Array.isArray(schedule.fareOptions) ? schedule.fareOptions.length : 0} classes)</h3>
 

<div className={styles.fareOptionsTable}>
<table>
<thead>
<tr>
<th>Class</th>
<th>Price</th>
<th>Total Seats</th>
<th>Available</th>
<th>Waiting List</th>
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
<td>{option.availableSeats}</td>
<td>{option.waitingList}</td>
<td>
<span
className={styles.colorPreview}
style={{ backgroundColor: option.color }}
title={option.color}
/>
</td>
<td>
<button
type="button"
onClick={() => handleFareOptionRemove(index)}
className={styles.removeButton}
>
Remove
</button>
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
placeholder="Rs.1500"
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
placeholder="0"
min="0"
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
</div>
);
};

export default ScheduleForm;