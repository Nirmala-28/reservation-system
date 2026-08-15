const Booking = require('../models/Booking');
const TravelInventory = require('../models/TravelInventory');

const toTravelDateKey = (value) => {
  if (typeof value === 'string') return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const dateRange = (travelDate) => {
  const key = toTravelDateKey(travelDate);
  const start = new Date(`${key}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { key, start, end };
};

const classCapacity = (fareOption) => Number(fareOption.totalSeats ?? fareOption.availableSeats ?? 0);

async function getOrCreateInventory(trainAvailability, fareOption, travelDate) {
  const { key, start, end } = dateRange(travelDate);
  const query = {
    trainAvailability: trainAvailability._id,
    travelDate: key,
    classInfo: fareOption.class,
  };

  let inventory = await TravelInventory.findOne(query);
  if (inventory) return inventory;

  // Existing bookings are included so deploying this change does not make an
  // already-booked date appear completely empty.
  const reserved = await Booking.aggregate([
    {
      $match: {
        trainAvailability: trainAvailability._id,
        classInfo: fareOption.class,
        status: { $in: ['Pending', 'Confirmed'] },
        travelDate: { $gte: start, $lt: end },
      },
    },
    { $unwind: '$passengers' },
    { $count: 'count' },
  ]);

  const totalSeats = classCapacity(fareOption);
  const availableSeats = Math.max(0, totalSeats - (reserved[0]?.count || 0));

  try {
    return await TravelInventory.create({ ...query, totalSeats, availableSeats });
  } catch (error) {
    // A concurrent request may have created it first; in that case use the
    // winning record and continue with the atomic update below.
    if (error?.code === 11000) return TravelInventory.findOne(query);
    throw error;
  }
}

async function reserveSeats(trainAvailability, fareOption, travelDate, quantity) {
  const inventory = await getOrCreateInventory(trainAvailability, fareOption, travelDate);
  return TravelInventory.findOneAndUpdate(
    { _id: inventory._id, availableSeats: { $gte: quantity } },
    { $inc: { availableSeats: -quantity } },
    { new: true }
  );
}

async function releaseSeats(trainAvailability, classInfo, travelDate, quantity) {
  const { key } = dateRange(travelDate);
  return TravelInventory.findOneAndUpdate(
    { trainAvailability: trainAvailability._id || trainAvailability, travelDate: key, classInfo },
    { $inc: { availableSeats: quantity } },
    { new: true }
  );
}

module.exports = { toTravelDateKey, dateRange, classCapacity, getOrCreateInventory, reserveSeats, releaseSeats };
