// bookings.js
const Booking = require('../models/Booking');
const Train = require('../models/Train');
const TrainAvailability = require('../models/TrainAvailability');
const Meal = require('../models/Meal');
const Coupon = require('../models/Coupon');
const generatePNR = require('../utils/generatePNR');
const generateQRCode = require('../utils/generateQRCode');

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    const {
      trainId,
      classInfo,
      passengers,
      mealSelections,
      couponCode,
      travelDate,
      paymentDetails,
      contactInfo
    } = req.body;

    console.log('Booking request received:', {
      trainId,
      classInfo,
      passengers: passengers?.length,
      mealSelections: mealSelections?.length,
      couponCode,
      travelDate
    });

    // Find train availability record (not basic train)
    const trainAvailability = await TrainAvailability.findById(trainId);
    if (!trainAvailability) {
      return res.status(404).json({ 
        success: false,
        message: 'Train availability not found' 
      });
    }

    // Find the basic train info
    const train = await Train.findOne({ trainNumber: trainAvailability.trainNumber });
    if (!train) {
      return res.status(404).json({ 
        success: false,
        message: 'Train not found' 
      });
    }

    // Check if selected class is available
    const selectedClass = trainAvailability.fareOptions.find(option => option.class === classInfo);
    if (!selectedClass) {
      return res.status(400).json({ 
        success: false,
        message: 'Selected class not available' 
      });
    }

    // Check seat availability
    if (selectedClass.availableSeats < passengers.length) {
      return res.status(400).json({ 
        success: false,
        message: `Only ${selectedClass.availableSeats} seats available in ${classInfo}` 
      });
    }

    // Calculate base fare
    const baseFare = parseFloat(selectedClass.price.replace(/[Rs.,\s]/g, '')) * passengers.length;
    
    // Calculate meal prices
    let mealTotal = 0;
    const meals = [];
    
    if (mealSelections && mealSelections.length > 0) {
      for (const selection of mealSelections) {
        const meal = await Meal.findById(selection.mealId);
        if (meal) {
          mealTotal += meal.price * selection.quantity;
          meals.push({
            meal: meal._id,
            quantity: selection.quantity,
          });
        }
      }
    }

    // Calculate charges
    const reservationCharges = 40;
    const superfastCharges = 75;
    const gstAmount = (baseFare + reservationCharges + superfastCharges) * 0.05;
    
    let subtotal = baseFare + reservationCharges + superfastCharges + gstAmount + mealTotal;
    
    // Apply coupon if provided
    let discountAmount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, active: true });
      if (coupon) {
        // Check if coupon is valid
        if (coupon.validTo && new Date(coupon.validTo) < new Date()) {
          return res.status(400).json({ 
            success: false,
            message: 'Coupon has expired' 
          });
        }
        
        if (coupon.usedCount >= coupon.usageLimit) {
          return res.status(400).json({ 
            success: false,
            message: 'Coupon usage limit exceeded' 
          });
        }
        
        if (subtotal < coupon.minOrderValue) {
          return res.status(400).json({ 
            success: false,
            message: `Minimum order value for this coupon is Rs.${coupon.minOrderValue}` 
          });
        }
        
        if (coupon.discountType === 'percentage') {
          discountAmount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
          }
        } else {
          discountAmount = coupon.discountValue;
        }
        
        // Update coupon usage
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const totalAmount = subtotal - discountAmount;

    // Generate PNR
    const pnr = generatePNR();

    // Create booking
    const booking = new Booking({
      user: req.user._id,
      train: train._id,
      trainAvailability: trainAvailability._id,
      pnr,
      classInfo,
      passengers: passengers.map(p => ({
        name: p.name,
        age: parseInt(p.age),
        gender: p.gender,
        seat: p.seat || '',
        berthPreference: p.berthPreference || 'No Preference'
      })),
      meals,
      paymentDetails: {
        paymentMethod: paymentDetails.paymentMethod,
        transactionId: paymentDetails.transactionId,
        breakdown: paymentDetails.breakdown,
        total: totalAmount,
        discount: {
          couponCode: couponCode || '',
          discountAmount: discountAmount
        }
      },
      travelDate: new Date(travelDate),
      contactInfo: contactInfo,
      status: 'Pending'
    });

    await booking.save();

    // Update seat availability (reduce available seats)
    selectedClass.availableSeats -= passengers.length;
    await trainAvailability.save();

    // Apply Round Robin algorithm for booking queue
    const bookingData = {
      bookingId: booking._id.toString(),
      arrivalTime: new Date(),
      waitTime: 0,
      status: 'waiting'
    };

    trainAvailability.bookingQueue.push(bookingData);
    
    // Process with Round Robin algorithm
    const allocationResult = trainAvailability.allocateSlotRoundRobin();
    trainAvailability.updateMetrics();
    await trainAvailability.save();

    // Generate QR code
    const qrData = {
      pnr,
      trainNumber: trainAvailability.trainNumber,
      trainName: trainAvailability.trainName,
      date: travelDate,
      passenger: passengers[0].name,
      class: classInfo,
    };
    
    const qrCode = await generateQRCode(qrData);
    booking.qrCode = qrCode;
    booking.status = 'Confirmed';
    await booking.save();

    console.log('Booking created successfully:', {
      bookingId: booking._id,
      pnr,
      totalAmount,
      roundRobinResult: allocationResult
    });

    res.status(201).json({
      success: true,
      booking: booking._id,
      totalAmount: totalAmount.toFixed(2),
      pnr,
      qrCode,
      roundRobinAllocation: allocationResult,
      message: 'Booking created successfully with Round Robin optimization'
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('train')
      .populate('trainAvailability')
      .populate('meals.meal')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('train')
      .populate('trainAvailability')
      .populate('meals.meal');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to access this booking' 
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('trainAvailability');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to cancel this booking' 
      });
    }

    // Check if booking can be cancelled
    if (booking.status === 'Cancelled') {
      return res.status(400).json({ 
        success: false,
        message: 'Booking is already cancelled' 
      });
    }

    // Update booking status
    booking.status = 'Cancelled';
    await booking.save();

    // Restore seat availability
    if (booking.trainAvailability) {
      const trainAvailability = await TrainAvailability.findById(booking.trainAvailability._id);
      if (trainAvailability) {
        const classOption = trainAvailability.fareOptions.find(option => option.class === booking.classInfo);
        if (classOption) {
          classOption.availableSeats += booking.passengers.length;
          await trainAvailability.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Update booking payment status
// @route   PUT /api/bookings/:id/payment
// @access  Private
exports.updateBookingPayment = async (req, res) => {
  try {
    const { transactionId, status, paymentStatus } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    // Check if user owns this booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this booking' 
      });
    }

    // Update payment details
    booking.paymentDetails.transactionId = transactionId;
    booking.status = status || booking.status;
    
    if (paymentStatus) {
      booking.paymentDetails.status = paymentStatus;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: booking
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};

// @desc    Get booking by PNR
// @route   GET /api/bookings/pnr/:pnr
// @access  Public
exports.getBookingByPNR = async (req, res) => {
  try {
    const booking = await Booking.findOne({ pnr: req.params.pnr })
      .populate('train')
      .populate('trainAvailability')
      .populate('meals.meal');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found with this PNR' 
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: error.message 
    });
  }
};