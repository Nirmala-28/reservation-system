// payments.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paypal = require('@paypal/checkout-server-sdk');

// PayPal environment setup
function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  return process.env.PAYPAL_ENVIRONMENT === 'live'
    ? new paypal.core.LiveEnvironment(clientId, clientSecret)
    : new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

const paypalClient = new paypal.core.PayPalHttpClient(environment());

// Stripe Payment Methods

// @desc    Create Stripe payment intent
// @route   POST /api/payments/stripe/create-intent
// @access  Private
exports.createStripePaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), 
      currency: 'usd', // Changed from 'inr' to 'usd' for global compatibility
      metadata: {
        userId: req.user._id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Confirm Stripe payment
// @route   POST /api/payments/stripe/confirm
// @access  Private
exports.confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      res.status(200).json({
        success: true,
        paymentDetails: {
          transactionId: paymentIntent.id,
          status: paymentIntent.status,
          paymentMethod: 'stripe',
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not successful',
      });
    }
  } catch (error) {
    console.error('Stripe confirmation error:', error);
    res.status(400).json({ message: error.message });
  }
};

// PayPal Payment Methods

// @desc    Create PayPal order
// @route   POST /api/payments/paypal/create-order
// @access  Private
exports.createPayPalOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toString(),
        },
      }],
    });

    const order = await paypalClient.execute(request);
    
    res.status(200).json({
      success: true,
      orderID: order.result.id,
    });
  } catch (error) {
    console.error('PayPal order creation error:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Capture PayPal order
// @route   POST /api/payments/paypal/capture-order
// @access  Private
exports.capturePayPalOrder = async (req, res) => {
  try {
    const { orderID } = req.body;
    
    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await paypalClient.execute(request);
    
    if (capture.result.status === 'COMPLETED') {
      res.status(200).json({
        success: true,
        paymentDetails: {
          transactionId: capture.result.purchase_units[0].payments.captures[0].id,
          status: capture.result.status,
          paymentMethod: 'paypal',
        },
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not successful',
      });
    }
  } catch (error) {
    console.error('PayPal capture error:', error);
    res.status(400).json({ message: error.message });
  }
};