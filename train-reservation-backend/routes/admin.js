// admin.js
const express = require('express');
const {
  createTrain,
  updateTrain,
  deleteTrain,
  getMeals,
  getMeal,
  createMeal,
  updateMeal,
  deleteMeal,
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getBookings,
  getBookingStats,
  createTrainAvailability,
  updateTrainAvailability,
  deleteTrainAvailability,
} = require('../controllers/admin');

const { protect, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Train management
router.post('/trains', createTrain);
router.put('/trains/:id', updateTrain);
router.delete('/trains/:id', deleteTrain);

// Train availability management with Round Robin algorithm
router.post('/train-availability', createTrainAvailability);
router.put('/train-availability/:id', updateTrainAvailability);
router.delete('/train-availability/:id', deleteTrainAvailability);

// Meal management
router.get('/meals', getMeals);
router.get('/meals/:id', getMeal);
router.post('/meals', upload.single('photo'), createMeal);
router.put('/meals/:id', upload.single('photo'), updateMeal);
router.delete('/meals/:id', deleteMeal);

// Coupon management
router.get('/coupons', getCoupons);
router.get('/coupons/:id', getCoupon);
router.post('/coupons', createCoupon);
router.put('/coupons/:id', updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// Booking management
router.get('/bookings', getBookings);
router.get('/stats', getBookingStats);

module.exports = router;