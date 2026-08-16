# 🚂 Train Reservation System

A full-stack train reservation and management system developed as a **Final Year Project**. The system is composed of a backend REST API (Node.js/Express/MongoDB), a customer-facing frontend (React), and an admin-facing dashboard (React).

---

## 📁 Project Structure

```
reservation-system/
├── train-reservation-backend/     # REST API Server (Node.js + Express + MongoDB)
├── train-reservation-dashboard/   # Admin Dashboard (React + Vite)
└── train-reservation-front/       # Customer Frontend (React + Vite)
```

---

## 🔧 Tech Stack

| Layer       | Technology           |
|-------------|----------------------|
| Backend     | Node.js, Express.js  |
| Database    | MongoDB, Mongoose    |
| Frontend    | React, Vite          |
| Dashboard   | React, Vite, Chart.js|
| Auth        | JWT Tokens           |
| Email       | Nodemailer           |
| Styling     | CSS Modules          |

---

## 🧠 Algorithms Implemented

This system integrates **four computer science algorithms** to demonstrate academic relevance:

### 1. ⚙️ Round Robin (Server Request Scheduling)
- **Problem Solved**: High concurrency during peak booking seasons can cause server starvation if one large booking monopolizes the CPU.
- **How it's Used**: When users click "Confirm Booking", their requests are placed into a queue. The server allocates a fair "time quantum" to process each booking in a circular order.
- **Where it's Used**: Live in the Booking Engine (`controllers/bookings.js` → `createBooking`) and `models/TrainAvailability.js`.

---

### 2. 📍 Dijkstra's Algorithm (Smart Route Optimization)
- **Problem Solved**: Passengers want to travel from Station A to Station B, but no direct train exists. Standard systems return "0 results".
- **How it's Used**: When a user searches for a train, if 0 direct routes are found, the backend automatically builds a weighted graph of all available train schedules. Dijkstra calculates the absolute fastest multi-hop connecting route (e.g., Kathmandu → Nepalgunj → Surkhet).
- **Where it's Used**: Live in the Search API (`controllers/trainAvailability.js` → `searchTrains`) and visually displayed on the Customer Frontend (`TrainSearch.jsx`).

---

### 3. 👑 Priority Queue / Max-Heap (Intelligent Waitlist Management)
- **Problem Solved**: When a passenger cancels a ticket, the newly freed seat must be given to a waitlisted passenger. It must be fair and respect priorities (e.g., Senior Citizens).
- **How it's Used**: When a cancellation occurs, the system fetches all `Waiting` passengers, loads them into a Max-Heap Priority Queue, and auto-promotes the highest priority passenger (e.g., Age 60+ gets higher priority score, FIFO for ties) to `Confirmed` status.
- **Where it's Used**: Live in the Cancellation API (`controllers/bookings.js` → `cancelBooking`).

---

### 4. 🌲 Segment Tree (Advanced Seat Allocation)
- **Problem Solved**: A train travels from Stop 1 → 2 → 3 → 4. If someone books Seat A from Stop 1 to 2, that physical seat is empty from 2 to 4. A standard booking system wastes this seat.
- **How it's Used**: The route is mapped into segments. Before confirming a ticket, the API queries the Segment Tree to check if the specific physical seat is free for that exact portion of the journey. If it's free, it allows the booking. If someone else is sitting there during *any overlapping part* of their trip, it blocks it to prevent double-booking.
- **Where it's Used**: Live in the Booking API (`controllers/bookings.js` → `createBooking`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

---

### Backend Setup

```bash
cd train-reservation-backend
npm install
```

Create a `.env` file in `train-reservation-backend/` with:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/train-reservation
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5174
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

Start the server:
```bash
npm run dev
```

---

### Admin Dashboard Setup

```bash
cd train-reservation-dashboard
npm install
npm run dev
```

Dashboard runs at: `http://localhost:5174`

---

### Customer Frontend Setup

```bash
cd train-reservation-front
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint          | Description         |
|--------|-------------------|---------------------|
| POST   | `/api/auth/login` | User login (JWT)    |

### Trains
| Method | Endpoint             | Description         |
|--------|----------------------|---------------------|
| GET    | `/api/trains`        | Get all trains      |
| POST   | `/api/admin/trains`  | Create train        |
| PUT    | `/api/admin/trains/:id` | Update train     |
| DELETE | `/api/admin/trains/:id` | Delete train     |

### Scheduling
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| GET    | `/api/train-availability`   | Get all schedules   |
| POST   | `/api/train-availability`   | Create schedule     |

### Algorithms
| Method | Endpoint                                   | Description                        |
|--------|--------------------------------------------|------------------------------------|
| GET    | `/api/algorithm/demo`                      | Round Robin demonstration           |
| POST   | `/api/algorithm/analyze`                   | Run Round Robin performance analysis |
| GET    | `/api/algorithm/config`                    | Round Robin configuration guide     |
| POST   | `/api/algorithm/dijkstra/solve`            | Dijkstra shortest path solver       |
| POST   | `/api/algorithm/priority-queue/simulate`   | Priority Queue heap simulation      |
| POST   | `/api/algorithm/segment-tree/query`        | Segment Tree seat range query       |

### Health
| Method | Endpoint        | Description      |
|--------|-----------------|------------------|
| GET    | `/api/health`   | API health check |

---

## 📊 Admin Dashboard Features

- **Train Management** – Add, edit, delete trains with facilities
- **Scheduling** – Round Robin-powered train availability scheduling
- **Meals** – Manage onboard meal options per train
- **Coupons** – Create and manage discount coupons
- **Bookings** – View and manage customer bookings
- **Statistics** – Revenue, booking, and performance charts
- **🎓 Algorithms Playground** – Interactive visualizers for all 4 algorithms:
  - Dijkstra Route Solver
  - Priority Queue Heap Waitlist
  - Segment Tree Seat Allocator

---

## 👩‍💻 Developer

**Nirmala Chapagain**
Final Year Project — Computer Science (BCA)

---

> This project demonstrates real-world application of computer science algorithms (Round Robin, Dijkstra, Priority Queue, Segment Tree) in a railway reservation system context.
