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
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.DASHBOARD_URL || 'http://localhost:5174',
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
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
app.use('/api/algorithm', require('./routes/algorithm'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Advanced Train Reservation System API',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    algorithms_active: ['Segment Tree', 'Priority Queue', 'Dijkstra', 'Round Robin'],
    features: [
      'Smart Seat Allocation (Segment Tree)',
      'Waitlist Management (Priority Queue)',
      'Route Optimization (Dijkstra)',
      'Server Request Scheduling (Round Robin)'
    ],
    algorithm_info: {
      segmentTree: 'O(log N) Space-Time dynamic seat partitioning',
      priorityQueue: 'O(log N) Max-Heap waitlist auto-promotion',
      dijkstra: 'O(E + V log V) Shortest route stitching',
      roundRobin: 'Time Quantum configurable concurrency'
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
  console.log('🚂 Core Algorithms Active:');
  console.log('   🌲 Segment Tree (Seat Allocation)');
  console.log('   👑 Priority Queue (Waitlist)');
  console.log('   📍 Dijkstra (Route Optimization)');
  console.log('   ⚙️ Round Robin (Scheduling)');
  console.log('🚂========================🚂');
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;