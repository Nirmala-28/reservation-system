const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const Booking = require('./models/Booking');

dotenv.config();

const run = async () => {
  await connectDB();
  
  const bookings = await Booking.find().limit(2);
  
  if (bookings.length > 0) {
    console.log(`Found booking ${bookings[0].pnr}, adding Dijkstra...`);
    bookings[0].algorithmLog = bookings[0].algorithmLog || [];
    bookings[0].algorithmLog.push({
      algorithm: 'Dijkstra',
      action: 'route_optimization',
      result: 'Suggested optimal connecting route'
    });
    await bookings[0].save();
  }
  
  if (bookings.length > 1) {
    console.log(`Found booking ${bookings[1].pnr}, adding PriorityQueue...`);
    bookings[1].algorithmLog = bookings[1].algorithmLog || [];
    bookings[1].algorithmLog.push({
      algorithm: 'PriorityQueue',
      action: 'promoted',
      result: 'Promoted from Waitlist'
    });
    await bookings[1].save();
  }
  
  console.log('Test data seeded successfully!');
  process.exit(0);
};

run().catch(console.error);
