# Train Reservation System

Full-stack final-year project for railway search, booking, waitlists, meals,
coupons, QR tickets, and admin schedule management.

## Applications

| Application | Purpose | Default URL |
| --- | --- | --- |
| `train-reservation-backend` | Express/MongoDB REST API | `http://localhost:5000` |
| `train-reservation-front` | Customer booking application | `http://localhost:5173` |
| `train-reservation-dashboard` | Admin dashboard | `http://localhost:5174` |

## Algorithm workflow

The algorithms are part of the backend booking flow, not only visual demos.

- **Segment Tree:** Builds one segment tree per physical seat for a travel date
  and fare class. It assigns a seat such as `1A-1` only when that seat is free
  across the requested route segment. A seat may be reused on a
  non-overlapping segment.
- **Priority Queue / Max-Heap:** A full class with a positive admin-configured
  waitlist capacity creates `Waiting` bookings. On a confirmed booking
  cancellation, the highest-priority waitlisted booking for the same train,
  class, and travel date is promoted; seniors receive priority and equal
  priorities use FIFO order.
- **Dijkstra:** If no direct train exists, search returns the shortest
  duration-based connecting-route recommendation. Each leg is currently
  booked separately.
- **Round Robin:** Records and processes booking-request queue work using the
  configured time quantum. Seat confirmation remains controlled by inventory,
  not by a Round Robin time slot.

Availability is stored per **schedule + travel date + fare class**, preventing
one day's bookings from changing another day's availability. Seat reservation
uses a conditional atomic update to prevent concurrent overselling.

### Algorithm summary

| Algorithm | Problem solved | Live usage |
| --- | --- | --- |
| Segment Tree | Prevents the same physical seat being used on overlapping route segments. | Assigns segment-safe seats during booking. |
| Priority Queue | Picks the fairest passenger after a seat is released. | Promotes waitlisted bookings after cancellation. |
| Dijkstra | Suggests a connection when no direct route exists. | Train-search fallback. |
| Round Robin | Demonstrates fair processing of booking queue work. | Schedule booking queue and metrics. |

## Setup

Prerequisites: Node.js 18+ and MongoDB.

### 1. Start MongoDB

Start your local MongoDB service, or use a MongoDB Atlas connection string in
the backend `.env` file.

### 2. Start the backend API

```bash
cd train-reservation-backend
npm install
npm run dev
```

The API starts at `http://localhost:5000`.

### 3. Start the customer frontend

```bash
cd train-reservation-front
npm install
npm run dev
```

The customer application starts at `http://localhost:5173`.

### 4. Start the admin dashboard

```bash

cd train-reservation-dashboard
npm install
npm run dev
```

The dashboard starts at `http://localhost:5174`.

Create `train-reservation-backend/.env` with at least:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/train-reservation
JWT_SECRET=replace_with_a_secret
FRONTEND_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5174
```

## Main API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a customer account |
| POST | `/api/auth/login` | Sign in and receive a JWT |
| POST | `/api/train-availability/search` | Search direct trains or get a Dijkstra recommendation |
| GET | `/api/train-availability` | List train schedules |
| POST | `/api/bookings` | Create a confirmed or waitlisted booking |
| GET | `/api/bookings/my-bookings` | Get the signed-in customer's bookings |
| PUT | `/api/bookings/:id/cancel` | Cancel a booking and run waitlist promotion |
| PUT | `/api/bookings/:id/payment` | Update mock payment completion |
| GET | `/api/bookings/pnr/:pnr` | Look up a booking by PNR |
| POST | `/api/admin/trains` | Admin: create a train |
| POST | `/api/admin/train-availability` | Admin: create a schedule |
| GET | `/api/admin/bookings` | Admin: view all bookings |
| GET | `/api/health` | API health check |

Admin routes require the `admin` role. Customer booking routes require a JWT
in the `Authorization: Bearer <token>` header.

## Payments

The project uses mock payment completion for demonstration. Do not use it for
real transactions without enabling and verifying the Stripe or PayPal server
integration with provider credentials and webhooks.

## Verification

```bash
cd train-reservation-backend
npm test

cd ../train-reservation-front
npm run build

cd ../train-reservation-dashboard
npm run build
```

---

## 👩‍💻 Developer

**Nirmala Chapagain**  
Final Year Project — Computer Science

---

> This project demonstrates the real-world application of computer science
> algorithms—Round Robin, Dijkstra, Priority Queue, and Segment Tree—in a
> railway reservation system.
