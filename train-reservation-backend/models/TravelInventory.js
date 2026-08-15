const mongoose = require('mongoose');

// Inventory belongs to one schedule, travel date, and fare class. Keeping it
// separate from TrainAvailability prevents one day's bookings from changing
// availability shown for another day.
const travelInventorySchema = new mongoose.Schema({
  trainAvailability: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainAvailability',
    required: true,
  },
  travelDate: {
    type: String, // YYYY-MM-DD in the railway's local service date
    required: true,
  },
  classInfo: {
    type: String,
    required: true,
  },
  totalSeats: {
    type: Number,
    required: true,
  },
  availableSeats: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

travelInventorySchema.index(
  { trainAvailability: 1, travelDate: 1, classInfo: 1 },
  { unique: true }
);

module.exports = mongoose.model('TravelInventory', travelInventorySchema);
