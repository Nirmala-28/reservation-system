// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Homepage';
import TrainView from './pages/TrainView';
import BookingReview from './pages/BookingReview';
import PaymentPage from './pages/PaymentPage';
import TicketConfirmation from './pages/ConfirmPage';
import Login from './pages/Authentication/Login';
import Signup from './pages/Authentication/Signup';
import { AuthProvider } from './context/AuthContext';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import BookingHistory from './components/BookingHistory/BookingHistory';

function App() {
  return (
    <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trainview" element={<TrainView />} />
        <Route path="/reviewbooking" element={<BookingReview/>} />
        <Route path="/payment" element={<PaymentPage/>} />
        <Route path="/ticket-confirmation" element={<TicketConfirmation/>} />
        <Route path="/booking-history" element={<BookingHistory />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/signup" element={<Signup/>} />
        <Route path="/profile" element={
            <ProtectedRoute>
              <Profile/>
            </ProtectedRoute>
          } />
      </Routes>
    </Router>
    </AuthProvider>
  );
}

export default App;