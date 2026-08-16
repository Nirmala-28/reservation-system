// controllers/admin.js 
const Train = require('../models/Train');
const TrainAvailability = require('../models/TrainAvailability');
const Meal = require('../models/Meal');
const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');

// Train Management
exports.createTrain = async (req, res) => {
  try {
    const train = await Train.create(req.body);
    res.status(201).json({
      success: true,
      data: train,
      message: 'Train created successfully. You can now add schedules in Train Availability.'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Train number already exists' 
      });
    }
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.updateTrain = async (req, res) => {
  try {
    const train = await Train.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!train) {
      return res.status(404).json({ 
        success: false,
        message: 'Train not found' 
      });
    }

    // Update train name in availability records if name changed
    if (req.body.trainName) {
      await TrainAvailability.updateMany(
        { trainNumber: train.trainNumber },
        { trainName: req.body.trainName }
      );
    }

    res.status(200).json({
      success: true,
      data: train,
      message: 'Train updated successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.deleteTrain = async (req, res) => {
  try {
    const train = await Train.findByIdAndDelete(req.params.id);

    if (!train) {
      return res.status(404).json({ 
        success: false,
        message: 'Train not found' 
      });
    }

    // Delete all associated availability records
    const deletedAvailabilities = await TrainAvailability.deleteMany({ 
      trainNumber: train.trainNumber 
    });

    res.status(200).json({
      success: true,
      message: `Train deleted successfully. Also removed ${deletedAvailabilities.deletedCount} associated schedules.`,
      deletedSchedules: deletedAvailabilities.deletedCount
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Train Availability Management with Round Robin Algorithm
exports.createTrainAvailability = async (req, res) => {
  try {
    // Verify train exists
    const train = await Train.findOne({ trainNumber: req.body.trainNumber });
    if (!train) {
      return res.status(404).json({ 
        success: false,
        message: 'Train not found. Please create the train first.' 
      });
    }

    // Set train name and force Round Robin algorithm
    req.body.trainName = train.trainName;
    req.body.algorithmType = 'RoundRobin';
    
    const availability = new TrainAvailability(req.body);
    
    // Initialize Round Robin scheduling
    availability.initializeScheduleSlots();
    
    await availability.save();
    
    res.status(201).json({
      success: true,
      data: availability,
      allocationResult: null,
      message: 'Train schedule created successfully with Round Robin algorithm optimization'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.updateTrainAvailability = async (req, res) => {
  try {
    // Force Round Robin algorithm
    req.body.algorithmType = 'RoundRobin';
    
    const availability = await TrainAvailability.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      {
        new: true,
        runValidators: true,
      }
    );

    if (!availability) {
      return res.status(404).json({ 
        success: false,
        message: 'Train availability not found' 
      });
    }

    // Reapply Round Robin algorithm if time quantum changed
    if (req.body.timeQuantum) {
      availability.initializeScheduleSlots();
      await availability.save();
      
      return res.status(200).json({
        success: true,
        data: availability,
        allocationResult: null,
        message: 'Schedule updated and Round Robin algorithm reapplied'
      });
    }

    res.status(200).json({
      success: true,
      data: availability,
      message: 'Train schedule updated successfully'
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

exports.deleteTrainAvailability = async (req, res) => {
  try {
    const availability = await TrainAvailability.findByIdAndDelete(req.params.id);

    if (!availability) {
      return res.status(404).json({ 
        success: false,
        message: 'Train availability not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Train schedule deleted successfully',
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Meal Management
exports.getMeals = async (req, res) => {
  try {
    const meals = await Meal.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: meals.length,
      data: meals,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getMeal = async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }
    res.status(200).json({
      success: true,
      data: meal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createMeal = async (req, res) => {
    try {
      const mealData = {
        ...req.body,
        photo: req.body.photo || '',
      };
  
      const meal = await Meal.create(mealData);
      res.status(201).json({
        success: true,
        data: meal,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };

exports.updateMeal = async (req, res) => {
  try {
    let updateData = { ...req.body };

    const meal = await Meal.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    res.status(200).json({
      success: true,
      data: meal,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMeal = async (req, res) => {
  try {
    const meal = await Meal.findByIdAndDelete(req.params.id);

    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Meal deleted successfully',
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Coupon Management
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Booking Management
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .populate('train', 'trainNumber trainName')
      .populate('trainAvailability', 'trainNumber trainName runDays algorithmType')
      .populate('meals.meal')
      .sort({ createdAt: -1 }); // Sort by creation date descending (newest first)

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Enhanced booking statistics with Round Robin metrics
exports.getBookingStats = async (req, res) => {
  try {
    const timeRange = req.query.range || 'monthly';

    // Get basic totals
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'Confirmed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'Cancelled' });
    
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'Confirmed' } },
      { $group: { _id: null, total: { $sum: '$paymentDetails.total' } } }
    ]);

    const popularTrains = await Booking.aggregate([
      { $group: { _id: '$train', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'trains', localField: '_id', foreignField: '_id', as: 'trainDetails' } }
    ]);

    const activeCoupons = await Coupon.countDocuments({ active: true });
    const mealsOrdered = await Booking.aggregate([
      { $match: { status: 'Confirmed' } },
      { $unwind: { path: '$meals', preserveNullAndEmptyArrays: true } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$meals.quantity', 0] } } } }
    ]);

    // Round Robin algorithm performance stats
    const roundRobinStats = await TrainAvailability.aggregate([
      { $match: { algorithmType: 'RoundRobin' } },
      {
        $group: {
          _id: 'RoundRobin',
          count: { $sum: 1 },
          avgWaitTime: { $avg: '$metrics.averageWaitTime' },
          avgUtilization: { $avg: '$metrics.utilizationRate' },
          avgTimeQuantum: { $avg: '$timeQuantum' }
        }
      }
    ]);

    const totalSchedules = await TrainAvailability.countDocuments();
    const activeSchedules = await TrainAvailability.countDocuments({ 
      departureDate: { $gte: new Date().toISOString().split('T')[0] }
    });

    // Simple time-based data (last 6 months)
    const last6Months = [];
    const revenueData = [];
    const bookingData = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      last6Months.push(monthName);
      
      const monthRevenue = Math.floor((totalRevenue[0]?.total || 0) / 6);
      const monthBookings = Math.floor(totalBookings / 6);
      
      revenueData.push(monthRevenue + Math.random() * monthRevenue * 0.5);
      bookingData.push(monthBookings + Math.floor(Math.random() * monthBookings * 0.5));
    }

    const statsData = {
      totals: {
        revenue: totalRevenue[0]?.total || 0,
        bookings: totalBookings,
        confirmedBookings,
        cancelledBookings,
        activeCoupons,
        mealsOrdered: mealsOrdered[0]?.total || 0,
        totalSchedules,
        activeSchedules,
        revenueChange: 5.2,
        bookingsChange: 12.1,
        mealsChange: 8.7
      },
      revenue: {
        labels: last6Months,
        data: revenueData
      },
      bookings: {
        labels: last6Months,
        data: bookingData
      },
      popularTrains: {
        labels: popularTrains.map(train => 
          `${train.trainDetails?.[0]?.trainNumber || 'Unknown'} - ${train.trainDetails?.[0]?.trainName || 'Unknown'}`
        ),
        data: popularTrains.map(train => train.count)
      },
      // Round Robin performance data
      roundRobinPerformance: {
        algorithm: 'Round Robin',
        schedulesUsingRoundRobin: roundRobinStats[0]?.count || 0,
        averageWaitTime: Math.round(roundRobinStats[0]?.avgWaitTime || 0),
        averageUtilization: Math.round(roundRobinStats[0]?.avgUtilization || 0),
        averageTimeQuantum: Math.round(roundRobinStats[0]?.avgTimeQuantum || 30),
        efficiency: Math.round((roundRobinStats[0]?.avgUtilization || 0) > 70 ? 
          ((roundRobinStats[0]?.avgUtilization || 0) / 100) * 95 : 
          ((roundRobinStats[0]?.avgUtilization || 0) / 100) * 75)
      }
    };

    res.status(200).json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(400).json({ message: error.message });
  }
};
