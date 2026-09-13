// bookings.js
const Booking = require('../models/Booking');
const Train = require('../models/Train');
const TrainAvailability = require('../models/TrainAvailability');
const Meal = require('../models/Meal');
const Coupon = require('../models/Coupon');
const generatePNR = require('../utils/generatePNR');
const generateQRCode = require('../utils/generateQRCode');
const sendEmail = require('../utils/sendEmail');
const SegmentTree = require('../utils/segmentTree');
const PriorityQueue = require('../utils/priorityQueue');
const { dateRange, getOrCreateInventory, reserveSeats, releaseSeats } = require('../utils/travelInventory');
const { trainAvailabilityCache } = require('../utils/cache');

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

    // Idempotency guard: a slow response or an impatient double-click on
    // "Proceed to Payment" can fire this request twice before the first
    // one navigates the user away. If we already created an unpaid booking
    // for this exact user/train/class/date in the last minute, hand that
    // one back instead of reserving a second set of seats for it.
    const duplicateWindowStart = new Date(Date.now() - 60 * 1000);
    const recentDuplicate = await Booking.findOne({
      user: req.user._id,
      trainAvailability: trainAvailability._id,
      classInfo,
      travelDate: new Date(travelDate),
      status: { $in: ['Pending', 'Waiting'] },
      'paymentDetails.transactionId': { $regex: '^PENDING_' },
      createdAt: { $gte: duplicateWindowStart }
    }).sort({ createdAt: -1 });

    if (recentDuplicate) {
      console.log('[Booking] Duplicate submission detected, returning existing booking:', recentDuplicate.pnr);
      return res.status(201).json({
        success: true,
        booking: recentDuplicate._id,
        totalAmount: recentDuplicate.paymentDetails.total.toFixed(2),
        pnr: recentDuplicate.pnr,
        waitlistPosition: recentDuplicate.waitlistPosition,
        duplicate: true,
        message: recentDuplicate.status === 'Waiting'
          ? `Added to waitlist at position ${recentDuplicate.waitlistPosition}`
          : 'Booking already reserved — resuming existing booking'
      });
    }

    // Availability is date-specific. A schedule's fare option is capacity,
    // while TravelInventory records the remaining seats for each travel date.
    const travelDateRange = dateRange(travelDate);
    const inventory = await getOrCreateInventory(trainAvailability, selectedClass, travelDate);
    // Use frontend's waitlist flag if provided, otherwise determine from inventory
    let isWaitlistBooking = req.body.isWaitlist || inventory.availableSeats < passengers.length;

    // -----------------------------------------------------------------
    // ALGORITHM 1: SEGMENT TREE — Partial-Route Seat Availability Check
    // -----------------------------------------------------------------
    // Map the passenger's departure/arrival stations to stop indices.
    // If the train has a stopsList defined (e.g. 4 stops = 3 segments),
    // the Segment Tree verifies the requested segment is free before
    // allowing the booking to proceed. This enables the SAME physical
    // seat to be reused by two passengers on non-overlapping sub-routes.
    // Time Complexity: O(log N) per query/update with lazy propagation
    // Space Complexity: O(4N) where N is number of segments
    // -----------------------------------------------------------------
    const segmentTreeStartTime = Date.now();
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
        const segmentTreeExecutionTime = Date.now() - segmentTreeStartTime;
        segmentTreeResult = `CONFLICT — segment [${segStartIdx}, ${segEndIdx}] is occupied`;
        console.log(`[Segment Tree] ${segmentTreeResult} (Execution: ${segmentTreeExecutionTime}ms)`);
        return res.status(400).json({
          success: false,
          message: `No seat available for your route segment (${trainAvailability.departureStation} → ${trainAvailability.arrivalStation}). Another passenger is occupying this seat on your travel segment.`,
          algorithm: 'SegmentTree',
          segmentCheck: segmentTreeResult,
          performanceMetrics: {
            executionTime: `${segmentTreeExecutionTime}ms`,
            segmentsChecked: stops.length - 1,
            seatsAnalyzed: classCapacity
          }
        });
      }

      const segmentTreeExecutionTime = Date.now() - segmentTreeStartTime;
      segmentTreeResult = `OK — segment [${segStartIdx}, ${segEndIdx}] is free`;
      console.log(`[Segment Tree] ${segmentTreeResult} (Execution: ${segmentTreeExecutionTime}ms)`);
    }

    // -----------------------------------------------------------------
    // Calculate priority score for this booking (used by Priority Queue
    // if this passenger ever ends up on a waitlist)
    // Senior citizen (any passenger 60+) gets priority boost
    // -----------------------------------------------------------------
    const isSenior = passengers.some(p => parseInt(p.age) >= 60);
    const priorityScore = isSenior ? 3 : 1;

    // Calculate base fare — strip all non-numeric chars (Rs, commas, spaces) except decimal
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

    // Calculate charges (Nepal specific)
    const reservationCharges = 40 * passengers.length;
    const superfastCharges = 75 * passengers.length;
    const vatAmount = (baseFare + reservationCharges + superfastCharges) * 0.13; // 13% VAT for Nepal

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
            message: `Minimum order value for this coupon is NPR ${coupon.minOrderValue}`
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
        // Only record a Segment Tree entry when the check actually ran
        // (the schedule has a stopsList with 2+ stops). Logging it
        // unconditionally made every booking show a "Segment Tree" badge
        // even when it was skipped and never touched the outcome.
        ...(!isWaitlistBooking && stops.length >= 2 ? [{
          algorithm: 'SegmentTree',
          action: 'seat_check',
          result: segmentTreeResult,
        }] : []),
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

      // E11000 here means the partial unique index on
      // (user, trainAvailability, classInfo, travelDate, status:'Pending')
      // caught a genuine race — another request for this same booking beat
      // us to it by milliseconds. Hand back that winning booking instead of
      // erroring, so a double-click never surfaces as a failed booking.
      if (error.code === 11000) {
        const existing = await Booking.findOne({
          user: req.user._id,
          trainAvailability: trainAvailability._id,
          classInfo,
          travelDate: new Date(travelDate),
          status: 'Pending'
        }).sort({ createdAt: -1 });

        if (existing) {
          return res.status(201).json({
            success: true,
            booking: existing._id,
            totalAmount: existing.paymentDetails.total.toFixed(2),
            pnr: existing.pnr,
            duplicate: true,
            message: 'Booking already reserved — resuming existing booking'
          });
        }
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
    // Time Complexity: O(1) per request with circular queue
    // Space Complexity: O(N) where N is queue length
    const roundRobinStartTime = Date.now();
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
    const roundRobinExecutionTime = Date.now() - roundRobinStartTime;

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
      performanceMetrics: {
        executionTime: `${roundRobinExecutionTime}ms`,
        queueLength: trainAvailability.bookingQueue.length,
        timeQuantum: allocationResult.timeQuantum
      }
    });

    // Save the algorithm data directly to the booking document
    booking.roundRobinData = {
      queuePosition: trainAvailability.bookingQueue.length,
      allocationTime: allocationResult.allocatedSlot?.allocationTime || new Date(),
      waitTime: allocationResult.timeQuantum || 0,
      timeSlotAllocated: allocationResult.allocatedSlot?.timeSlot || 'Standard',
      executionTime: roundRobinExecutionTime
    };

    // Seats are held (status stays 'Pending') but the booking is not
    // 'Confirmed' until payment actually succeeds via updateBookingPayment.
    // Marking it Confirmed here meant every abandoned/duplicate checkout
    // attempt showed up as a real, paid-looking reservation forever.
    await booking.save();

    // Send confirmation email
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">🚂 Seats Reserved — Payment Pending</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">PNR: ${pnr}</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-top: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Booking Details</h2>
            
            <div style="margin: 20px 0;">
              <p><strong>Train:</strong> ${trainAvailability.trainNumber} - ${trainAvailability.trainName}</p>
              <p><strong>Route:</strong> ${trainAvailability.departureStation} → ${trainAvailability.arrivalStation}</p>
              <p><strong>Departure:</strong> ${trainAvailability.departureTime} on ${new Date(travelDate).toLocaleDateString()}</p>
              <p><strong>Arrival:</strong> ${trainAvailability.arrivalTime} on ${new Date(trainAvailability.arrivalDate).toLocaleDateString()}</p>
              <p><strong>Class:</strong> ${classInfo}</p>
              <p><strong>Total Amount:</strong> NPR ${totalAmount.toFixed(2)}</p>
            </div>
            
            <h3 style="color: #333; margin-top: 30px;">Passenger Details</h3>
            ${passengers.map((p, i) => `
              <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea;">
                <p><strong>Passenger ${i + 1}:</strong> ${p.name} (${p.age} years, ${p.gender})</p>
                <p><strong>Seat:</strong> ${p.seat || 'To be assigned'}</p>
              </div>
            `).join('')}
            
            <div style="margin-top: 30px; padding: 20px; background: #fff8e1; border-radius: 10px; text-align: center;">
              <p style="margin: 0; color: #8a6d00; font-weight: bold;">🕒 Your seats are reserved — complete payment to confirm your ticket</p>
              <p style="margin: 5px 0 0; color: #666;">This hold will be released if payment is not completed</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply.</p>
            <p>© 2026 Nepal Train Reservation System</p>
          </div>
        </div>
      `;

      await sendEmail({
        email: contactInfo.email,
        subject: `Seats Reserved, Payment Pending - PNR: ${pnr}`,
        message: emailHtml
      });
      
      console.log('[Email] Confirmation email sent to:', contactInfo.email);
    } catch (emailError) {
      console.error('[Email] Failed to send confirmation email:', emailError);
      // Don't fail the booking if email fails
    }

    // Invalidate related cache entries by clearing cache (simple approach)
    // In production, you'd want more selective invalidation
    console.log('[Cache] Clearing train availability cache after booking');
    trainAvailabilityCache.clear();

    console.log('[Round Robin] Booking confirmed:', {
      bookingId: booking._id,
      pnr,
      totalAmount,
      roundRobinResult: allocationResult,
      executionTime: `${roundRobinExecutionTime}ms`
    });

    res.status(201).json({
      success: true,
      booking: booking._id,
      totalAmount: totalAmount.toFixed(2),
      pnr,
      qrCode,
      algorithms: {
        segmentTree: segmentTreeResult,
        roundRobin: { 
          ...allocationResult, 
          processedBookings,
          performanceMetrics: {
            executionTime: `${roundRobinExecutionTime}ms`,
            queueLength: trainAvailability.bookingQueue.length
          }
        },
      },
      message: 'Seats reserved — verified by Segment Tree + allocated via Round Robin. Complete payment to confirm.'
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    
    // Provide algorithm-specific error context
    let errorContext = {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    };

    // Add algorithm-specific context if available
    if (error.message.includes('segment') || error.message.includes('Segment')) {
      errorContext.algorithm = 'SegmentTree';
      errorContext.errorType = 'SEAT_ALLOCATION_CONFLICT';
      errorContext.suggestion = 'Try a different travel class or adjust your travel dates';
    } else if (error.message.includes('queue') || error.message.includes('Round Robin')) {
      errorContext.algorithm = 'RoundRobin';
      errorContext.errorType = 'SCHEDULING_ERROR';
      errorContext.suggestion = 'System is experiencing high load, please try again';
    } else if (error.message.includes('priority') || error.message.includes('waitlist')) {
      errorContext.algorithm = 'PriorityQueue';
      errorContext.errorType = 'WAITLIST_ERROR';
      errorContext.suggestion = 'Waitlist capacity may be full, contact support';
    }

    res.status(400).json(errorContext);
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
      .sort({ createdAt: -1 }); // Use Mongoose sort syntax for consistency

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

    // Generate QR code for this booking
    const generateQRCode = require('../utils/generateQRCode');
    const qrData = {
      pnr: booking.pnr,
      trainNumber: booking.trainAvailability.trainNumber,
      trainName: booking.trainAvailability.trainName,
      date: booking.travelDate,
      passenger: booking.passengers[0]?.name || 'Passenger',
      class: booking.classInfo
    };
    const qrCode = await generateQRCode(qrData);

    res.status(200).json({
      success: true,
      data: {
        ...booking.toObject(),
        qrCode
      },
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
    // Time Complexity: O(log N) for enqueue/dequeue operations
    // Space Complexity: O(N) where N is number of waiting passengers
    // -----------------------------------------------------------------
    const priorityQueueStartTime = Date.now();
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
      const priorityQueueExecutionTime = Date.now() - priorityQueueStartTime;

      if (promotedBooking && promotedReservation) {
        promotedBooking.status = 'Confirmed';
        promotedBooking.waitlistPosition = null;
        promotedBooking.algorithmLog = promotedBooking.algorithmLog || [];
        promotedBooking.algorithmLog.push({
          algorithm: 'PriorityQueue',
          action: 'promoted',
          result: `Promoted from Waiting → Confirmed. Priority score: ${promotedBooking.priorityScore}. Queue had ${waitlistedBookings.length} passengers.`,
          performanceMetrics: {
            executionTime: `${priorityQueueExecutionTime}ms`,
            heapSize: waitlistedBookings.length,
            priorityScore: promotedBooking.priorityScore
          }
        });
        await promotedBooking.save();

        priorityQueueResult = `Promoted booking ${topBookingId} (priorityScore=${promotedBooking.priorityScore}, PNR=${promotedBooking.pnr}) from Waiting → Confirmed`;
        console.log(`[Priority Queue] ${priorityQueueResult} (Execution: ${priorityQueueExecutionTime}ms)`);
      }
    }

    // Log Priority Queue run on the cancelled booking too
    booking.algorithmLog = booking.algorithmLog || [];
    booking.algorithmLog.push({
      algorithm: 'PriorityQueue',
      action: 'waitlist_check',
      result: priorityQueueResult,
      performanceMetrics: {
        executionTime: releasedConfirmedSeat && waitlistedBookings.length > 0 ? `${priorityQueueExecutionTime}ms` : 'N/A',
        waitlistSize: waitlistedBookings.length,
        promotionOccurred: promotedBooking !== null
      }
    });
    await booking.save();

    // Invalidate cache after cancellation to ensure fresh availability data
    console.log('[Cache] Clearing train availability cache after cancellation');
    trainAvailabilityCache.clear();

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
          performanceMetrics: {
            executionTime: releasedConfirmedSeat && waitlistedBookings.length > 0 ? `${priorityQueueExecutionTime}ms` : 'N/A',
            heapOperations: waitlistedBookings.length > 0 ? waitlistedBookings.length * 2 : 0 // enqueue + dequeue
          }
        }
      },
      message2: promotedBooking
        ? `Seat freed and auto-assigned to next passenger (PNR: ${promotedBooking.pnr}) via Priority Queue`
        : 'Seat freed — no waitlisted passengers to promote'
    });

  } catch (error) {
    console.error('Booking cancellation error:', error);
    
    // Provide algorithm-specific error context
    let errorContext = {
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    };

    // Add algorithm-specific context if available
    if (error.message.includes('priority') || error.message.includes('waitlist') || error.message.includes('PriorityQueue')) {
      errorContext.algorithm = 'PriorityQueue';
      errorContext.errorType = 'WAITLIST_PROMOTION_ERROR';
      errorContext.suggestion = 'Automatic waitlist promotion failed, contact support';
    } else if (error.message.includes('seat') || error.message.includes('inventory')) {
      errorContext.algorithm = 'SegmentTree';
      errorContext.errorType = 'SEAT_RELEASE_ERROR';
      errorContext.suggestion = 'Seat release failed, contact support';
    }

    res.status(400).json(errorContext);
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
