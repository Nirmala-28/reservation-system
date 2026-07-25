// TrainAvailability.js
const mongoose = require('mongoose');

const fareOptionSchema = new mongoose.Schema({
  class: String,
  price: String,
  totalSeats: Number,
  availableSeats: Number,
  waitingList: Number,
  color: String,
});

const scheduleSlotSchema = new mongoose.Schema({
  slotId: String,
  timeSlot: String,
  isAllocated: Boolean,
  allocationTime: Date
});

const trainAvailabilitySchema = new mongoose.Schema({
  trainNumber: {
    type: String,
    required: true,
    ref: 'Train'
  },
  trainName: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
  },
  departureTime: String,
  departureStation: String,
  departureDate: String,
  arrivalTime: String,
  arrivalStation: String,
  arrivalDate: String,
  duration: String,
  runDays: String,
  fareOptions: [fareOptionSchema],
  
  // Round Robin Algorithm fields
  scheduleSlots: [scheduleSlotSchema],
  currentSlotIndex: {
    type: Number,
    default: 0
  },
  algorithmType: {
    type: String,
    default: 'RoundRobin',
    enum: ['RoundRobin']  // Only Round Robin allowed
  },
  timeQuantum: {
    type: Number,
    default: 30 // minutes - time slice for Round Robin
  },
  
  // Resource allocation
  resourceAllocation: {
    engineCapacity: Number,
    platformAllocation: String,
    crewAssignment: [String],
    lastAllocationTime: Date
  },
  
  // Queue management
  bookingQueue: [{
    bookingId: String,
    arrivalTime: Date,
    waitTime: Number,
    status: {
      type: String,
      enum: ['waiting', 'processing', 'confirmed', 'cancelled'],
      default: 'waiting'
    }
  }],
  
  // Performance metrics
  metrics: {
    averageWaitTime: Number,
    throughput: Number,
    utilizationRate: Number,
    lastUpdated: Date
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Round Robin Algorithm Implementation
trainAvailabilitySchema.methods.allocateSlotRoundRobin = function() {
  if (this.scheduleSlots.length === 0) {
    this.initializeScheduleSlots();
  }
  
  const totalSlots = this.scheduleSlots.length;
  let allocated = false;
  let attempts = 0;
  
  while (!allocated && attempts < totalSlots) {
    const currentSlot = this.scheduleSlots[this.currentSlotIndex];
    
    if (!currentSlot.isAllocated) {
      currentSlot.isAllocated = true;
      currentSlot.allocationTime = new Date();
      allocated = true;
      
      // Move to next slot (circular)
      this.currentSlotIndex = (this.currentSlotIndex + 1) % totalSlots;
      
      return {
        success: true,
        allocatedSlot: currentSlot,
        nextSlotIndex: this.currentSlotIndex,
        algorithm: 'Round Robin',
        timeQuantum: this.timeQuantum
      };
    }
    
    // Move to next slot
    this.currentSlotIndex = (this.currentSlotIndex + 1) % totalSlots;
    attempts++;
  }
  
  return {
    success: false,
    message: 'No available slots',
    algorithm: 'Round Robin'
  };
};

// Initialize schedule slots for Round Robin
trainAvailabilitySchema.methods.initializeScheduleSlots = function() {
  const slots = [];
  const baseTime = new Date(`${this.departureDate} ${this.departureTime}`);
  
  // Create time slots based on time quantum
  const slotCount = Math.floor(24 * 60 / this.timeQuantum); // Number of slots in 24 hours
  
  for (let i = 0; i < slotCount; i++) {
    const slotTime = new Date(baseTime.getTime() + (i * this.timeQuantum * 60 * 1000));
    slots.push({
      slotId: `rr_slot_${i}`,
      timeSlot: slotTime.toLocaleTimeString(),
      isAllocated: false,
      allocationTime: null
    });
  }
  
  this.scheduleSlots = slots;
  console.log(`Initialized ${slots.length} Round Robin slots with ${this.timeQuantum}min quantum`);
};

// Process bookings using Round Robin
trainAvailabilitySchema.methods.processBookingsRoundRobin = function() {
  const processedBookings = [];
  let currentTime = new Date();
  
  // Process each booking in queue with time quantum
  this.bookingQueue.forEach((booking, index) => {
    if (booking.status === 'waiting') {
      booking.status = 'processing';
      booking.waitTime = currentTime - new Date(booking.arrivalTime);
      
      // Each booking gets exactly timeQuantum minutes
      currentTime = new Date(currentTime.getTime() + (this.timeQuantum * 60 * 1000));
      
      booking.status = 'confirmed';
      processedBookings.push({
        ...booking,
        processedAt: currentTime,
        timeSlice: this.timeQuantum
      });
    }
  });
  
  return processedBookings;
};

// Update performance metrics
trainAvailabilitySchema.methods.updateMetrics = function() {
  const confirmedBookings = this.bookingQueue.filter(b => b.status === 'confirmed');
  const totalWaitTime = this.bookingQueue.reduce((sum, b) => sum + (b.waitTime || 0), 0);
  const allocatedSlots = this.scheduleSlots.filter(slot => slot.isAllocated).length;
  
  this.metrics = {
    averageWaitTime: this.bookingQueue.length > 0 ? totalWaitTime / this.bookingQueue.length : 0,
    throughput: confirmedBookings.length,
    utilizationRate: this.scheduleSlots.length > 0 ? (allocatedSlots / this.scheduleSlots.length) * 100 : 0,
    lastUpdated: new Date()
  };
  
  console.log(`Round Robin Metrics Updated: 
    - Avg Wait Time: ${Math.round(this.metrics.averageWaitTime)}min
    - Throughput: ${this.metrics.throughput} bookings
    - Utilization: ${Math.round(this.metrics.utilizationRate)}%`);
};

// Get Round Robin algorithm info
trainAvailabilitySchema.methods.getAlgorithmInfo = function() {
  return {
    name: 'Round Robin',
    description: 'Fair time slot allocation with equal time quantum',
    timeQuantum: this.timeQuantum,
    advantages: ['Fair allocation', 'No starvation', 'Good for time-sharing'],
    complexity: 'O(n)',
    currentSlotIndex: this.currentSlotIndex,
    totalSlots: this.scheduleSlots.length
  };
};

// Reset Round Robin state
trainAvailabilitySchema.methods.resetRoundRobin = function() {
  this.currentSlotIndex = 0;
  this.scheduleSlots.forEach(slot => {
    slot.isAllocated = false;
    slot.allocationTime = null;
  });
  this.bookingQueue = [];
  console.log('Round Robin state reset');
};

module.exports = mongoose.model('TrainAvailability', trainAvailabilitySchema);