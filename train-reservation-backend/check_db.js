const mongoose = require('mongoose');
const TrainAvailability = require('./models/TrainAvailability');
const TravelInventory = require('./models/TravelInventory');
const Booking = require('./models/Booking');

const MONGODB_URI = 'mongodb+srv://nirmalachapagain57:AOAbIpGGWcCmIqah@cluster0.nn5ibts.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  // Get train availability data
  const trainAvail = await TrainAvailability.findOne({ trainNumber: '11111', departureDate: '2026-08-25' });
  console.log('\n=== TrainAvailability (Base Config) ===');
  if (trainAvail) {
    console.log('Train:', trainAvail.trainName);
    console.log('ID:', trainAvail._id);
    console.log('Fare Options:');
    trainAvail.fareOptions.forEach(f => {
      console.log(`  Class ${f.class}: Total Seats=${f.totalSeats}, Available Seats=${f.availableSeats}, Waiting List Max=${f.waitingList}`);
    });
  }
  
  // Get travel inventory data
  const inventory = await TravelInventory.findOne({ 
    trainAvailability: trainAvail?._id, 
    classInfo: '3A',
    travelDate: { $regex: '2026-08-25' }
  });
  console.log('\n=== TravelInventory (Real-time) ===');
  if (inventory) {
    console.log('Class:', inventory.classInfo);
    console.log('Available Seats:', inventory.availableSeats);
    console.log('Travel Date:', inventory.travelDate);
  } else {
    console.log('No inventory found for 3A class');
  }
  
  // Get waitlist count
  const waitlistStats = await Booking.aggregate([
    {
      $match: {
        trainAvailability: trainAvail?._id,
        classInfo: '3A',
        status: 'Waiting',
        travelDate: { $gte: new Date('2026-08-25T00:00:00.000Z'), $lt: new Date('2026-08-25T23:59:59.999Z') }
      }
    },
    { $project: { passengerCount: { $size: '$passengers' } } },
    { $group: { _id: null, passengers: { $sum: '$passengerCount' }, bookings: { $sum: 1 } } }
  ]);
  console.log('\n=== Waitlist (Actual Count) ===');
  if (waitlistStats.length > 0) {
    console.log('Actual Waitlist Passengers:', waitlistStats[0].passengers);
    console.log('Waitlist Bookings:', waitlistStats[0].bookings);
  } else {
    console.log('No waitlist bookings found');
  }
  
  // Get all bookings for this train/date/class
  const allBookings = await Booking.find({
    trainAvailability: trainAvail?._id,
    classInfo: '3A',
    travelDate: { $gte: new Date('2026-08-25T00:00:00.000Z'), $lt: new Date('2026-08-25T23:59:59.999Z') }
  });
  console.log('\n=== All Bookings (3A, 2026-08-25) ===');
  console.log('Total bookings:', allBookings.length);
  allBookings.forEach(b => {
    console.log(`  PNR: ${b.pnr}, Status: ${b.status}, Passengers: ${b.passengers.length}`);
  });
  
  mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
