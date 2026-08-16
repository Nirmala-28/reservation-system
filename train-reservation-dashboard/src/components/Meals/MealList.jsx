import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './MealList.module.css';

const MealList = () => {
  const [meals, setMeals] = useState([]);
  const [trainFilter, setTrainFilter] = useState('');
  const { get, delete: deleteApi, put } = useApi();

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const response = await get('/api/admin/meals');
        // Extract the data array from the response
        setMeals(response.data || []);
      } catch (error) {
        console.error('Failed to fetch meals:', error);
        setMeals([]); 
      }
    };

    fetchMeals();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        await deleteApi(`/api/admin/meals/${id}`);
        setMeals(meals.filter(meal => meal._id !== id));
      } catch (error) {
        console.error('Failed to delete meal:', error);
      }
    }
  };

  const toggleAvailability = async (id, currentStatus) => {
    try {
      const response = await put(`/api/admin/meals/${id}`, { available: !currentStatus });
      // Extract the updated meal from response.data
      setMeals(meals.map(meal => meal._id === id ? response.data : meal));
    } catch (error) {
      console.error('Failed to update meal:', error);
    }
  };

  const filteredMeals = meals.filter(meal => 
    trainFilter ? meal.trainNumber?.includes(trainFilter) : true
  );

  return (
    <div className={styles.mealList}>
      <div className={styles.header}>
        <h2>Meal Management</h2>
        <div className={styles.controls}>
          <input
            type="text"
            placeholder="Filter by train number"
            value={trainFilter}
            onChange={(e) => setTrainFilter(e.target.value)}
            className={styles.filterInput}
          />
          <Link to="/dashboard/meals/add" className={styles.addButton}>
            Add New Meal
          </Link>
        </div>
      </div>
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Train No.</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMeals.map((meal) => (
              <tr key={meal._id}>
                <td>
                  {meal.photo && (
                    <img 
                      src={meal.photo} 
                      alt={meal.name} 
                      className={styles.mealImage}
                    />
                  )}
                </td>
                <td>{meal.name}</td>
                <td>{meal.trainNumber}</td>
                <td>{meal.category}</td>
                <td>NPR {meal.price}</td>
                <td>
                  <span 
                    className={`${styles.status} ${
                      meal.available ? styles.available : styles.unavailable
                    }`}
                  >
                    {meal.available ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td className={styles.actionsCell}>
                  <Link 
                    to={`/dashboard/meals/edit/${meal._id}`} 
                    className={styles.editButton}
                  >
                    Edit
                  </Link>
                  <button 
                    onClick={() => toggleAvailability(meal._id, meal.available)}
                    className={`${styles.toggleButton} ${
                      meal.available ? styles.makeUnavailable : styles.makeAvailable
                    }`}
                  >
                    {meal.available ? 'Make Unavailable' : 'Make Available'}
                  </button>
                  <button 
                    onClick={() => handleDelete(meal._id)} 
                    className={styles.deleteButton}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MealList;