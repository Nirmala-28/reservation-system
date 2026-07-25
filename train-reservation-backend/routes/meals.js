// meals.js
const express = require('express');
const { getMealsByTrain } = require('../controllers/meals');

const router = express.Router();

router.get('/train/:trainNumber', getMealsByTrain);

module.exports = router;
