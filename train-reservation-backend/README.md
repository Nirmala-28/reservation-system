# Train Booking Backend API

A comprehensive backend system for train booking with admin and user functionality, built with Node.js and MongoDB.

## Features

### Admin Features
- Admin authentication with JWT
- CRUD operations for trains
- Meal management with image upload
- Coupon management
- Booking statistics and management

### User Features
- User registration and login
- Train search and booking
- Meal selection during booking
- Coupon application
- Multiple payment gateways (Stripe & Razorpay)
- Booking confirmation with QR code
- Email notifications

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer, Cloudinary
- **Payment**: Stripe, Razorpay
- **Email**: Nodemailer
- **QR Code**: qrcode library
- **Security**: bcryptjs for password hashing

## Project Structure

```
train-booking-backend/
├── config/
│   ├── database.js
│   ├── cloudinary.js
│   └── multer.js
├── controllers/
│   ├── auth.js
│   ├── admin.js
│   ├── trains.js
│   ├── bookings.js
│   ├── payments.js
│   ├── meals.js
│   └── coupons.js
├── middleware/
│   └── auth.js
├── models/
│   ├── User.js
│   ├── Train.js
│   ├── Meal.js
│   ├── Booking.js
│   └── Coupon.js
├── routes/
│   ├── auth.js
│   ├── admin.js
│   ├── trains.js
│   ├── bookings.js
│   ├── payments.js
│   ├── meals.js
│   └── coupons.js
├── utils/
│   ├── sendEmail.js
│   ├── generateQRCode.js
│   └── generatePNR.js
├── uploads/
├── .env
├── server.js
└── package.json
```

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd train-booking-backend
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file with required variables (see .env example)

4. Start the server
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get logged-in user details

### Admin Routes
- `POST /api/admin/trains` - Create train (Admin)
- `PUT /api/admin/trains/:id` - Update train (Admin)
- `DELETE /api/admin/trains/:id` - Delete train (Admin)
- `POST /api/admin/meals` - Create meal (Admin)
- `PUT /api/admin/meals/:id` - Update meal (Admin)
- `DELETE /api/admin/meals/:id` - Delete meal (Admin)
- `GET /api/admin/bookings` - Get all bookings (Admin)
- `GET /api/admin/stats` - Get booking statistics (Admin)

### User Routes
- `GET /api/trains` - Get all trains
- `GET /api/trains/:id` - Get single train
- `POST /api/trains/search` - Search trains
- `GET /api/meals/train/:trainNumber` - Get meals for train
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my-bookings` - Get user's bookings
- `GET /api/bookings/:id` - Get single booking
- `PUT /api/bookings/:id/cancel` - Cancel booking

### Payment Routes
- `POST /api/payments/stripe/create-intent` - Create Stripe payment
- `POST /api/payments/stripe/confirm` - Confirm Stripe payment
- `POST /api/payments/razorpay/create-order` - Create Razorpay order
- `POST /api/payments/razorpay/verify` - Verify Razorpay payment

### Coupon Routes
- `POST /api/coupons/apply` - Apply coupon
- `POST /api/coupons/validate` - Validate coupon

## Environment Variables

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/train-booking

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_SECRET_KEY=your_razorpay_secret_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

FRONTEND_URL=http://localhost:3000
```

## Data Models

### Train Model
```javascript
{
  trainNumber: String,
  trainName: String,
  rating: Number,
  departureTime: String,
  departureStation: String,
  departureDate: String,
  arrivalTime: String,
  arrivalStation: String,
  arrivalDate: String,
  duration: String,
  runDays: String,
  facilities: [String],
  fareOptions: [{
    class: String,
    price: String,
    availability: String,
    color: String
  }]
}
```

### Booking Model
```javascript
{
  user: ObjectId,
  train: ObjectId,
  pnr: String,
  status: String,
  classInfo: String,
  passengers: [{
    name: String,
    age: Number,
    gender: String,
    seat: String
  }],
  meals: [{
    meal: ObjectId,
    quantity: Number
  }],
  paymentDetails: {
    transactionId: String,
    paymentMethod: String,
    breakdown: [{
      label: String,
      amount: String
    }],
    total: Number,
    discount: {
      couponCode: String,
      discountAmount: Number
    }
  },
  qrCode: String
}
```

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- Protected routes with role-based access
- Input validation and sanitization
- CORS enabled
- File upload restrictions

## Error Handling

- Global error handling middleware
- Proper HTTP status codes
- Detailed error messages in development
- Generic error messages in production

## Testing

- Test accounts for Stripe and Razorpay
- Sample data included
- Postman collection available

## License

MIT
