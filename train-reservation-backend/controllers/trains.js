// trains.js
const Train = require('../models/Train');

// @desc    Get all trains (basic info)
// @route   GET /api/trains
// @access  Public
exports.getTrains = async (req, res) => {
  try {
    const trains = await Train.find();
    res.status(200).json({
      success: true,
      data: trains,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get single train
// @route   GET /api/trains/:id
// @access  Public
exports.getTrain = async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);
    
    if (!train) {
      return res.status(404).json({ message: 'Train not found' });
    }

    res.status(200).json({
      success: true,
      data: train,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Create new train
// @route   POST /api/admin/trains
// @access  Private/Admin
exports.createTrain = async (req, res) => {
  try {
    const train = await Train.create(req.body);
    res.status(201).json({
      success: true,
      data: train,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Update train
// @route   PUT /api/admin/trains/:id
// @access  Private/Admin
exports.updateTrain = async (req, res) => {
  try {
    const train = await Train.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!train) {
      return res.status(404).json({ message: 'Train not found' });
    }

    res.status(200).json({
      success: true,
      data: train,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Delete train
// @route   DELETE /api/admin/trains/:id
// @access  Private/Admin
exports.deleteTrain = async (req, res) => {
  try {
    const train = await Train.findByIdAndDelete(req.params.id);

    if (!train) {
      return res.status(404).json({ message: 'Train not found' });
    }

    // Note: TrainAvailability cleanup is handled in the availability controller
    // to avoid circular dependencies

    res.status(200).json({
      success: true,
      message: 'Train deleted successfully',
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};