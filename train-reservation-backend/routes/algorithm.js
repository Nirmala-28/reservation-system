const express = require('express');
const router = express.Router();

// Round Robin Algorithm demonstration route
router.get('/demo', (req, res) => {
  res.json({
    success: true,
    message: 'Train Scheduling with Round Robin Algorithm',
    algorithm: {
      name: 'Round Robin',
      description: 'Fair time slot allocation with equal time quantum for all train schedules',
      useCase: 'Balanced resource allocation across all trains and bookings',
      complexity: 'O(n)',
      timeComplexity: 'Linear time for each allocation',
      spaceComplexity: 'O(n) for storing time slots',
      advantages: [
        'Fair allocation - every booking gets equal time slice',
        'No starvation - all bookings are eventually processed',
        'Good for time-sharing resources',
        'Simple implementation and understanding',
        'Predictable behavior'
      ],
      disadvantages: [
        'Context switching overhead between time slices',
        'May not be optimal for varying booking priorities',
        'Fixed time quantum might not suit all scenarios'
      ],
      implementation: {
        timeQuantum: '30 minutes (configurable)',
        slotAllocation: 'Circular queue with fair distribution',
        queueProcessing: 'FIFO with time-sliced execution'
      }
    },
    example_usage: {
      scenario: "Train booking system with Round Robin scheduling",
      process: [
        "1. Initialize time slots based on time quantum (default 30min)",
        "2. Add bookings to queue in arrival order",
        "3. Allocate time slots in circular fashion",
        "4. Each booking gets exactly one time quantum",
        "5. Move to next slot after allocation",
        "6. Repeat until all bookings processed"
      ],
      benefits: [
        "Fair resource distribution among all trains",
        "Prevents any single train from monopolizing resources",
        "Ensures all bookings get processed within reasonable time"
      ]
    }
  });
});

// Round Robin performance analysis route
router.post('/analyze', async (req, res) => {
  try {
    const { bookings = [], timeQuantum = 30 } = req.body;
    
    if (bookings.length === 0) {
      return res.json({
        success: true,
        message: 'No bookings provided for analysis',
        analysis: {
          algorithm: 'Round Robin',
          timeQuantum: timeQuantum,
          totalBookings: 0,
          results: []
        }
      });
    }
    
    const startTime = Date.now();
    
    // Simulate Round Robin processing
    let currentTime = 0;
    const results = bookings.map((booking, index) => {
      const startProcessTime = currentTime;
      const waitTime = startProcessTime - (booking.arrivalTime || 0);
      const completionTime = startProcessTime + timeQuantum;
      
      currentTime = completionTime;
      
      return {
        bookingId: booking.id || `RR_BK${index + 1}`,
        arrivalTime: booking.arrivalTime || 0,
        startTime: startProcessTime,
        completionTime: completionTime,
        waitTime: Math.max(0, waitTime),
        turnaroundTime: completionTime - (booking.arrivalTime || 0),
        timeQuantumUsed: timeQuantum
      };
    });
    
    const executionTime = Date.now() - startTime;
    
    // Calculate metrics
    const totalWaitTime = results.reduce((sum, r) => sum + r.waitTime, 0);
    const totalTurnaroundTime = results.reduce((sum, r) => sum + r.turnaroundTime, 0);
    const averageWaitTime = totalWaitTime / results.length;
    const averageTurnaroundTime = totalTurnaroundTime / results.length;
    const throughput = results.length / (currentTime / 60);
    const utilization = (results.length * timeQuantum) / currentTime * 100;
    
    res.json({
      success: true,
      analysis: {
        algorithm: 'Round Robin',
        timeQuantum: timeQuantum,
        totalBookings: bookings.length,
        executionTime: executionTime,
        results: results,
        metrics: {
          averageWaitTime: Math.round(averageWaitTime * 100) / 100,
          averageTurnaroundTime: Math.round(averageTurnaroundTime * 100) / 100,
          totalCompletionTime: currentTime,
          throughput: Math.round(throughput * 100) / 100,
          utilization: Math.round(utilization * 100) / 100,
          fairnessIndex: 1.0
        },
        performance: {
          rating: utilization > 80 ? 'Excellent' : utilization > 60 ? 'Good' : 'Fair',
          strengths: [
            'Equal time allocation for all bookings',
            'No booking starvation',
            'Predictable completion times'
          ],
          recommendations: [
            averageWaitTime > 45 ? 'Consider reducing time quantum for faster response' : null,
            utilization < 70 ? 'Optimize time quantum for better resource utilization' : null,
            'Current configuration provides fair resource allocation'
          ].filter(Boolean)
        }
      }
    });
    
  } catch (error) {
    console.error('Round Robin analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Algorithm analysis failed',
      error: error.message
    });
  }
});

// Algorithm configuration route
router.get('/config', (req, res) => {
  res.json({
    success: true,
    algorithm: {
      type: 'Round Robin',
      defaultTimeQuantum: 30,
      minTimeQuantum: 5,
      maxTimeQuantum: 120,
      configurable: true,
      description: 'Time quantum can be adjusted based on system requirements'
    },
    configuration_guide: {
      smallTimeQuantum: {
        value: '5-15 minutes',
        useCase: 'High-frequency bookings, quick turnaround',
        effect: 'More responsive but higher overhead'
      },
      mediumTimeQuantum: {
        value: '30-60 minutes',
        useCase: 'Balanced system load, standard operations',
        effect: 'Good balance of fairness and efficiency'
      },
      largeTimeQuantum: {
        value: '60-120 minutes',
        useCase: 'Long-running processes, batch operations',
        effect: 'Lower overhead but less responsive'
      }
    }
  });
});

// Dijkstra Route Optimization API
router.post('/dijkstra/solve', (req, res) => {
  const DijkstraSolver = require('../utils/dijkstra');
  const { startNode, endNode, edges = [] } = req.body;

  if (!startNode || !endNode) {
    return res.status(400).json({ success: false, message: 'startNode and endNode are required' });
  }

  const solver = new DijkstraSolver();
  edges.forEach(edge => {
    solver.addEdge(edge.source, edge.destination, parseFloat(edge.weight));
  });

  const result = solver.findShortestPath(startNode, endNode);
  res.json({
    success: true,
    algorithm: 'Dijkstra Route Optimization',
    startNode,
    endNode,
    path: result.path,
    duration: result.duration
  });
});

// Priority Queue Simulator API
router.post('/priority-queue/simulate', (req, res) => {
  const PriorityQueue = require('../utils/priorityQueue');
  const { passengers = [], action = 'simulate' } = req.body;

  const pq = new PriorityQueue();
  passengers.forEach(p => {
    pq.enqueue(p.name, parseFloat(p.priority), p.timestamp || Date.now());
  });

  let promoted = null;
  if (action === 'promote') {
    promoted = pq.dequeue();
  }

  res.json({
    success: true,
    algorithm: 'Priority Queue Heap Waitlist',
    queueState: pq.getRawData(),
    promotedPassenger: promoted
  });
});

// Segment Tree Seat Allocation API
router.post('/segment-tree/query', (req, res) => {
  const SegmentTree = require('../utils/segmentTree');
  const { segments = 4, bookings = [], query = { start: 0, end: 1 } } = req.body;

  const tree = new SegmentTree(parseInt(segments));
  bookings.forEach(b => {
    tree.bookSegment(parseInt(b.start), parseInt(b.end));
  });

  const isFree = tree.isSegmentFree(parseInt(query.start), parseInt(query.end));
  
  res.json({
    success: true,
    algorithm: 'Segment Tree Range Seat Allocator',
    segments,
    bookings,
    query,
    isAvailable: isFree
  });
});

module.exports = router;
