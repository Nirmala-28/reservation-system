// trainAvailability.js
const TrainAvailability = require('../models/TrainAvailability');
const Train = require('../models/Train');

// @desc    Get all train availabilities
// @route   GET /api/train-availability
// @access  Public
exports.getTrainAvailabilities = async (req, res) => {
  try {
    const availabilities = await TrainAvailability.find();
    res.status(200).json({
      success: true,
      data: availabilities,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get single train availability
// @route   GET /api/train-availability/:id
// @access  Public
exports.getTrainAvailability = async (req, res) => {
  try {
    const availability = await TrainAvailability.findById(req.params.id);
    
    if (!availability) {
      return res.status(404).json({ message: 'Train availability not found' });
    }

    res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Search trains with Round Robin optimization
// @route   POST /api/trains/search
// @access  Public
exports.searchTrains = async (req, res) => {
  try {
    const { departureStation, arrivalStation, departureDate } = req.body;
    
    let availabilities = await TrainAvailability.find({
      departureStation: new RegExp(departureStation, 'i'),
      arrivalStation: new RegExp(arrivalStation, 'i'),
      departureDate,
    });

    // Apply Round Robin optimization to all results
    availabilities.forEach(availability => {
      availability.updateMetrics();
    });

    res.status(200).json({
      success: true,
      count: availabilities.length,
      data: availabilities,
      algorithm: 'Round Robin',
      message: 'Results optimized using Round Robin algorithm'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Process booking queue with Round Robin
// @route   POST /api/train-availability/:id/process-queue
// @access  Private/Admin
exports.processBookingQueue = async (req, res) => {
  try {
    const availability = await TrainAvailability.findById(req.params.id);
    
    if (!availability) {
      return res.status(404).json({ 
        success: false,
        message: 'Train availability not found' 
      });
    }

    // Process with Round Robin algorithm
    const allocationResult = availability.allocateSlotRoundRobin();
    availability.updateMetrics();
    await availability.save();
    
    res.status(200).json({
      success: true,
      algorithm: 'Round Robin',
      allocationResult: allocationResult,
      metrics: availability.metrics,
      message: 'Queue processed successfully using Round Robin algorithm'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Add booking to queue
// @route   POST /api/train-availability/:id/booking-queue
// @access  Public
exports.addToBookingQueue = async (req, res) => {
  try {
    const availability = await TrainAvailability.findById(req.params.id);
    
    if (!availability) {
      return res.status(404).json({ 
        success: false,
        message: 'Train availability not found' 
      });
    }

    const bookingData = {
      bookingId: req.body.bookingId || `BK${Date.now()}`,
      arrivalTime: new Date(),
      waitTime: 0,
      status: 'waiting'
    };

    availability.bookingQueue.push(bookingData);
    await availability.save();
    
    res.status(200).json({
      success: true,
      message: 'Booking added to Round Robin queue',
      queuePosition: availability.bookingQueue.length,
      booking: bookingData,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get algorithm performance metrics
// @route   GET /api/train-availability/:id/metrics
// @access  Private/Admin
exports.getMetrics = async (req, res) => {
  try {
    const availability = await TrainAvailability.findById(req.params.id);
    
    if (!availability) {
      return res.status(404).json({ 
        success: false,
        message: 'Train availability not found' 
      });
    }

    // Calculate real-time metrics
    availability.updateMetrics();
    await availability.save();
    
    const metrics = {
      ...availability.metrics,
      algorithmType: 'RoundRobin',
      queueLength: availability.bookingQueue.length,
      availableSlots: availability.scheduleSlots.filter(slot => !slot.isAllocated).length,
      totalSlots: availability.scheduleSlots.length,
      slotUtilization: (availability.scheduleSlots.filter(slot => slot.isAllocated).length / availability.scheduleSlots.length) * 100,
      timeQuantum: availability.timeQuantum || 30
    };
    
    res.status(200).json({
      success: true,
      metrics: metrics,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Clean up availability records for deleted train
// @route   DELETE /api/train-availability/cleanup/:trainNumber
// @access  Private/Admin
exports.cleanupByTrainNumber = async (req, res) => {
  try {
    const result = await TrainAvailability.deleteMany({ 
      trainNumber: req.params.trainNumber 
    });

    res.status(200).json({
      success: true,
      message: `Cleaned up ${result.deletedCount} availability records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};