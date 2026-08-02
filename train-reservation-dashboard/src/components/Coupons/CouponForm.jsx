import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useApi from '../../hooks/useApi';
import styles from './CouponForm.module.css';

const CouponForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, put } = useApi();
  const [coupon, setCoupon] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    maxDiscount: '',
    minOrderValue: '',
    validFrom: '',
    validTo: '',
    usageLimit: '',
    active: true
  });

  useEffect(() => {
    if (id) {
      const fetchCoupon = async () => {
        try {
          const response = await get(`/api/admin/coupons/${id}`);
          setCoupon(response.data || response);
        } catch (error) {
          console.error('Failed to fetch coupon:', error);
        }
      };
      fetchCoupon();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCoupon({ ...coupon, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (id) {
        await put(`/api/admin/coupons/${id}`, coupon);
      } else {
        await post('/api/admin/coupons', coupon);
      }
      navigate('/dashboard/coupons');
    } catch (error) {
      console.error('Failed to save coupon:', error);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCoupon({ ...coupon, code: result });
  };

  return (
    <div className={styles.couponForm}>
      <h2>{id ? 'Edit Coupon' : 'Add New Coupon'}</h2>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Coupon Code <span className={styles.required}>*</span></label>
            <div className={styles.codeInput}>
              <input
                type="text"
                name="code"
                value={coupon.code}
                onChange={handleChange}
                required
                pattern="[A-Z0-9]+"
                title="Only uppercase letters and numbers"
                disabled={!!id}
              />
              {!id && (
              <button 
                type="button" 
                onClick={generateRandomCode}
                className={styles.generateButton}
              >
                Generate
              </button>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Description <span className={styles.required}>*</span></label>
            <input
              type="text"
              name="description"
              value={coupon.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Discount Type <span className={styles.required}>*</span></label>
            <select
              name="discountType"
              value={coupon.discountType}
              onChange={handleChange}
              required
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>
              {coupon.discountType === 'percentage' 
                ? 'Discount Percentage' 
                : 'Discount Amount'} <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="discountValue"
              value={coupon.discountValue}
              onChange={handleChange}
              min="1"
              required
            />
          </div>

          {coupon.discountType === 'percentage' && (
            <div className={styles.formGroup}>
              <label>Maximum Discount (Rs.)</label>
              <input
                type="number"
                name="maxDiscount"
                value={coupon.maxDiscount}
                onChange={handleChange}
                min="1"
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Minimum Order Value (Rs.) <span className={styles.required}>*</span></label>
            <input
              type="number"
              name="minOrderValue"
              value={coupon.minOrderValue}
              onChange={handleChange}
              min="0"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Valid From <span className={styles.required}>*</span></label>
            <input
              type="date"
              name="validFrom"
              value={coupon.validFrom}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Valid To <span className={styles.required}>*</span></label>
            <input
              type="date"
              name="validTo"
              value={coupon.validTo}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Usage Limit</label>
            <input
              type="number"
              name="usageLimit"
              value={coupon.usageLimit}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Status</label>
            <div className={styles.radioGroup}>
              <label>
                <input
                  type="radio"
                  name="active"
                  checked={coupon.active}
                  onChange={() => setCoupon({ ...coupon, active: true })}
                />
                Active
              </label>
              <label>
                <input
                  type="radio"
                  name="active"
                  checked={!coupon.active}
                  onChange={() => setCoupon({ ...coupon, active: false })}
                />
                Inactive
              </label>
            </div>
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            {id ? 'Update Coupon' : 'Add Coupon'}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/dashboard/coupons')}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CouponForm;