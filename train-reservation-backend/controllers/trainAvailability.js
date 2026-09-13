// trainAvailability.js
const TrainAvailability = require('../models/TrainAvailability');
const Train = require('../models/Train');
const TravelInventory = require('../models/TravelInventory');
const Booking = require('../models/Booking');
const DijkstraSolver = require('../utils/dijkstra');
const { dijkstraCache, trainAvailabilityCache } = require('../utils/cache');

// @desc    Get all train availabilities
// @route   GET /api/train-availability
// @access  Public
exports.getTrainAvailabilities = async (req, res) => {
  try {
    const availabilities = await TrainAvailability.find();

    // Filter out stale/expired train schedules:
    // - Non-Everyday trains: remove if departureDate is in the past
    // - Everyday trains with specific dates: treat as specific-date trains
    // - Truly Everyday trains (no specific dates): remove if departureDate is more than 7 days old
    //   (they should be updated by the admin; old records are stale duplicates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const active = availabilities.filter(train => {
      if (!train.departureDate) return true;
      const trainDate = new Date(train.departureDate);
      // All trains use specific dates - only show future trains
      return trainDate >= today;
    });

    res.status(200).json({
      success: true,
      data: active,
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

// @desc    Search trains with Round Robin + Dijkstra optimization
// @route   POST /api/trains/search  (also registered at /api/train-availability/search)
// @access  Public
exports.searchTrains = async (req, res) => {
  try {
    const { departureStation, arrivalStation, departureDate } = req.body;
    
    // Create cache key for this search
    const cacheKey = `search:${departureStation}:${arrivalStation}:${departureDate}`;
    
    // Check cache first
    const cachedData = trainAvailabilityCache.get(cacheKey);
    if (cachedData) {
      console.log('[Cache] Returning cached search results for:', cacheKey);
      return res.status(200).json(cachedData);
    }
    
    // Find trains matching the stations
    let availabilities = await TrainAvailability.find({
      departureStation: new RegExp(departureStation, 'i'),
      arrivalStation: new RegExp(arrivalStation, 'i'),
    });

    // Filter by departureDate - all trains use specific dates
    if (departureDate) {
      availabilities = availabilities.filter(train => {
        return train.departureDate === departureDate;
      });
    }

    // Filter out expired trains
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    availabilities = availabilities.filter(train => {
      if (!train.departureDate) return true;
      const trainDate = new Date(train.departureDate);
      return trainDate >= today;
    });

    // Keep original dates from database (all trains are date-specific)
    const searchedDate = departureDate || new Date().toISOString().split('T')[0];
    availabilities = availabilities.map(train => {
      const obj = train.toObject ? train.toObject() : { ...train };
      return obj;
    });

    // Overlay date-specific inventory when a booking has already created it.
    // The schedule's fare options remain the admin-configured capacity.
    const inventories = await TravelInventory.find({
      trainAvailability: { $in: availabilities.map(train => train._id) },
      travelDate: searchedDate,
    });
    const inventoryByClass = new Map(
      inventories.map(item => [`${item.trainAvailability}:${item.classInfo}`, item.availableSeats])
    );

    console.log(`[Search] Found ${inventories.length} inventory records for ${searchedDate}`);
    inventories.forEach(inv => {
      console.log(`  - Train: ${inv.trainAvailability}, Class: ${inv.classInfo}, Available: ${inv.availableSeats}`);
    });

    // Get actual waitlist counts for all trains
    const trainIds = availabilities.map(train => train._id);
    const waitlistStats = await Booking.aggregate([
      {
        $match: {
          trainAvailability: { $in: trainIds },
          status: 'Waiting',
          travelDate: { $gte: new Date(`${searchedDate}T00:00:00.000Z`), $lt: new Date(`${searchedDate}T23:59:59.999Z`) }
        }
      },
      {
        $group: {
          _id: { trainAvailability: '$trainAvailability', classInfo: '$classInfo' },
          passengers: { $sum: { $size: '$passengers' } },
          bookings: { $sum: 1 }
        }
      }
    ]);

    const waitlistByClass = new Map();
    waitlistStats.forEach(stat => {
      const key = `${stat._id.trainAvailability}:${stat._id.classInfo}`;
      waitlistByClass.set(key, stat.passengers);
    });

    availabilities = availabilities.map(train => ({
      ...train,
      fareOptions: (train.fareOptions || []).map(fare => {
        const inventoryAvailable = inventoryByClass.get(`${train._id}:${fare.class}`);
        const finalAvailable = inventoryAvailable !== undefined ? inventoryAvailable : fare.availableSeats;
        const actualWaitlist = waitlistByClass.get(`${train._id}:${fare.class}`) || 0;
        console.log(`[Search] Train ${train.trainNumber} Class ${fare.class}: FareOptions=${fare.availableSeats}, Inventory=${inventoryAvailable}, Final=${finalAvailable}, WaitlistActual=${actualWaitlist}`);
        return {
          ...fare,
          availableSeats: finalAvailable,
          waitingListActual: actualWaitlist, // Actual count
          waitingList: fare.waitingList // Max capacity
        };
      }),
    }));

    // Apply Round Robin metrics to all direct results
    availabilities.forEach(availability => {
      if (availability.updateMetrics) availability.updateMetrics();
    });

    // Filter out trains that are completely full (all fare classes have 0 available seats
    // AND 0 waitingList capacity). These trains cannot accept any new passengers.
    availabilities = availabilities.filter(train => {
      if (!train.fareOptions || train.fareOptions.length === 0) return true;
      return train.fareOptions.some(fare => 
        (fare.availableSeats > 0) || (fare.waitingList !== undefined && fare.waitingList >= 0)
      );
    });

    // -------------------------------------------------------------------
    // ALGORITHM 3: DIJKSTRA — Optimal Route Suggestion (Fallback)
    // -------------------------------------------------------------------
    // If no direct trains found between A and B, build a weighted graph
    // of ALL known routes (each TrainAvailability is an edge A → B with
    // weight = travel duration in minutes). Then run Dijkstra to find the
    // shortest multi-hop path and return it as a "suggested route".
    // -------------------------------------------------------------------
    let dijkstraResult = null;

    if (availabilities.length === 0) {
      console.log(`[Dijkstra] No direct trains from "${departureStation}" to "${arrivalStation}" — computing optimal route...`);

      // Fetch all schedules to build graph
      const allRoutes = await TrainAvailability.find({}).select(
        'departureStation arrivalStation duration trainNumber trainName departureTime arrivalTime fareOptions'
      );

      const solver = new DijkstraSolver();
      const edgeData = {}; // to store extra info for later hop resolution
      const displayNames = {}; // normalized station key -> nicely-cased name for output

      // Station names in this data set are inconsistently formatted
      // ("Phr,Pokhara" vs "Pokhara", "kwt,kawasoti" vs "Kawasoti"), so the
      // same physical station can appear as different strings across
      // schedules. Graph nodes are matched on a normalized key (the part
      // after the last comma, lowercased) so hops actually connect instead
      // of silently failing to find a path that really exists.
      const normalizeStation = (raw) => {
        if (!raw) return '';
        const parts = raw.split(',');
        return parts[parts.length - 1].trim().toLowerCase();
      };

      allRoutes.forEach(route => {
        const from = normalizeStation(route.departureStation);
        const to   = normalizeStation(route.arrivalStation);
        if (!from || !to) return;
        if (!displayNames[from]) displayNames[from] = route.departureStation.split(',').pop().trim();
        if (!displayNames[to]) displayNames[to] = route.arrivalStation.split(',').pop().trim();

        // Parse duration string like "5h 30m" or "320" (minutes) into minutes
        let weight = 60; // default 60 min if unparseable
        if (route.duration) {
          const hoursMatch   = route.duration.match(/(\d+)\s*h/i);
          const minutesMatch = route.duration.match(/(\d+)\s*m/i);
          const rawMin       = parseInt(route.duration);
          if (!isNaN(rawMin) && !hoursMatch) {
            weight = rawMin;
          } else {
            weight  = (hoursMatch   ? parseInt(hoursMatch[1])   * 60 : 0)
                    + (minutesMatch ? parseInt(minutesMatch[1])      : 0);
            if (weight === 0) weight = 60;
          }
        }

        solver.addEdge(from, to, weight);
        
        if (!edgeData[from]) edgeData[from] = [];
        edgeData[from].push({
          to,
          weight,
          trainNumber: route.trainNumber,
          trainName: route.trainName,
          departureTime: route.departureTime,
          arrivalTime: route.arrivalTime,
          fareOptions: route.fareOptions,
          availabilityId: route._id,
        });
      });

      // Run Dijkstra
      const source = normalizeStation(departureStation);
      const target = normalizeStation(arrivalStation);
      const result = solver.findShortestPath(source, target);

      if (result && result.path && result.path.length >= 2) {
        // Resolve the connecting trains for each hop in the path
        const hops = [];
        for (let i = 0; i < result.path.length - 1; i++) {
          const hopFrom = result.path[i];
          const hopTo   = result.path[i + 1];
          const edge    = (edgeData[hopFrom] || []).find(e => e.to === hopTo);
          hops.push({
            from: displayNames[hopFrom] || hopFrom,
            to: displayNames[hopTo] || hopTo,
            trainNumber: edge?.trainNumber,
            trainName: edge?.trainName,
            departureTime: edge?.departureTime,
            arrivalTime: edge?.arrivalTime,
            durationMinutes: edge?.weight,
            fareOptions: edge?.fareOptions,
            availabilityId: edge?.availabilityId,
          });
        }

        const displayPath = result.path.map(key => displayNames[key] || key);
        dijkstraResult = {
          found: true,
          path: displayPath,
          totalDurationMinutes: result.duration,
          hops,
          message: `Dijkstra optimal route: ${displayPath.join(' → ')} (${result.duration} min total)`
        };

        console.log(`[Dijkstra] ${dijkstraResult.message}`);
      } else {
        dijkstraResult = {
          found: false,
          message: `No connecting route found between "${departureStation.trim()}" and "${arrivalStation.trim()}" via Dijkstra`
        };
        console.log(`[Dijkstra] ${dijkstraResult.message}`);
      }
    }

    const responseData = {
      success: true,
      count: availabilities.length,
      data: availabilities,
      algorithm: availabilities.length > 0 ? 'RoundRobin' : 'Dijkstra',
      dijkstra: dijkstraResult,
      message: availabilities.length > 0
        ? 'Direct trains found — results optimized using Round Robin'
        : (dijkstraResult?.found
            ? `No direct trains — Dijkstra suggests: ${dijkstraResult.message}`
            : 'No trains or connecting routes found')
    };
    
    // Cache the result for future requests
    trainAvailabilityCache.set(cacheKey, responseData);
    console.log('[Cache] Cached search results for:', cacheKey);
    
    res.status(200).json(responseData);
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

    // Process queued booking requests fairly. Seat confirmation itself is
    // controlled by date-specific inventory, not by an artificial time slot.
    const processedBookings = availability.processBookingsRoundRobin();
    availability.updateMetrics();
    await availability.save();
    
    res.status(200).json({
      success: true,
      algorithm: 'Round Robin',
      allocationResult: { success: true, processedBookings },
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
