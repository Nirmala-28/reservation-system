// bookings.js
const express = require('express');
const {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getBookingByPNR,
  updateBookingPayment,
} = require('../controllers/bookings');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/pnr/:pnr', getBookingByPNR);

// Protected routes
router.use(protect);

router.post('/', createBooking);
router.get('/my-bookings', getMyBookings);
router.get('/:id', getBooking);
router.put('/:id/cancel', cancelBooking);
router.put('/:id/payment', updateBookingPayment);

module.exports = router;