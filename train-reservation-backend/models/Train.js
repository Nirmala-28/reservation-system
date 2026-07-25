// Train.js
const mongoose = require('mongoose');

const trainSchema = new mongoose.Schema({
  trainNumber: {
    type: String,
    required: true,
    unique: true,
  },
  trainName: {
    type: String,
    required: true,
  },
  trainType: {
    type: String,
    enum: ['Express', 'Superfast', 'Local', 'Shatabdi', 'Rajdhani'],
    default: 'Express'
  },
  totalCapacity: {
    type: Number,
    required: true,
    default: 1000
  },
  facilities: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Train', trainSchema);