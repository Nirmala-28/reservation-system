// trainAvailability.js
const express = require('express');
const {
  getTrainAvailabilities,
  getTrainAvailability,
  searchTrains,
  processBookingQueue,
  addToBookingQueue,
  getMetrics,
} = require('../controllers/trainAvailability');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getTrainAvailabilities);
router.get('/:id', getTrainAvailability);
router.post('/search', searchTrains);
router.post('/:id/booking-queue', protect, authorize('admin'), addToBookingQueue);

// Algorithm processing routes
router.post('/:id/process-queue', protect, authorize('admin'), processBookingQueue);
router.get('/:id/metrics', protect, authorize('admin'), getMetrics);

module.exports = router;
