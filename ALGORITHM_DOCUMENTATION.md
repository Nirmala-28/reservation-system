
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
The Segment Tree mathematically breaks the train route into an array of intervals (segments). When a user tries to book a ticket, the algorithm queries the tree in highly efficient `O(log N)` time to check if that specific seat is completely free between the departure and arrival stops. If it is free, it safely updates the tree to mark it as occupied for just that segment. 

### Where is it used?
- **Triggered when:** A customer clicks "Confirm Booking" on the Customer Frontend (`train-reservation-front`).
- **Executed at:** Backend API (`POST /api/bookings`).
- **Files:** `train-reservation-backend/utils/segmentTree.js` and `controllers/bookings.js`.

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

## 🏁 Conclusion
This project is not a simple CRUD (Create, Read, Update, Delete) application. It is a highly optimized, mathematically sound reservation engine. 
- **The Backend** executes the complex mathematical logic safely away from the client.
- **The Frontend** provides a seamless experience, triggering Dijkstra gracefully when direct routes fail.
- **The Admin Dashboard** provides full visual oversight of the Round Robin queues and Segment Tree allocations via the Booking Management table.
