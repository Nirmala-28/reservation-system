// trainAvailability.js
const TrainAvailability = require('../models/TrainAvailability');
const Train = require('../models/Train');
const DijkstraSolver = require('../utils/dijkstra');

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

// @desc    Search trains with Round Robin + Dijkstra optimization
// @route   POST /api/trains/search  (also registered at /api/train-availability/search)
// @access  Public
exports.searchTrains = async (req, res) => {
  try {
    const { departureStation, arrivalStation, departureDate } = req.body;
    
    let availabilities = await TrainAvailability.find({
      departureStation: new RegExp(departureStation, 'i'),
      arrivalStation: new RegExp(arrivalStation, 'i'),
      departureDate,
    });

    // Apply Round Robin metrics to all direct results
    availabilities.forEach(availability => {
      availability.updateMetrics();
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

      allRoutes.forEach(route => {
        const from = route.departureStation?.trim();
        const to   = route.arrivalStation?.trim();
        if (!from || !to) return;

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
      const source = departureStation.trim();
      const target = arrivalStation.trim();
      const result = solver.findShortestPath(source, target);

      if (result && result.path && result.path.length >= 2) {
        // Resolve the connecting trains for each hop in the path
        const hops = [];
        for (let i = 0; i < result.path.length - 1; i++) {
          const hopFrom = result.path[i];
          const hopTo   = result.path[i + 1];
          const edge    = (edgeData[hopFrom] || []).find(e => e.to === hopTo);
          hops.push({
            from: hopFrom,
            to: hopTo,
            trainNumber: edge?.trainNumber,
            trainName: edge?.trainName,
            departureTime: edge?.departureTime,
            arrivalTime: edge?.arrivalTime,
            durationMinutes: edge?.weight,
            fareOptions: edge?.fareOptions,
            availabilityId: edge?.availabilityId,
          });
        }

        dijkstraResult = {
          found: true,
          path: result.path,
          totalDurationMinutes: result.duration,
          hops,
          message: `Dijkstra optimal route: ${result.path.join(' → ')} (${result.duration} min total)`
        };

        console.log(`[Dijkstra] ${dijkstraResult.message}`);
      } else {
        dijkstraResult = {
          found: false,
          message: `No connecting route found between "${source}" and "${target}" via Dijkstra`
        };
        console.log(`[Dijkstra] ${dijkstraResult.message}`);
      }
    }

    res.status(200).json({
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