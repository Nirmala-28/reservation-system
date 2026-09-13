# 🧠 Final Year Project: Algorithm Integration Documentation

This document serves as the official guide for the **four computer science algorithms** implemented in the Train Reservation System. It is designed to answer any questions from supervisors regarding the necessity, implementation, and performance of the algorithms used in this project.

---

## 📊 Summary of Algorithms Used
The system actively integrates **4 core algorithms** behind the scenes to solve complex real-world railway problems:
1. **Segment Tree** (Smart Seat Allocation)
2. **Priority Queue / Max-Heap** (Waitlist Management)
3. **Dijkstra’s Algorithm** (Route Optimization)
4. **Round Robin** (Server Request Scheduling)

---

## 1. 🌲 Segment Tree (Smart Seat Allocation)
### What problem does it solve?
In a real railway system, a train makes multiple stops (e.g., Kathmandu → Narayanghat → Nepalgunj). If a passenger books a seat from Kathmandu to Narayanghat, that physical seat becomes empty for the remainder of the journey. A standard booking system would mark the seat as "booked" and waste it. We needed a way to allow *partial segment bookings* without causing double-booking conflicts.

### How does it work?
The Segment Tree mathematically breaks the train route into an array of intervals (segments), built from the schedule's **Intermediate Stops** list. When a user tries to book a ticket, the algorithm queries a per-seat tree in `O(log N)` time to check whether that seat is free across the requested segment, and assigns a specific seat number (e.g. `1A-7`) rather than just decrementing a counter. If it's free, it marks the tree occupied for that segment and books it.

### Configuration requirement
This check only runs for schedules that have an Intermediate Stops list configured (Admin Dashboard → Scheduling → edit a schedule → Route Information). Without one, there's no segment boundary data to check against, so the booking falls back to simple count-based seat tracking and the check is skipped — a deliberate zero-config default, not a bug.

### Current scope
The segment each booking checks is currently always the **schedule's full route** (its configured departure station to its arrival station) — there is no field yet for a passenger to select a different boarding/alighting stop. So while the algorithm and data structure genuinely support two passengers sharing one seat on non-overlapping legs (e.g. one riding Kathmandu→Bharatpur, another Butwal→Pokhara), that outcome isn't reachable through the current booking form, since every request asks for the same full-route segment. What Intermediate Stops adds *today* is a real per-seat conflict check with actual seat number assignment, in place of the simple counter used otherwise — genuine partial-route sharing is implemented at the algorithm level but not yet exposed end-to-end.

### Where is it used?
- **Triggered when:** A customer clicks "Confirm Booking" on the Customer Frontend (`train-reservation-front`), on a schedule that has an Intermediate Stops list set.
- **Executed at:** Backend API (`POST /api/bookings`).
- **Files:** `train-reservation-backend/utils/segmentTree.js` and `controllers/bookings.js`.
- **Verifying it ran:** the booking's `algorithmLog` only contains a `SegmentTree` entry when the check actually executed — so the "Segment Tree" badge in the Admin Dashboard's Bookings table only appears for schedules with stops configured, not on every booking.

---

## 2. 👑 Priority Queue / Max-Heap (Waitlist Management)
### What problem does it solve?
When a train is fully booked, excess users are placed on a waitlist. If a confirmed passenger cancels their ticket, the system needs to immediately give that newly freed seat to a waitlisted passenger. However, it must be fair—for example, Senior Citizens should logically receive higher priority than regular users.

### How does it work?
We use a **Max-Heap Priority Queue**. Every time a user joins the waitlist, they are assigned a "Priority Score" (e.g., age > 60 gets a higher multiplier). The Max-Heap automatically sorts the users in `O(log N)` time so the person with the absolute highest score is always at the top of the list. If priorities tie, it uses a First-In-First-Out (FIFO) timestamp tie-breaker.

### Where is it used?
- **Triggered when:** A customer cancels a confirmed ticket, or an Admin cancels a ticket from the Dashboard.
- **Executed at:** Backend API (`PUT /api/bookings/:id/cancel`).
- **Files:** `train-reservation-backend/utils/priorityQueue.js` and `controllers/bookings.js`.

---

## 3. 📍 Dijkstra’s Algorithm (Route Optimization)
### What problem does it solve?
Passengers often want to travel between two stations where no direct train exists (e.g., Kathmandu to Surkhet). A basic database query would return "0 trains found," frustrating the user. The system needs to intelligently compute a multi-hop connecting route (e.g., Kathmandu → Nepalgunj → Surkhet).

### How does it work?
When a user searches for a route, the backend constructs a **Weighted Directed Graph** of all active train schedules. The "nodes" are the stations, and the "edges" are the travel durations in minutes. Dijkstra’s Algorithm is then executed to find the absolute shortest connecting path (minimum travel time) between the source and destination in `O(E + V log V)` time.

### Where is it used?
- **Triggered when:** A customer searches for a train on the Customer Frontend (`train-reservation-front`), and no direct train is available.
- **Executed at:** Backend API (`POST /api/train-availability/search`).
- **Files:** `train-reservation-backend/utils/dijkstra.js` and `controllers/trainAvailability.js`.
- **Visible where:** the suggested-route banner on the Customer Frontend's search results page (`TrainSearch.jsx`), and in the backend console log. Dijkstra is a **search-time** algorithm — it never attaches to a `Booking` document, so it will never appear in the Admin Dashboard's Bookings table "Algorithms Used" column. That column only reflects what ran during booking creation (Segment Tree, Round Robin) or cancellation/waitlist promotion (Priority Queue).

---

## 4. ⚙️ Round Robin (Server Request Scheduling)
### What problem does it solve?
During peak holiday seasons (like Dashain/Tihar), thousands of users might hit the "Book Ticket" button at the exact same time. This massive spike in concurrency can crash the Node.js server, or cause smaller transactions to starve while large ones monopolize the CPU.

### How does it work?
We implemented a **Round Robin Queue Processor**. Instead of executing bookings instantly, incoming API requests are placed into a circular queue. The algorithm assigns a fixed "Time Quantum" (e.g., 30ms) to each booking request. It loops through the queue, giving every request a fair slice of processing time `O(1)`, ensuring the server remains stable and no single user is left waiting indefinitely.

### Where is it used?
- **Triggered when:** Multiple users attempt to book tickets simultaneously.
- **Executed at:** Backend API (Integrated deeply into the booking queue mechanism).
- **Files:** Configured via `train-reservation-dashboard/src/components/Trains/ScheduleForm.jsx` and executed in backend routing logic (`models/TrainAvailability.js`).

---

## 🏷️ When Each Algorithm Badge Appears (Admin Dashboard → Bookings → "Algorithms Used")

The Admin Dashboard's Booking Management table shows a badge for every entry in that booking's `algorithmLog` — nothing more, nothing less. Here's exactly what puts each badge there:

### The Segment Tree rule, simplified

The **Segment Tree** badge shows up ONLY when **both** of these are true for that booking:

1. ✅ The train schedule has **Intermediate Stops** filled in (2 or more stops) — set in Admin → Scheduling → Edit → Route Information
2. ✅ The booking actually got a seat (status became `Pending`/`Confirmed`) — not waitlisted

If either one is false, there's no Segment Tree badge. It isn't a global on/off switch for the app — it's decided **per schedule**, one at a time, by whether that specific schedule has stops filled in.

#### Four concrete scenarios

| Schedule has Intermediate Stops? | Booking got a seat? | Segment Tree badge? |
|---|---|---|
| ❌ No | ✅ Yes | ❌ No |
| ❌ No | ❌ No (waitlisted) | ❌ No |
| ✅ Yes | ✅ Yes | ✅ **Yes** |
| ✅ Yes | ❌ No (waitlisted) | ❌ No |

### Full badge reference

| Badge | Appears when | Never appears when |
|---|---|---|
| **Round Robin** | Every booking that isn't waitlisted (ends up `Pending`/`Confirmed`, later possibly `Cancelled`) — Round Robin queue allocation always runs for these | The booking was waitlisted (`Waiting` status) — the code returns a response before Round Robin ever runs |
| **Priority Queue** | The booking itself was created waitlisted, OR it's a *different* booking that got auto-promoted from waitlist to `Confirmed` when another passenger cancelled | Any booking that was never waitlisted and never received a promotion |
| **Segment Tree** | The booking isn't waitlisted, AND the schedule it's on has an **Intermediate Stops** list (2+ stops) configured in Route Information | The schedule has no Intermediate Stops set (the default for a new schedule) — the check is skipped, nothing is logged |
| **Dijkstra** | **Never** — on any booking, under any condition | Always, in this table |

A few things worth knowing when reading this table:
- `algorithmLog` is a permanent record of what happened **at booking creation**. Cancelling a booking afterward doesn't remove its badges — a `Cancelled` booking that originally ran Segment Tree + Round Robin will still show both.
- Dijkstra is a **search-time-only** algorithm — it evaluates possible routes before a booking ever exists, so it structurally can never attach to a `Booking` document. It shows instead as a "No direct trains found — suggested route" banner on the Customer Frontend's search results page, and only when a search finds zero direct trains between two stations.

---

## 🏁 Conclusion
This project is not a simple CRUD (Create, Read, Update, Delete) application. It is a highly optimized, mathematically sound reservation engine. 
- **The Backend** executes the complex mathematical logic safely away from the client.
- **The Frontend** provides a seamless experience, triggering Dijkstra gracefully when direct routes fail.
- **The Admin Dashboard** provides full visual oversight of the Round Robin queues and Segment Tree allocations via the Booking Management table.
