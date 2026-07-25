import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PaymentModal from '../components/payment/PaymentModal';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have valid booking data in the location state
    if (!location.state?.bookingId || !location.state?.selectedTrain) {
      console.error("Missing required booking data in location state");
      navigate('/');
    }
  }, [location.state, navigate]);

  // Debug: Log what we received to help with troubleshooting
  useEffect(() => {
    if (location.state) {
      console.log("Payment page received state:", {
        bookingId: location.state.bookingId,
        paymentMethod: location.state.paymentMethod,
        amount: location.state.amount
      });
    }
  }, [location.state]);

  return (
    <div>
      <PaymentModal />
    </div>
  );
};

export default PaymentPage;