import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import { 
  FaCheckCircle, FaPrint, FaFileDownload, FaTrain, 
  FaUser, FaRupeeSign, FaQrcode, FaSpinner, 
  FaExclamationTriangle, FaArrowLeft, FaClock,
  FaCalendarAlt, FaRoute
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./TicketConfirmation.module.css";

const TicketConfirmation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const containerRef = useRef(null);

  // Utility function to format currency
  const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return 'Rs.' + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Prevent back navigation from ticket confirmation page
  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault();
      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname);
      
      // Show confirmation dialog
      const shouldLeave = window.confirm(
        'Your ticket has been confirmed. Going back may cause confusion. Are you sure you want to leave this page?'
      );
      
      if (shouldLeave) {
        // Allow navigation to home or bookings page only
        navigate('/', { replace: true });
      }
    };

    // Push initial state to prevent back navigation
    window.history.pushState(null, '', window.location.pathname);
    
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  useEffect(() => {
    console.log("Received state in confirmation:", location.state);
    
    // Check if we have the necessary IDs from the payment process
    if (!location.state?.bookingId) {
      setError("Missing booking information. Please try again.");
      setLoading(false);
      return;
    }

    // Fetch the booking details
    const fetchBookingDetails = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/bookings/${location.state.bookingId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        const data = await response.json();
        console.log("Booking details response:", data);

        if (data.success) {
          // Combine backend data with state data for complete information
          const combinedData = {
            ...data.data,
            // Override with state data if available for better display
            train: location.state.selectedTrain || data.data.train,
            trainAvailability: data.data.trainAvailability,
            fareBreakdown: location.state.fareBreakdown,
            transactionId: location.state.transactionId || data.data.paymentDetails?.transactionId,
            paymentStatus: location.state.paymentStatus || 'succeeded'
          };
          
          setTicketData(combinedData);
        } else {
          setError(data.message || "Failed to load ticket details.");
        }
      } catch (error) {
        console.error("Error fetching booking details:", error);
        setError("An error occurred while loading your ticket. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [location.state]);

  const handleReturnHome = () => {
    navigate("/");
  };

  const handleViewBookings = () => {
    navigate("/booking-history");
  };

  const handlePrintTicket = () => {
    window.print();
  };

  // Mock function for downloading ticket - in a real app, this would generate a PDF
  const handleDownloadTicket = () => {
    const ticketInfo = {
      pnr: ticketData.pnr,
      trainName: ticketData.train?.trainName || ticketData.trainAvailability?.trainName,
      trainNumber: ticketData.train?.trainNumber || ticketData.trainAvailability?.trainNumber,
      passengers: ticketData.passengers,
      classInfo: ticketData.classInfo,
      transactionId: ticketData.transactionId,
      totalAmount: ticketData.paymentDetails?.total
    };
    
    const dataStr = JSON.stringify(ticketInfo, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ticket_${ticketData.pnr}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} />
        <p>Loading your ticket details...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <FaExclamationTriangle className={styles.errorIcon} />
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button 
          className={styles.returnButton}
          onClick={handleReturnHome}
        >
          Return Home
        </button>
      </div>
    );
  }

  // If no ticket data is available even after loading is complete
  if (!ticketData) {
    return (
      <div className={styles.errorContainer}>
        <FaExclamationTriangle className={styles.errorIcon} />
        <h2>Ticket Not Found</h2>
        <p>We couldn't find your ticket information. Please check your bookings or try again.</p>
        <div className={styles.errorActions}>
          <button 
            className={styles.returnButton}
            onClick={handleReturnHome}
          >
            Return Home
          </button>
          <button 
            className={styles.viewBookingsButton}
            onClick={handleViewBookings}
          >
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  // Prepare data for display
  const { 
    pnr, 
    passengers, 
    classInfo, 
    status = "Confirmed", 
    paymentDetails, 
    qrCode,
    contactInfo,
    travelDate,
    roundRobinData,
    waitlistPosition
  } = ticketData;

  // Use train data from state if available, fallback to backend data
  const trainInfo = ticketData.train || ticketData.trainAvailability || {};
  const fareBreakdown = ticketData.fareBreakdown || location.state?.fareBreakdown;

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      ref={containerRef}
    >
      {/* Success Header */}
      <motion.div 
        className={styles.successHeader}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <FaCheckCircle className={styles.successIcon} />
        </motion.div>
        <h1 className={styles.successTitle}>{status === 'Waiting' ? 'Added to Waitlist!' : 'Booking Confirmed!'}</h1>
        <motion.p 
          className={styles.successSubtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {status === 'Waiting'
            ? `Your waitlist position is ${waitlistPosition || location.state?.waitlistPosition || 'pending'}. We will confirm your ticket when a seat becomes available.`
            : 'Your tickets have been successfully booked.'}
        </motion.p>
        {ticketData.transactionId && (
          <motion.div 
            className={styles.transactionInfo}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <p>Transaction ID: <strong>{ticketData.transactionId}</strong></p>
          </motion.div>
        )}
      </motion.div>

      {/* Ticket Card */}
      <motion.div 
        className={styles.ticketCard}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.005 }}
      >
        {/* Ticket Header */}
        <motion.div 
          className={styles.ticketHeader}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className={styles.trainInfo}>
            <motion.div
              initial={{ rotate: -90 }}
              animate={{ rotate: 0 }}
              transition={{ delay: 0.5 }}
            >
              <FaTrain className={styles.icon} />
            </motion.div>
            <div>
              <h2>{trainInfo.trainNumber} - {trainInfo.trainName}</h2>
              <div className={styles.timeline}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <span className={styles.time}>{trainInfo.departureTime}</span>
                  <span className={styles.date}>{trainInfo.departureDate}</span>
                  <span className={styles.station}>{trainInfo.departureStation}</span>
                </motion.div>
                <motion.div 
                  className={styles.duration}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <FaClock />
                  <span>{trainInfo.duration}</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <span className={styles.time}>{trainInfo.arrivalTime}</span>
                  <span className={styles.date}>{trainInfo.arrivalDate}</span>
                  <span className={styles.station}>{trainInfo.arrivalStation}</span>
                </motion.div>
              </div>
            </div>
          </div>
          <motion.div 
            className={styles.ticketStatus}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span className={styles.statusBadge}>{status}</span>
            <span className={styles.classInfo}>{classInfo}</span>
            <span className={styles.pnrInfo}>PNR: {pnr}</span>
          </motion.div>
        </motion.div>

        {/* Ticket Body */}
        <div className={styles.ticketBody}>
          {/* Left Side - Details */}
          <motion.div 
            className={styles.detailsSection}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.div 
              className={styles.detailsRow}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3><FaUser className={styles.icon} /> Passenger Details</h3>
              <div className={styles.passengerInfo}>
                {passengers.map((passenger, index) => (
                  <div key={index} className={styles.passenger}>
                    <p>
                      <strong>{passenger.name}</strong> ({passenger.age} Yrs, {passenger.gender})
                    </p>
                    <p>Seat: <strong>{passenger.seat || 'Will be allocated'}</strong></p>
                    {passenger.berthPreference && passenger.berthPreference !== 'No Preference' && (
                      <p>Berth Preference: <strong>{passenger.berthPreference}</strong></p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              className={styles.detailsRow}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <h3>Booking Information</h3>
              <div className={styles.bookingInfo}>
                <p><strong>PNR No:</strong> {pnr}</p>
                <p><strong>Booking Status:</strong> {status}</p>
                {ticketData.transactionId && (
                  <p><strong>Transaction ID:</strong> {ticketData.transactionId}</p>
                )}
                {contactInfo?.email && (
                  <p><strong>E-Tickets sent to:</strong> {contactInfo.email}</p>
                )}
                {contactInfo?.mobile && (
                  <p><strong>Mobile:</strong> {contactInfo.mobile}</p>
                )}
              </div>
            </motion.div>

            {/* Round Robin Algorithm Info */}
            {roundRobinData && (
              <motion.div 
                className={styles.detailsRow}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <h3>Algorithm Optimization</h3>
                <div className={styles.algorithmInfo}>
                  <p><strong>Round Robin Algorithm Applied</strong></p>
                  <p>Queue Position: {roundRobinData.queuePosition || 'N/A'}</p>
                  <p>Wait Time: {roundRobinData.waitTime || 0} minutes</p>
                  <p>Time Slot: {roundRobinData.timeSlotAllocated || 'Allocated'}</p>
                </div>
              </motion.div>
            )}

            {/* Payment Summary */}
            <motion.div 
              className={styles.paymentSummary}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <h3><FaRupeeSign className={styles.icon} /> Payment Summary</h3>
              <div className={styles.fareBreakdown}>
                {fareBreakdown ? (
                  <>
                    <div className={styles.fareRow}>
                      <span>Base Fare ({passengers.length} {passengers.length > 1 ? 'Passengers' : 'Passenger'})</span>
                      <span>{formatCurrency(fareBreakdown.baseFare)}</span>
                    </div>
                    <div className={styles.fareRow}>
                      <span>Reservation Charges</span>
                      <span>{formatCurrency(fareBreakdown.reservationCharges)}</span>
                    </div>
                    <div className={styles.fareRow}>
                      <span>Superfast Charges</span>
                      <span>{formatCurrency(fareBreakdown.superfastCharges)}</span>
                    </div>
                    <div className={styles.fareRow}>
                      <span>GST (5%)</span>
                      <span>{formatCurrency(fareBreakdown.gstAmount)}</span>
                    </div>
                    {fareBreakdown.mealsPrice > 0 && (
                      <div className={styles.fareRow}>
                        <span>Meals</span>
                        <span>{formatCurrency(fareBreakdown.mealsPrice)}</span>
                      </div>
                    )}
                    {fareBreakdown.discountAmount > 0 && (
                      <div className={styles.fareRow}>
                        <span>Discount</span>
                        <span>-{formatCurrency(fareBreakdown.discountAmount)}</span>
                      </div>
                    )}
                    <div className={styles.divider}></div>
                    <div className={`${styles.fareRow} ${styles.totalRow}`}>
                      <span>Total Amount</span>
                      <span className={styles.totalAmount}>
                        {formatCurrency(fareBreakdown.totalAmount || paymentDetails?.total)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className={`${styles.fareRow} ${styles.totalRow}`}>
                    <span>Total Amount</span>
                    <span className={styles.totalAmount}>
                      {formatCurrency(paymentDetails?.total || 0)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side - QR Code */}
          <motion.div 
            className={styles.qrSection}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div 
              className={styles.qrContainer}
              whileHover={{ scale: 1.03 }}
            >
              {qrCode ? (
                <motion.img 
                  src={qrCode} 
                  alt="QR Code" 
                  className={styles.qrImage}
                  initial={{ rotate: -5 }}
                  animate={{ rotate: 0 }}
                />
              ) : (
                <div className={styles.qrPlaceholder}>
                  <FaQrcode className={styles.qrIcon} />
                  <p>QR code will be generated</p>
                </div>
              )}
              <p>Scan to view ticket on any device</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Important Notice */}
        <motion.div 
          className={styles.notice}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <p>
            <strong>Important:</strong> Please carry this ticket confirmation along with original ID proof used during booking.
            Boarding will not be permitted without valid ID proof. Arrive at the station at least 30 minutes before departure.
          </p>
        </motion.div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div 
        className={styles.actionButtons}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <motion.button 
          className={styles.printButton}
          onClick={handlePrintTicket}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaPrint /> Print Ticket
        </motion.button>
        
        <motion.button 
          className={styles.downloadButton}
          onClick={handleDownloadTicket}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FaFileDownload /> Download Ticket
        </motion.button>
        
        <motion.button 
          className={styles.viewBookingsButton}
          onClick={handleViewBookings}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          View My Bookings
        </motion.button>
        
        <motion.button 
          className={styles.bookAgainButton}
          onClick={handleReturnHome}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Book Another Train
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default TicketConfirmation;
