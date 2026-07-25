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

const router = express.Router();

// Public routes
router.get('/', getTrainAvailabilities);
router.get('/:id', getTrainAvailability);
router.post('/search', searchTrains);
router.post('/:id/booking-queue', addToBookingQueue);

// Algorithm processing routes
router.post('/:id/process-queue', processBookingQueue);
router.get('/:id/metrics', getMetrics);

module.exports = router;