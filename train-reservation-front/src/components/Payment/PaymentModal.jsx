import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config/api";
import { 
  FaRupeeSign, FaTrain, FaUser, FaTag, FaCreditCard, 
  FaWallet, FaCheck, FaShieldAlt, FaClock,
  FaArrowLeft, FaSpinner, FaPaypal
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./PaymentModal.module.css";

const PaymentModal = () => {
  const [promoCode, setPromoCode] = useState("");
  const [bookingDetails, setBookingDetails] = useState(null);
  const [paymentState, setPaymentState] = useState({
    isProcessing: false,
    clientSecret: null,
    paypalOrderId: null,
    error: null,
    status: 'initial'
  });
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);

  // Prevent navigation away from payment page during processing
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (paymentState.status === 'processing') {
        e.preventDefault();
        e.returnValue = 'Payment is being processed. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    const handlePopState = (e) => {
      if (paymentState.status === 'processing') {
        e.preventDefault();
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.pathname);
        alert('Payment is being processed. Please wait for completion.');
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Push initial state to prevent back navigation during processing
    if (paymentState.status === 'processing') {
      window.history.pushState(null, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [paymentState.status]);

  // Utility function to parse price from various formats
  const parsePrice = (priceString) => {
    if (typeof priceString === 'number') return priceString;
    return parseFloat(priceString.toString().replace(/[Rs.,\s]/g, '')) || 0;
  };

  // Utility function to format currency
  const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return 'Rs.' + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    console.log("Location state:", location.state);
    if (!location.state?.selectedTrain || !location.state?.bookingId) {
      navigate('/');
    } else {
      setBookingDetails({
        ...location.state,
        amount: location.state.amount || 
               (location.state.fareBreakdown?.totalAmount) || 
               (parsePrice(location.state.selectedFare?.price) * 
               (location.state.travelers?.length || 1))
      });
      
      // Initialize payment based on the selected method
      if (location.state?.paymentMethod) {
        initializePaymentMethod(location.state.paymentMethod, location.state.amount);
      }
    }
  }, [location.state, navigate]);
  
  const initializePaymentMethod = async (method, amount) => {
    if (method === 'stripe') {
      // For demo purposes, just set a dummy client secret
      setPaymentState(prev => ({ 
        ...prev, 
        clientSecret: 'pi_mock_' + Date.now() + '_secret_mock_' + Date.now(),
        status: 'initial'
      }));
    } else if (method === 'paypal') {
      try {
        setPaymentState(prev => ({ ...prev, status: 'processing' }));
        const response = await fetch(API_BASE_URL + '/api/payments/paypal/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ amount: parsePrice(amount) })
        });
        
        const data = await response.json();
        if (data.success) {
          setPaymentState(prev => ({ 
            ...prev, 
            paypalOrderId: data.orderID,
            status: 'initial'
          }));
        } else {
          setPaymentState(prev => ({ 
            ...prev, 
            error: data.message || 'Failed to initialize PayPal payment',
            status: 'failed'
          }));
        }
      } catch (error) {
        console.error("PayPal initialization error:", error);
        setPaymentState(prev => ({ 
          ...prev, 
          error: 'Failed to connect to payment service',
          status: 'failed'
        }));
      }
    }
  };

  const handleBackNavigation = () => {
    if (paymentState.status === 'processing') {
      alert('Payment is being processed. Please wait for completion.');
      return;
    }
    
    if (paymentState.status === 'succeeded') {
      alert('Payment has been completed. You cannot go back now.');
      return;
    }
    
    // Only allow back navigation if payment hasn't started or has failed
    navigate(-1);
  };

  const handlePayment = async () => {
    if (!bookingDetails || !bookingDetails.paymentMethod) {
      alert("Invalid payment information");
      return;
    }

    setPaymentState(prev => ({ ...prev, status: 'processing' }));

    try {
      let paymentResult;
      
      if (bookingDetails.paymentMethod === 'stripe') {
        // Mock Stripe payment
        paymentResult = {
          transactionId: 'stripe_' + Date.now(),
          status: 'succeeded',
          paymentMethod: 'stripe'
        };
      } else if (bookingDetails.paymentMethod === 'paypal') {
        // Mock PayPal payment
        paymentResult = {
          transactionId: 'paypal_' + Date.now(),
          status: 'succeeded',
          paymentMethod: 'paypal'
        };
      }

      // Update booking payment status
      const updateResponse = await fetch(`${API_BASE_URL}/api/bookings/${bookingDetails.bookingId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          transactionId: paymentResult.transactionId,
          status: 'Confirmed',
          paymentStatus: 'completed'
        })
      });

      if (updateResponse.ok) {
        setPaymentState(prev => ({ ...prev, status: 'succeeded' }));
        
        setTimeout(() => {
          navigate('/ticket-confirmation', { 
            state: { 
              bookingId: bookingDetails.bookingId,
              paymentId: paymentResult.transactionId,
              paymentStatus: 'succeeded',
              transactionId: paymentResult.transactionId,
              fareBreakdown: bookingDetails.fareBreakdown,
              pnr: bookingDetails.pnr,
              selectedTrain: bookingDetails.selectedTrain,
              selectedFare: bookingDetails.selectedFare,
              travelers: bookingDetails.travelers
            },
            replace: true 
          });
        }, 1500);
      } else {
        throw new Error('Failed to update booking payment status');
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentState(prev => ({ 
        ...prev, 
        error: error.message || 'Payment processing failed',
        status: 'failed'
      }));
    }
  };

  // For handling mock payments in development
  const handleMockPayment = () => {
    setPaymentState(prev => ({ ...prev, status: 'processing' }));
    
    // Simulate API delay
    setTimeout(() => {
      setPaymentState(prev => ({ ...prev, status: 'succeeded' }));
      
      // Navigate to confirmation after "success" with replace
      setTimeout(() => {
        const mockTransactionId = 'mock_payment_' + Date.now();
        navigate('/ticket-confirmation', { 
          state: { 
            bookingId: bookingDetails.bookingId,
            paymentId: mockTransactionId,
            paymentStatus: 'succeeded',
            transactionId: mockTransactionId,
            fareBreakdown: bookingDetails.fareBreakdown,
            pnr: bookingDetails.pnr,
            selectedTrain: bookingDetails.selectedTrain,
            selectedFare: bookingDetails.selectedFare,
            travelers: bookingDetails.travelers
          },
          replace: true 
        });
      }, 1500);
    }, 2000);
  };

  if (!bookingDetails) {
    return <div className={styles.loading}>Loading booking details...</div>;
  }

  const { selectedTrain, selectedFare, travelers = [] } = bookingDetails;
  const travelerCount = travelers.length || 1;
  
  // Get the selected payment method name for display
  const getPaymentMethodName = (methodId) => {
    const methodMap = {
      "stripe": "Credit/Debit Card (Stripe)",
      "paypal": "PayPal"
    };
    return methodMap[methodId] || methodId;
  };
  
  // Check if payment is being processed
  const isProcessing = paymentState.status === 'processing';
  
  // Check if payment has succeeded
  const hasSucceeded = paymentState.status === 'succeeded';

  return (
    <motion.div 
      className={styles.container} 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      ref={containerRef}
    >
      {/* Header */}
      <motion.div className={styles.header_top}>
        <button 
          className={styles.backButton}
          onClick={handleBackNavigation}
          disabled={isProcessing || hasSucceeded}
          style={{ 
            opacity: isProcessing || hasSucceeded ? 0.5 : 1,
            cursor: isProcessing || hasSucceeded ? 'not-allowed' : 'pointer'
          }}
        >
          <FaArrowLeft /> Back
        </button>
        
        <h1 className={styles.title}>Complete Payment</h1>
        <div className={styles.progressTracker}>
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div className={styles.progressStep}>
                <div className={`${styles.stepIndicator} ${
                  step < 4 ? styles.completed : styles.active
                }`}>
                  {step}
                </div>
                <span>
                  {step === 1 ? "Search" : 
                   step === 2 ? "Select" : 
                   step === 3 ? "Review" : "Pay"}
                </span>
              </div>
              {step < 4 && <div className={`${styles.progressConnector} ${step < 4 ? styles.completed : ''}`}></div>}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      <div className={styles.mainContent}>
        {/* Left Column - Booking Summary */}
        <div className={styles.leftColumn}>
          <motion.div 
            className={styles.summaryCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className={styles.cardTitle}>
              <FaTrain className={styles.cardIcon} /> Journey Summary
            </h2>
            <div className={styles.journeyDetails}>
              <div className={styles.trainInfo}>
                <span className={styles.trainNumber}>{selectedTrain.trainNumber}</span>
                <span className={styles.trainName}>{selectedTrain.trainName}</span>
              </div>
              
              <div className={styles.timeline}>
                <div className={styles.timeGroup}>
                  <span className={styles.time}>{selectedTrain.departureTime}</span>
                  <span className={styles.date}>{selectedTrain.departureDate}</span>
                  <span className={styles.station}>{selectedTrain.departureStation}</span>
                </div>
                
                <div className={styles.duration}>
                  <FaClock className={styles.clockIcon} />
                  <span>{selectedTrain.duration}</span>
                </div>
                
                <div className={styles.timeGroup}>
                  <span className={styles.time}>{selectedTrain.arrivalTime}</span>
                  <span className={styles.date}>{selectedTrain.arrivalDate}</span>
                  <span className={styles.station}>{selectedTrain.arrivalStation}</span>
                </div>
              </div>
              
              <div className={styles.classInfo}>
                <span>Class: {selectedFare.class}</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className={styles.summaryCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className={styles.cardTitle}>
              <FaUser className={styles.cardIcon} /> Passenger Details
            </h2>
            <div className={styles.passengerDetails}>
              {travelers.map((traveler, index) => (
                <div key={index} className={styles.passenger}>
                  <span className={styles.passengerName}>{traveler.name || `Passenger ${index + 1}`}</span>
                  <span className={styles.passengerMeta}>
                    {traveler.age} Yrs | {traveler.gender} | {traveler.berthPreference}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div 
            className={styles.summaryCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className={styles.cardTitle}>
              <FaRupeeSign className={styles.cardIcon} /> Fare Breakdown
            </h2>
            <div className={styles.fareDetails}>
              {bookingDetails.fareBreakdown ? (
                <>
                  <div className={styles.fareRow}>
                    <span>Base Fare ({travelers.length} {travelers.length > 1 ? 'Adults' : 'Adult'}) - {selectedFare.class}</span>
                    <span>{formatCurrency(bookingDetails.fareBreakdown.baseFare)}</span>
                  </div>
                  
                  <div className={styles.fareRow}>
                    <span>Reservation Charges</span>
                    <span>{formatCurrency(bookingDetails.fareBreakdown.reservationCharges)}</span>
                  </div>
                  
                  <div className={styles.fareRow}>
                    <span>Superfast Charges</span>
                    <span>{formatCurrency(bookingDetails.fareBreakdown.superfastCharges)}</span>
                  </div>
                  
                  <div className={styles.fareRow}>
                    <span>GST (5%)</span>
                    <span>{formatCurrency(bookingDetails.fareBreakdown.gstAmount)}</span>
                  </div>
                  
                  {bookingDetails.fareBreakdown.mealsPrice > 0 && (
                    <div className={styles.fareRow}>
                      <span>Meals</span>
                      <span>{formatCurrency(bookingDetails.fareBreakdown.mealsPrice)}</span>
                    </div>
                  )}
                  
                  {bookingDetails.fareBreakdown.discountAmount > 0 && (
                    <div className={styles.fareRow}>
                      <span>Discount ({bookingDetails.couponCode})</span>
                      <span>-{formatCurrency(bookingDetails.fareBreakdown.discountAmount)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.fareRow}>
                  <span>Base Fare ({travelerCount} {travelerCount > 1 ? 'Adults' : 'Adult'}) - {selectedFare.class}</span>
                  <span>{formatCurrency(parsePrice(selectedFare.price) * travelerCount)}</span>
                </div>
              )}
              
              <div className={styles.divider}></div>
              
              <div className={`${styles.fareRow} ${styles.totalRow}`}>
                <span>Total Amount</span>
                <span className={styles.totalAmount}>
                  {formatCurrency(bookingDetails.amount)}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Payment Section */}
        <div className={styles.rightColumn}>
          <motion.div 
            className={styles.paymentCard}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className={styles.paymentTitle}>Payment Information</h2>
            
            <div className={styles.selectedPaymentMethod}>
              <h3 className={styles.sectionTitle}>Selected Payment Method:</h3>
              <div className={styles.paymentMethodDisplay}>
                {bookingDetails.paymentMethod === "stripe" && <FaCreditCard className={styles.methodIcon} />}
                {bookingDetails.paymentMethod === "paypal" && <FaPaypal className={styles.methodIcon} />}
                <span>{getPaymentMethodName(bookingDetails.paymentMethod)}</span>
              </div>
              
              {/* Booking Details */}
              <div className={styles.bookingInfo}>
                <p><strong>Booking ID:</strong> {bookingDetails.bookingId}</p>
                {bookingDetails.pnr && <p><strong>PNR:</strong> {bookingDetails.pnr}</p>}
              </div>
              
              {/* Payment method specific form fields */}
              {bookingDetails.paymentMethod === "stripe" && (
                <div className={styles.paymentForm}>
                  <div className={styles.formGroup}>
                    <label>Card Number</label>
                    <input 
                      type="text" 
                      placeholder="1234 5678 9012 3456" 
                      className={styles.input} 
                      disabled={isProcessing || hasSucceeded}
                    />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Expiry Date</label>
                      <input 
                        type="text" 
                        placeholder="MM/YY" 
                        className={styles.input} 
                        disabled={isProcessing || hasSucceeded}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>CVV</label>
                      <input 
                        type="password" 
                        placeholder="•••" 
                        className={styles.input} 
                        disabled={isProcessing || hasSucceeded}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Name on Card</label>
                    <input 
                      type="text" 
                      placeholder="Cardholder Name" 
                      className={styles.input} 
                      disabled={isProcessing || hasSucceeded}
                    />
                  </div>
                </div>
              )}
              
              {bookingDetails.paymentMethod === "paypal" && (
                <div className={styles.paymentForm}>
                  <div className={styles.paypalMessage}>
                    <p>You will be redirected to PayPal to complete your payment securely.</p>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.securityAssurance}>
              <FaShieldAlt className={styles.shieldIcon} />
              <span>Your payment is secured with 256-bit encryption</span>
            </div>

            {/* Show processing message */}
            {isProcessing && (
              <div className={styles.processingMessage}>
                <FaSpinner className={styles.spinner} />
                <p>Processing your payment... Please do not refresh or go back.</p>
              </div>
            )}

            {/* Show success message */}
            {hasSucceeded && (
              <div className={styles.successMessage}>
                <FaCheck className={styles.checkIcon} />
                <p>Payment successful! Redirecting to confirmation...</p>
              </div>
            )}

            {paymentState.error && (
              <div className={styles.errorMessage}>
                {paymentState.error}
              </div>
            )}

            <div className={styles.buttonContainer}>
              <motion.button 
                className={`${styles.payNowButton} ${hasSucceeded ? styles.successButton : ''}`}
                onClick={handleMockPayment}
                whileHover={{ scale: isProcessing || hasSucceeded ? 1 : 1.02 }}
                whileTap={{ scale: isProcessing || hasSucceeded ? 1 : 0.98 }}
                disabled={isProcessing || hasSucceeded}
              >
                {isProcessing && <FaSpinner className={styles.spinner} />}
                {hasSucceeded && <FaCheck className={styles.checkIcon} />}
                {isProcessing ? 'Processing Payment...' : 
                hasSucceeded ? 'Payment Successful!' : 
                `Pay Now ${formatCurrency(bookingDetails.amount)}`}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentModal;