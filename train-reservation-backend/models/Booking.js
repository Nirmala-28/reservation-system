// Booking.js
const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other']
  },
  seat: {
    type: String,
    default: ''
  },
  berthPreference: {
    type: String,
    enum: ['No Preference', 'Lower', 'Middle', 'Upper', 'Side'],
    default: 'No Preference'
  }
});

const paymentBreakdownSchema = new mongoose.Schema({
  label: String,
  amount: String,
});

const contactInfoSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  }
});

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  train: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Train',
    required: true,
  },
  trainAvailability: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainAvailability',
    required: true,
  },
  pnr: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Waiting', 'Cancelled'],
    default: 'Pending',
  },
  classInfo: {
    type: String,
    required: true
  },
  passengers: [passengerSchema],
  meals: [{
    meal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  contactInfo: contactInfoSchema,
  paymentDetails: {
    transactionId: String,
    paymentMethod: {
      type: String,
      enum: ['stripe', 'paypal'],
      required: true
    },
    breakdown: [paymentBreakdownSchema],
    total: {
      type: Number,
      required: true
    },
    discount: {
      couponCode: String,
      discountAmount: {
        type: Number,
        default: 0
      }
    },
    paypalDetails: {
      orderID: String,
      captureID: String,
      status: String
    },
    stripeDetails: {
      paymentIntent: String,
      status: String
    }
  },
  bookingDate: {
    type: Date,
    default: Date.now,
  },
  travelDate: {
    type: Date,
    required: true
  },
  qrCode: String,
  
  // Round Robin algorithm tracking
  roundRobinData: {
    queuePosition: Number,
    allocationTime: Date,
    waitTime: Number,
    timeSlotAllocated: String
  }
}, {
  timestamps: true
});

// Index for faster PNR lookups
bookingSchema.index({ pnr: 1 });
bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);