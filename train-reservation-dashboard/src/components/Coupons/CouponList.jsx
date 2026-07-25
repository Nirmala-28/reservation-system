import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './CouponList.module.css';

const CouponList = () => {
  const [coupons, setCoupons] = useState([]);
  const [filter, setFilter] = useState('all');
  const { get, delete: deleteApi, put } = useApi();

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const response = await get('/api/admin/coupons');
        // Extract the data array from the response
        setCoupons(response.data || []);
      } catch (error) {
        console.error('Failed to fetch coupons:', error);
        setCoupons([]); 
      }
    };

    fetchCoupons();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      try {
        await deleteApi(`/api/admin/coupons/${id}`);
        setCoupons(coupons.filter(coupon => coupon._id !== id));
      } catch (error) {
        console.error('Failed to delete coupon:', error);
      }
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const response = await put(`/api/admin/coupons/${id}`, { active: !currentStatus });
      // Extract the updated coupon from response.data
      setCoupons(coupons.map(coupon => coupon._id === id ? response.data : coupon));
    } catch (error) {
      console.error('Failed to update coupon:', error);
    }
  };

  const filteredCoupons = coupons.filter(coupon => {
    if (filter === 'active') return coupon.active;
    if (filter === 'inactive') return !coupon.active;
    return true;
  });

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className={styles.couponList}>
      <div className={styles.header}>
        <h2>Coupon Management</h2>
        <div className={styles.controls}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Coupons</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <Link to="/dashboard/coupons/add" className={styles.addButton}>
            Add New Coupon
          </Link>
        </div>
      </div>
      
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Discount</th>
              <th>Min. Order</th>
              <th>Valid Until</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoupons.map((coupon) => (
              <tr key={coupon._id}>
                <td>
                  <span className={styles.code}>{coupon.code}</span>
                </td>
                <td>{coupon.description}</td>
                <td>
                  {coupon.discountType === 'percentage' 
                    ? `${coupon.discountValue}%` 
                    : `₹${coupon.discountValue}`}
                  {coupon.maxDiscount && coupon.discountType === 'percentage' && (
                    <span className={styles.maxDiscount}>(max ₹{coupon.maxDiscount})</span>
                  )}
                </td>
                <td>₹{coupon.minOrderValue}</td>
                <td>{formatDate(coupon.validTo)}</td>
                <td>
                  <span 
                    className={`${styles.status} ${
                      coupon.active ? styles.active : styles.inactive
                    }`}
                  >
                    {coupon.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <Link 
                    to={`/dashboard/coupons/edit/${coupon._id}`} 
                    className={styles.editButton}
                  >
                    Edit
                  </Link>
                  <button 
                    onClick={() => toggleActive(coupon._id, coupon.active)}
                    className={`${styles.toggleButton} ${
                      coupon.active ? styles.deactivate : styles.activate
                    }`}
                  >
                    {coupon.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button 
                    onClick={() => handleDelete(coupon._id)} 
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

export default CouponList;