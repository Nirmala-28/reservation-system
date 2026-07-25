// payments.js
const express = require('express');
const {
  createStripePaymentIntent,
  confirmStripePayment,
  createPayPalOrder,
  capturePayPalOrder,
} = require('../controllers/payments');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Stripe routes
router.post('/stripe/create-intent', createStripePaymentIntent);
router.post('/stripe/confirm', confirmStripePayment);

// PayPal routes
router.post('/paypal/create-order', createPayPalOrder);
router.post('/paypal/capture-order', capturePayPalOrder);

module.exports = router;