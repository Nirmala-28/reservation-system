// trains.js
const express = require('express');
const {
  getTrains,
  getTrain,
} = require('../controllers/trains');

const router = express.Router();

router.get('/', getTrains);
router.get('/:id', getTrain);

module.exports = router;