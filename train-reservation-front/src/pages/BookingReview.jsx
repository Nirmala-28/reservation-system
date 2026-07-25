import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReviewBooking from '../components/ReviewBooking/ReviewBooking';

const BookingReview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have valid train data in the location state
    if (!location.state?.selectedTrain) {
      console.error("Missing required train data in location state");
      navigate('/trainview');
    }
  }, [location.state, navigate]);

  // Debug: Log what we received to help with troubleshooting
  useEffect(() => {
    if (location.state) {
      console.log("Booking review page received state:", {
        selectedTrain: location.state.selectedTrain?.trainNumber,
        selectedFare: location.state.selectedFare?.class,
        departureDate: location.state.departureDate
      });
    }
  }, [location.state]);

  return (
    <div>
      <ReviewBooking />
    </div>
  );
};

export default BookingReview;