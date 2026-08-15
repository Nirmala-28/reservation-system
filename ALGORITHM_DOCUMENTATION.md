# Algorithm Documentation

This document describes the four algorithms used in the Train Reservation
System and their current production scope.

## 1. Segment Tree: segment-aware seat allocation

**Problem:** A physical seat can serve more than one passenger on a journey
when their travel segments do not overlap.

**Implementation:** On `POST /api/bookings`, the backend loads confirmed and
pending bookings for the selected schedule, fare class, and travel date. For a
direct confirmed booking, it
creates one Segment Tree for each physical seat in the class. Existing booking
segments are marked on their assigned seat tree. The first required seats whose
trees are free in the requested interval are assigned to the new passengers.

**Result:** A passenger receives a deterministic seat identifier such as
`1A-1`. The same identifier may be reused only on non-overlapping segments.

**Files:**

- `train-reservation-backend/utils/segmentTree.js`
- `train-reservation-backend/controllers/bookings.js`

**Complexity:** A tree operation is `O(log S)`, where `S` is the number of
route segments. Seat selection checks each seat in the selected class.

## 2. Priority Queue / Max-Heap: waitlist promotion

**Problem:** When a confirmed ticket is cancelled, the released seat should be
given fairly to an eligible waitlisted passenger.

**Implementation:** A full class creates a booking with status `Waiting` only
when its waitlist capacity, configured per fare class in the admin schedule,
is positive and has remaining room. When a confirmed booking is cancelled,
waiting bookings are filtered by the same schedule, class, and travel date,
then placed into a max-heap.

**Priority rule:** A booking with a passenger aged 60 or above receives score
`3`; other bookings receive score `1`. Equal scores use booking creation time
as FIFO tie-breaker.

**Files:**

- `train-reservation-backend/utils/priorityQueue.js`
- `train-reservation-backend/controllers/bookings.js`

**Complexity:** Heap insert/remove is `O(log W)`, where `W` is the waitlist
size.

## 3. Dijkstra: route recommendation

**Problem:** A user may search for stations without a direct train.

**Implementation:** If direct search returns no schedules, the backend creates
a directed weighted graph from known train schedules. Stations are graph nodes;
the parsed journey durations are edge weights. Dijkstra returns the shortest
duration route and its train-leg details.

**Current scope:** The result is a recommendation displayed to the customer.
Each connecting leg must still be booked separately. The algorithm does not
yet validate transfer time compatibility between the legs.

**Files:**

- `train-reservation-backend/utils/dijkstra.js`
- `train-reservation-backend/controllers/trainAvailability.js`
- `train-reservation-front/src/components/TrainSearch/TrainSearch.jsx`

## 4. Round Robin: booking-request queue processing

**Problem:** The project demonstrates fair processing of queued booking work
using a configurable time quantum.

**Implementation:** Confirmed booking requests are recorded in a schedule's
booking queue. `processBookingsRoundRobin` processes waiting queue entries in
arrival order using the schedule time quantum and calculates queue metrics.
Time slots are used as scheduling metadata; they do not determine whether a
passenger receives a train seat.

**Files:**

- `train-reservation-backend/models/TrainAvailability.js`
- `train-reservation-backend/controllers/bookings.js`
- `train-reservation-backend/controllers/trainAvailability.js`
- `train-reservation-dashboard/src/components/Trains/ScheduleForm.jsx`

## Inventory and concurrency safeguards

`TravelInventory` stores availability by schedule, travel date, and fare
class. The booking controller reserves seats using a conditional MongoDB update
that succeeds only when sufficient seats remain. This prevents concurrent
requests from overselling a class and keeps different travel dates separate.

## Automated verification

`train-reservation-backend/utils/algorithms.test.js` tests:

1. Segment Tree capacity behavior.
2. Priority Queue priority and FIFO behavior.
3. Dijkstra shortest-path behavior.

Run with:

```bash
cd train-reservation-backend
npm test
```

For a complete manual test, start MongoDB and all three applications, then
test a normal booking, a waitlist booking, and cancellation-based promotion.
