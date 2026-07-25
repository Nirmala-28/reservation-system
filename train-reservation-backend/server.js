// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

dotenv.config();

const app = express();

// Database Connection
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/trains', require('./routes/trains'));
app.use('/api/train-availability', require('./routes/trainAvailability'));
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/meals', require('./routes/meals'));
app.use('/api/coupons', require('./routes/coupons'));

// Round Robin Algorithm demonstration route
app.get('/api/algorithm/demo', (req, res) => {
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
app.post('/api/algorithm/analyze', async (req, res) => {
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

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Train Reservation System API with Round Robin Algorithm',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    algorithm: 'Round Robin',
    features: [
      'Basic Train Management',
      'Round Robin Scheduling Algorithm',
      'Fair Time Slot Allocation',
      'Performance Metrics',
      'Queue Management with Time Quantum'
    ],
    algorithm_info: {
      name: 'Round Robin',
      timeQuantum: '30 minutes (configurable)',
      advantages: 'Fair allocation, No starvation, Time-sharing'
    }
  });
});

// Algorithm configuration route
app.get('/api/algorithm/config', (req, res) => {
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

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /api/health',
      'GET /api/algorithm/demo',
      'POST /api/algorithm/analyze',
      'GET /api/algorithm/config',
      'GET /api/trains',
      'GET /api/train-availability'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('🚂========================🚂');
  console.log(`🚂 Train Reservation Server`);
  console.log(`🚂 Running on port ${PORT}`);
  console.log('🚂 Round Robin Algorithm 🔄');
  console.log('🚂========================🚂');
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🧠 Algorithm Demo: http://localhost:${PORT}/api/algorithm/demo`);
  console.log(`⚡ Algorithm Analyze: http://localhost:${PORT}/api/algorithm/analyze`);
  console.log(`⚙️  Algorithm Config: http://localhost:${PORT}/api/algorithm/config`);
  console.log('🚂========================🚂');
});

module.exports = app;