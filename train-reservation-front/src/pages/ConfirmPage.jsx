import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TicketConfirmation from '../components/TicketConfirmation/TicketConfirmation';
import { useAuth } from '../context/AuthContext';

const ConfirmPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Debug info for troubleshooting
    console.log("Confirmation page state:", location.state);
    
    // If there's no booking data or the user isn't authenticated, redirect to home
    if (!location.state?.bookingId || !isAuthenticated) {
      console.error("Missing booking ID or user not authenticated");
      navigate('/');
    }
  }, [location.state, navigate, isAuthenticated]);

  return (
    <div>
      <TicketConfirmation />
    </div>
  );
};

export default ConfirmPage;