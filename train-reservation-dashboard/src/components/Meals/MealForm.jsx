import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './MealForm.module.css';

const MealForm = () => {
const { id } = useParams();
const navigate = useNavigate();
const { get, post, put } = useApi();
const [meal, setMeal] = useState({
name: '',
price: '', // Keep as string for input handling
trainNumber: '',
category: 'Breakfast',
description: '',
photoUrl: '',
available: true
});
const [trains, setTrains] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
const fetchData = async () => {
try {
setIsLoading(true);
setError(null);
 

// Fetch trains data
const trainsResponse = await get('/api/trains');
const trainsData = Array.isArray(trainsResponse) ? trainsResponse :
trainsResponse?.data ? trainsResponse.data : [];
 

if (!Array.isArray(trainsData)) {
throw new Error('Invalid trains data format');
}
 

setTrains(trainsData);
 

// If editing, fetch meal data
if (id) {
const mealData = await get(`/api/admin/meals/${id}`);
setMeal({
...mealData,
// Ensure price is converted to string for the input
price: mealData.price ? mealData.price.toString() : '',
photoUrl: mealData.photo || ''
});
}
} catch (error) {
console.error('Failed to fetch data:', error);
setError('Failed to load data. Please try again.');
setTrains([]);
} finally {
setIsLoading(false);
}
};

fetchData();
}, [id]);

const handleChange = (e) => {
const { name, value } = e.target;
 

// Special handling for price field
if (name === 'price') {
// Allow empty string and valid numbers (including decimals)
if (value === '' || /^\d*\.?\d*$/.test(value)) {
setMeal({ ...meal, [name]: value });
}
return;
}
 

setMeal({ ...meal, [name]: value });
};

const handleSubmit = async (e) => {
e.preventDefault();
 

// Validate price
if (!meal.price || parseFloat(meal.price) <= 0) {
setError('Please enter a valid price greater than 0.');
return;
}
 

try {
const mealData = {
name: meal.name,
price: parseFloat(meal.price), // Convert to number for API
trainNumber: meal.trainNumber,
category: meal.category,
description: meal.description,
available: meal.available,
photo: meal.photoUrl
};

if (id) {
await put(`/api/admin/meals/${id}`, mealData);
} else {
await post('/api/admin/meals', mealData);
}
navigate('/dashboard/meals');
} catch (error) {
console.error('Failed to save meal:', error);
setError('Failed to save meal. Please try again.');
}
};

return (
<div className={styles.mealForm}>
<h2>{id ? 'Edit Meal' : 'Add New Meal'}</h2>
{error && <div className={styles.error}>{error}</div>}
 

<form onSubmit={handleSubmit}>
<div className={styles.formGrid}>
<div className={styles.formGroup}>
<label>Meal Name</label>
<input
type="text"
name="name"
value={meal.name}
onChange={handleChange}
required
/>
</div>

<div className={styles.formGroup}>
<label>Price (₹)</label>
<input
type="text" // Changed from "number" to "text" for better control
name="price"
value={meal.price}
onChange={handleChange}
placeholder="Enter price (e.g., 150 or 150.50)"
pattern="^\d*\.?\d*$" // HTML5 pattern for validation
required
/>
</div>

<div className={styles.formGroup}>
<label>Train Number</label>
<select
name="trainNumber"
value={meal.trainNumber}
onChange={handleChange}
required
disabled={isLoading}
>
<option value="">Select Train</option>
{isLoading ? (
<option value="">Loading trains...</option>
) : (
Array.isArray(trains) && trains.map(train => (
<option key={train._id} value={train.trainNumber}>
{train.trainNumber} - {train.trainName}
</option>
))
)}
</select>
</div>

<div className={styles.formGroup}>
<label>Category</label>
<select
name="category"
value={meal.category}
onChange={handleChange}
required
>
<option value="Breakfast">Breakfast</option>
<option value="Lunch">Lunch</option>
<option value="Dinner">Dinner</option>
<option value="Snack">Snack</option>
<option value="Beverage">Beverage</option>
</select>
</div>

<div className={styles.formGroup}>
<label>Description</label>
<textarea
name="description"
value={meal.description}
onChange={handleChange}
rows="3"
/>
</div>

<div className={styles.formGroup}>
<label>Availability</label>
<div className={styles.radioGroup}>
<label>
<input
type="radio"
name="available"
checked={meal.available}
onChange={() => setMeal({ ...meal, available: true })}
/>
Available
</label>
<label>
<input
type="radio"
name="available"
checked={!meal.available}
onChange={() => setMeal({ ...meal, available: false })}
/>
Unavailable
</label>
</div>
</div>

<div className={styles.formGroup}>
<label>Image URL</label>
<input
type="url"
name="photoUrl"
value={meal.photoUrl}
onChange={handleChange}
placeholder="https://example.com/image.jpg"
/>
{meal.photoUrl && (
<div className={styles.imagePreview}>
<img
src={meal.photoUrl}
alt="Meal preview"
className={styles.previewImage}
onError={(e) => {
e.target.style.display = 'none';
}}
/>
</div>
)}
</div>
</div>

<div className={styles.formActions}>
<button type="submit" className={styles.submitButton}>
{id ? 'Update Meal' : 'Add Meal'}
</button>
<button
type="button"
onClick={() => navigate('/dashboard/meals')}
className={styles.cancelButton}
>
Cancel
</button>
</div>
</form>
</div>
);
};

export default MealForm;
