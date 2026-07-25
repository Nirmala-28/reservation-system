// coupons.js
const express = require('express');
const { applyCoupon, validateCoupon } = require('../controllers/coupons');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/apply', applyCoupon);
router.post('/validate', validateCoupon);

module.exports = router;
