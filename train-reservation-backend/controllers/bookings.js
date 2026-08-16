// bookings.js
const Booking = require('../models/Booking');
const Train = require('../models/Train');
const TrainAvailability = require('../models/TrainAvailability');
const Meal = require('../models/Meal');
const Coupon = require('../models/Coupon');
const generatePNR = require('../utils/generatePNR');
const generateQRCode = require('../utils/generateQRCode');
const SegmentTree = require('../utils/segmentTree');
const PriorityQueue = require('../utils/priorityQueue');
const { dateRange, getOrCreateInventory, reserveSeats, releaseSeats } = require('../utils/travelInventory');

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

    // Availability is date-specific. A schedule's fare option is capacity,
    // while TravelInventory records the remaining seats for each travel date.
    const travelDateRange = dateRange(travelDate);
    const inventory = await getOrCreateInventory(trainAvailability, selectedClass, travelDate);
    let isWaitlistBooking = inventory.availableSeats < passengers.length;

    // -----------------------------------------------------------------
    // ALGORITHM 1: SEGMENT TREE — Partial-Route Seat Availability Check
    // -----------------------------------------------------------------
    // Map the passenger's departure/arrival stations to stop indices.
    // If the train has a stopsList defined (e.g. 4 stops = 3 segments),
    // the Segment Tree verifies the requested segment is free before
    // allowing the booking to proceed. This enables the SAME physical
    // seat to be reused by two passengers on non-overlapping sub-routes.
    // -----------------------------------------------------------------
    let segStartIdx = 0;
    let segEndIdx = 1;
    let assignedSeats = [];
    let segmentTreeResult = 'skipped — no stopsList defined on this schedule';

    const stops = trainAvailability.stopsList || [];
    if (!isWaitlistBooking && stops.length >= 2) {
      // Find index of departure and arrival station in the stops list
      const depIdx = stops.findIndex(s =>
        s.toLowerCase().includes(trainAvailability.departureStation.toLowerCase())
      );
      const arrIdx = stops.findIndex(s =>
        s.toLowerCase().includes(trainAvailability.arrivalStation.toLowerCase())
      );

      // Use found indices or default to full route (0 → stops.length-1)
      segStartIdx = depIdx >= 0 ? depIdx : 0;
      segEndIdx = arrIdx >= 0 ? arrIdx : stops.length - 1;

      // Build a per-class Segment Tree from confirmed bookings on this schedule
      const confirmedBookings = await Booking.find({
        trainAvailability: trainAvailability._id,
        classInfo: classInfo,
        status: { $in: ['Confirmed', 'Pending'] },
        travelDate: { $gte: travelDateRange.start, $lt: travelDateRange.end }
      }).select('segmentInfo passengers').sort({ createdAt: 1 });

      const classCapacity = Number(selectedClass.totalSeats || selectedClass.availableSeats || 0);
      const seatTrees = Array.from(
        { length: classCapacity },
        () => new SegmentTree(stops.length - 1)
      );

      // Mark each confirmed booking's segment as occupied
      confirmedBookings.forEach(b => {
        const { startStopIndex, endStopIndex } = b.segmentInfo || {};
        if (startStopIndex != null && endStopIndex != null && endStopIndex > startStopIndex) {
          b.passengers.forEach(passenger => {
            const parsedSeat = Number(String(passenger.seat || '').split('-').pop());
            const storedSeatIndex = Number.isInteger(parsedSeat) && parsedSeat >= 1 && parsedSeat <= classCapacity
              ? parsedSeat - 1
              : -1;
            const tree = storedSeatIndex >= 0
              ? seatTrees[storedSeatIndex]
              : seatTrees.find(candidate => candidate.isSegmentFree(startStopIndex, endStopIndex));
            if (tree) tree.bookSegment(startStopIndex, endStopIndex);
          });
        }
      });

      const freeSeatIndexes = seatTrees
        .map((tree, index) => tree.isSegmentFree(segStartIdx, segEndIdx) ? index : -1)
        .filter(index => index >= 0);
      const segFree = freeSeatIndexes.length >= passengers.length;
      assignedSeats = freeSeatIndexes
        .slice(0, passengers.length)
        .map(index => `${classInfo}-${index + 1}`);

      if (!segFree) {
        segmentTreeResult = `CONFLICT — segment [${segStartIdx}, ${segEndIdx}] is occupied`;
        console.log(`[Segment Tree] ${segmentTreeResult}`);
        return res.status(400).json({
          success: false,
          message: `No seat available for your route segment (${trainAvailability.departureStation} → ${trainAvailability.arrivalStation}). Another passenger is occupying this seat on your travel segment.`,
          algorithm: 'SegmentTree',
          segmentCheck: segmentTreeResult
        });
      }

      segmentTreeResult = `OK — segment [${segStartIdx}, ${segEndIdx}] is free`;
      console.log(`[Segment Tree] ${segmentTreeResult}`);
    }

    // -----------------------------------------------------------------
    // Calculate priority score for this booking (used by Priority Queue
    // if this passenger ever ends up on a waitlist)
    // Senior citizen (any passenger 60+) gets priority boost
    // -----------------------------------------------------------------
    const isSenior = passengers.some(p => parseInt(p.age) >= 60);
    const priorityScore = isSenior ? 3 : 1;

    // Calculate base fare — strip all non-numeric chars (₹, Rs, commas, spaces) except decimal
    const baseFare = parseFloat(String(selectedClass.price).replace(/[^0-9.]/g, '')) * passengers.length;

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
    const reservationCharges = 40 * passengers.length;
    const superfastCharges = 75 * passengers.length;
    const vatAmount = (baseFare + reservationCharges + superfastCharges) * 0.13;

    let subtotal = baseFare + reservationCharges + superfastCharges + vatAmount + mealTotal;

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

    // Reserve seats only after all validations (including coupon checks) have
    // passed. This conditional update prevents concurrent overselling.
    if (!isWaitlistBooking) {
      const reservedInventory = await reserveSeats(
        trainAvailability,
        selectedClass,
        travelDate,
        passengers.length
      );
      isWaitlistBooking = !reservedInventory;
    }

    // Generate PNR
    const pnr = generatePNR();

    let waitlistPosition = null;
    if (isWaitlistBooking) {
      const waitlistStats = await Booking.aggregate([
        {
          $match: {
            trainAvailability: trainAvailability._id,
            classInfo,
            status: 'Waiting',
            travelDate: { $gte: travelDateRange.start, $lt: travelDateRange.end },
          },
        },
        { $project: { passengerCount: { $size: '$passengers' } } },
        { $group: { _id: null, passengers: { $sum: '$passengerCount' }, bookings: { $sum: 1 } } },
      ]);
      const waitingPassengers = waitlistStats[0]?.passengers || 0;
      const maxWaitlist = Number(selectedClass.waitingList || selectedClass.totalSeats || 0);
      if (waitingPassengers + passengers.length > maxWaitlist) {
        return res.status(400).json({
          success: false,
          message: `Waitlist is full for ${classInfo}`,
        });
      }
      waitlistPosition = waitingPassengers + 1;
    }

    // Create booking
    const booking = new Booking({
      user: req.user._id,
      train: train._id,
      trainAvailability: trainAvailability._id,
      pnr,
      classInfo,
      priorityScore,
      waitlistPosition,
      segmentInfo: { startStopIndex: segStartIdx, endStopIndex: segEndIdx },
      passengers: passengers.map((p, index) => ({
        name: p.name,
        age: parseInt(p.age),
        gender: p.gender,
        seat: assignedSeats[index] || p.seat || '',
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
      status: isWaitlistBooking ? 'Waiting' : 'Pending',
      algorithmLog: [
        {
          algorithm: 'SegmentTree',
          action: 'seat_check',
          result: segmentTreeResult,
        },
        ...(isWaitlistBooking ? [{
          algorithm: 'PriorityQueue',
          action: 'waitlisted',
          result: `Added to waitlist at position ${waitlistPosition}. Priority score: ${priorityScore}.`,
        }] : [])
      ]
    });


    try {
      await booking.save();
    } catch (error) {
      // Do not leave a reserved seat behind if persistence fails (for example,
      // a duplicate PNR or database validation error).
      if (!isWaitlistBooking) {
        await releaseSeats(trainAvailability, classInfo, travelDate, passengers.length);
      }
      throw error;
    }

    // Waitlisted passengers do not occupy a seat or enter the allocation
    // queue. They are promoted by the Priority Queue when a seat is freed.
    if (isWaitlistBooking) {
      return res.status(201).json({
        success: true,
        booking: booking._id,
        totalAmount: totalAmount.toFixed(2),
        pnr,
        waitlistPosition,
        algorithms: {
          priorityQueue: `Added to waitlist at position ${waitlistPosition}`,
        },
        message: `Added to waitlist at position ${waitlistPosition}`
      });
    }

    // Apply Round Robin algorithm for booking queue
    const bookingData = {
      bookingId: booking._id.toString(),
      arrivalTime: new Date(),
      waitTime: 0,
      status: 'waiting'
    };

    trainAvailability.bookingQueue.push(bookingData);

    // Record fair request processing separately from seat availability.
    const allocationResult = trainAvailability.allocateSlotRoundRobin();
    const processedBookings = trainAvailability.processBookingsRoundRobin();
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
    // Push Round Robin log entry
    booking.algorithmLog.push({
      algorithm: 'RoundRobin',
      action: 'slot_allocated',
      result: allocationResult.success
        ? `Slot ${allocationResult.allocatedSlot?.slotId} allocated (quantum=${allocationResult.timeQuantum}min)`
        : 'No free slot available',
    });

    // Save the algorithm data directly to the booking document
    booking.roundRobinData = {
      queuePosition: trainAvailability.bookingQueue.length,
      allocationTime: allocationResult.allocatedSlot?.allocationTime || new Date(),
      waitTime: allocationResult.timeQuantum || 0,
      timeSlotAllocated: allocationResult.allocatedSlot?.timeSlot || 'Standard'
    };

    booking.status = 'Confirmed';
    await booking.save();

    console.log('[Round Robin] Booking confirmed:', {
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
      algorithms: {
        segmentTree: segmentTreeResult,
        roundRobin: { ...allocationResult, processedBookings },
      },
      message: 'Booking confirmed — verified by Segment Tree + allocated via Round Robin'
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

    const releasedConfirmedSeat = ['Confirmed', 'Pending'].includes(booking.status);

    // Update booking status
    booking.status = 'Cancelled';
    await booking.save();

    let availabilityToUpdate = null;

    // Restore seat availability
    if (releasedConfirmedSeat && booking.trainAvailability) {
      availabilityToUpdate = await TrainAvailability.findById(booking.trainAvailability._id || booking.trainAvailability);
      if (availabilityToUpdate) await releaseSeats(
        availabilityToUpdate,
        booking.classInfo,
        booking.travelDate,
        booking.passengers.length
      );
    }

    // -----------------------------------------------------------------
    // ALGORITHM 2: PRIORITY QUEUE — Waitlist Auto-Promotion
    // -----------------------------------------------------------------
    // When a seat frees up, find all bookings with status='Waiting'
    // for the same train schedule + class. Load them into a Max-Heap
    // Priority Queue ordered by priorityScore (desc) then bookingDate
    // (FIFO). Promote the top passenger automatically to 'Confirmed'.
    // -----------------------------------------------------------------
    const cancelledTravelDate = dateRange(booking.travelDate);
    const waitlistedBookings = releasedConfirmedSeat
      ? await Booking.find({
          trainAvailability: booking.trainAvailability._id || booking.trainAvailability,
          classInfo: booking.classInfo,
          status: 'Waiting',
          travelDate: { $gte: cancelledTravelDate.start, $lt: cancelledTravelDate.end }
        }).sort({ createdAt: 1 }) // pre-sort FIFO as tiebreaker baseline
      : [];

    let promotedBooking = null;
    let priorityQueueResult = 'no waitlisted passengers';

    if (waitlistedBookings.length > 0) {
      const pq = new PriorityQueue();

      // Enqueue each waiting booking with its priority score + booking timestamp
      waitlistedBookings.forEach(wb => {
        pq.enqueue(
          wb._id.toString(),
          wb.priorityScore || 1,
          new Date(wb.createdAt).getTime()
        );
      });

      console.log(`[Priority Queue] Heap built with ${pq.size()} waiting passengers`);

      // Dequeue = highest priority passenger gets the freed seat
      const topBookingId = pq.dequeue();
      promotedBooking = await Booking.findById(topBookingId);

      const promotedClass = availabilityToUpdate?.fareOptions.find(
        option => option.class === promotedBooking?.classInfo
      );

      const promotedReservation = promotedBooking && promotedClass
        ? await reserveSeats(availabilityToUpdate, promotedClass, promotedBooking.travelDate, promotedBooking.passengers.length)
        : null;

      if (promotedBooking && promotedReservation) {
        promotedBooking.status = 'Confirmed';
        promotedBooking.waitlistPosition = null;
        promotedBooking.algorithmLog = promotedBooking.algorithmLog || [];
        promotedBooking.algorithmLog.push({
          algorithm: 'PriorityQueue',
          action: 'promoted',
          result: `Promoted from Waiting → Confirmed. Priority score: ${promotedBooking.priorityScore}. Queue had ${waitlistedBookings.length} passengers.`,
        });
        await promotedBooking.save();

        priorityQueueResult = `Promoted booking ${topBookingId} (priorityScore=${promotedBooking.priorityScore}, PNR=${promotedBooking.pnr}) from Waiting → Confirmed`;
        console.log(`[Priority Queue] ${priorityQueueResult}`);
      }
    }

    // Log Priority Queue run on the cancelled booking too
    booking.algorithmLog = booking.algorithmLog || [];
    booking.algorithmLog.push({
      algorithm: 'PriorityQueue',
      action: 'waitlist_check',
      result: priorityQueueResult,
    });
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking,
      algorithms: {
        priorityQueue: {
          result: priorityQueueResult,
          promoted: promotedBooking ? {
            bookingId: promotedBooking._id,
            pnr: promotedBooking.pnr,
            priorityScore: promotedBooking.priorityScore,
          } : null,
          waitlistSize: waitlistedBookings.length,
        }
      },
      message2: promotedBooking
        ? `Seat freed and auto-assigned to next passenger (PNR: ${promotedBooking.pnr}) via Priority Queue`
        : 'Seat freed — no waitlisted passengers to promote'
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
