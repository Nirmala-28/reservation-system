import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';
import { 
  FaTrain, 
  FaUser, 
  FaCalendarAlt, 
  FaMoneyBillWave,
  FaTicketAlt,
  FaInfoCircle,
  FaDownload,
  FaPrint,
  FaArrowLeft,
  FaSpinner,
  FaSearch,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTimes
} from 'react-icons/fa';
import styles from './BookingHistory.module.css';

const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [cancellingId, setCancellingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const response = await fetch(API_BASE_URL + '/api/bookings/my-bookings', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Filter out bookings with invalid train data
          const validBookings = data.data.filter(booking => 
            booking && booking.train && booking.train.trainNumber && booking.train.trainName
          );
          setBookings(validBookings);
        } else {
          setError(data.message || 'Failed to fetch bookings');
        }
      } catch (err) {
        setError('Failed to connect to the server');
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleViewDetails = (bookingId) => {
    navigate(`/ticket-confirmation`, { state: { bookingId } });
  };

  // Reconstructs the state PaymentModal expects from a stored booking —
  // used for bookings sitting in 'Pending' (either awaiting initial
  // payment, or promoted from a waitlist and now awaiting payment).
  const buildFareBreakdown = (booking) => {
    const breakdown = booking.paymentDetails?.breakdown || [];
    const findAmount = (labelPrefix) => {
      const item = breakdown.find(b => b.label?.toLowerCase().startsWith(labelPrefix.toLowerCase()));
      return item ? parseFloat(String(item.amount).replace(/[^0-9.-]/g, '')) || 0 : 0;
    };
    return {
      baseFare: findAmount('Base Fare'),
      reservationCharges: findAmount('Reservation'),
      superfastCharges: findAmount('Superfast'),
      vatAmount: findAmount('VAT'),
      mealsPrice: findAmount('Meals'),
      discountAmount: booking.paymentDetails?.discount?.discountAmount || 0,
      totalAmount: booking.paymentDetails?.total
    };
  };

  const handleCompletePayment = (booking) => {
    const trainDetails = getTrainDetails(booking);
    const availability = booking.trainAvailability || {};
    navigate('/payment', {
      state: {
        bookingId: booking._id,
        amount: booking.paymentDetails?.total,
        pnr: booking.pnr,
        paymentMethod: booking.paymentDetails?.paymentMethod || 'paypal',
        selectedTrain: {
          trainNumber: trainDetails.trainNumber,
          trainName: trainDetails.trainName,
          departureTime: trainDetails.departureTime,
          departureStation: trainDetails.departureStation,
          departureDate: availability.departureDate,
          arrivalTime: trainDetails.arrivalTime,
          arrivalStation: trainDetails.arrivalStation,
          arrivalDate: availability.arrivalDate,
          duration: availability.duration
        },
        selectedFare: { class: booking.classInfo },
        travelers: booking.passengers || [],
        fareBreakdown: buildFareBreakdown(booking),
        isWaitlist: false
      }
    });
  };

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }
    
    try {
      setCancellingId(bookingId);
      const response = await fetch(`${API_BASE_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBookings(bookings.map(booking => 
          booking._id === bookingId ? { ...booking, status: 'Cancelled' } : booking
        ));
      } else {
        setError(data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      setError('Failed to connect to the server');
      console.error('Error cancelling booking:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const getSortedBookings = () => {
    const filteredBookings = searchTerm
      ? bookings.filter(booking => {
          if (!booking || !booking.train) return false;
          
          const trainName = booking.train.trainName || '';
          const trainNumber = booking.train.trainNumber || '';
          const pnr = booking.pnr || '';
          
          return (
            trainName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trainNumber.includes(searchTerm) ||
            pnr.includes(searchTerm)
          );
        })
      : bookings;
    
    return filteredBookings.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  };

  const sortedBookings = getSortedBookings();

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed':
        return '#22c55e';
      case 'Pending':
        return '#f59e0b';
      case 'Cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  // Helper function to safely get train details
  const getTrainDetails = (booking) => {
    if (!booking || !booking.train) {
      return {
        trainNumber: 'N/A',
        trainName: 'Unknown Train',
        departureTime: 'N/A',
        arrivalTime: 'N/A',
        departureStation: 'N/A',
        arrivalStation: 'N/A'
      };
    }

    // Use trainAvailability for schedule-specific info (stations, times)
    // Use train for basic train info (number, name)
    const availability = booking.trainAvailability || {};

    return {
      trainNumber: booking.train.trainNumber || 'N/A',
      trainName: booking.train.trainName || 'Unknown Train',
      departureTime: availability.departureTime || 'N/A',
      arrivalTime: availability.arrivalTime || 'N/A',
      departureStation: availability.departureStation || 'N/A',
      arrivalStation: availability.arrivalStation || 'N/A'
    };
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} />
        <p>Loading your booking history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <FaInfoCircle className={styles.errorIcon} />
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button className={styles.goBackButton} onClick={() => navigate('/')}>
          <FaArrowLeft /> Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/')}>
          <FaArrowLeft /> Back
        </button>
        <h1 className={styles.title}>Your Booking History</h1>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search by train name, number or PNR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <FaSearch className={styles.searchIcon} />
        </div>
        
        <button className={styles.sortButton} onClick={toggleSortOrder}>
          {sortOrder === 'desc' ? (
            <>
              <FaSortAmountDown /> Latest First
            </>
          ) : (
            <>
              <FaSortAmountUp /> Oldest First
            </>
          )}
        </button>
      </div>

      {sortedBookings.length === 0 ? (
        <div className={styles.emptyState}>
          <FaTicketAlt className={styles.emptyIcon} />
          <h2>No bookings found</h2>
          <p>
            {searchTerm 
              ? `No bookings match your search "${searchTerm}"`
              : "You haven't made any train bookings yet."
            }
          </p>
          <button 
            className={styles.bookNowButton} 
            onClick={() => navigate('/')}
          >
            {searchTerm ? 'Clear Search' : 'Book Your First Train'}
          </button>
        </div>
      ) : (
        <div className={styles.bookingsList}>
          {sortedBookings.map((booking) => {
            const trainDetails = getTrainDetails(booking);
            
            return (
              <div key={booking._id} className={styles.bookingCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.trainInfo}>
                    <FaTrain className={styles.trainIcon} />
                    <div className={styles.trainDetails}>
                      <span className={styles.trainNumber}>{trainDetails.trainNumber}</span>
                      <span className={styles.trainName}>{trainDetails.trainName}</span>
                    </div>
                  </div>
                  <div 
                    className={styles.bookingStatus}
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                  >
                    {booking.status || 'Confirmed'}
                  </div>
                </div>
                
                <div className={styles.journeyDetails}>
                  <div className={styles.stationContainer}>
                    <div className={styles.station}>
                      <div className={styles.stationTime}>{trainDetails.departureTime}</div>
                      <div className={styles.stationName}>{trainDetails.departureStation}</div>
                      <div className={styles.stationDate}>{formatDate(booking.travelDate)}</div>
                    </div>
                    
                    <div className={styles.journeyLine}>
                      <div className={styles.dot}></div>
                      <div className={styles.line}></div>
                      <div className={styles.dot}></div>
                    </div>
                    
                    <div className={styles.station}>
                      <div className={styles.stationTime}>{trainDetails.arrivalTime}</div>
                      <div className={styles.stationName}>{trainDetails.arrivalStation}</div>
                      <div className={styles.stationDate}>{formatDate(booking.arrivalDate || booking.travelDate)}</div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.bookingDetails}>
                  <div className={styles.detailItem}>
                    <FaTicketAlt className={styles.detailIcon} />
                    <span className={styles.detailLabel}>PNR:</span>
                    <span className={styles.detailValue}>{booking.pnr || 'N/A'}</span>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <FaUser className={styles.detailIcon} />
                    <span className={styles.detailLabel}>Passengers:</span>
                    <span className={styles.detailValue}>
                      {booking.passengers ? booking.passengers.length : 0}
                    </span>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <FaCalendarAlt className={styles.detailIcon} />
                    <span className={styles.detailLabel}>Booked on:</span>
                    <span className={styles.detailValue}>{formatDate(booking.createdAt)}</span>
                  </div>
                  
                  <div className={styles.detailItem}>
                    <FaMoneyBillWave className={styles.detailIcon} />
                    <span className={styles.detailLabel}>Amount:</span>
                    <span className={styles.detailValue}>
                      NPR {(booking.paymentDetails && booking.paymentDetails.total) || 
                        (booking.totalAmount) || '0'}
                    </span>
                  </div>
                </div>
                
                <div className={styles.actionsContainer}>
                  <button 
                    className={`${styles.actionButton} ${styles.viewButton}`}
                    onClick={() => handleViewDetails(booking._id)}
                  >
                    <FaInfoCircle /> View Details
                  </button>
                  
                  {booking.status === 'Pending' && (
                    <button
                      className={`${styles.actionButton} ${styles.viewButton}`}
                      onClick={() => handleCompletePayment(booking)}
                    >
                      <FaMoneyBillWave /> Complete Payment
                    </button>
                  )}

                  {booking.status !== 'Cancelled' && (
                    <button
                      className={`${styles.actionButton} ${styles.cancelButton}`}
                      onClick={() => cancelBooking(booking._id)}
                      disabled={cancellingId === booking._id}
                    >
                      {cancellingId === booking._id ? (
                        <FaSpinner className={styles.spinner} />
                      ) : (
                        <>
                          <FaTimes /> Cancel
                        </>
                      )}
                    </button>
                  )}
                  
                  <button 
                    className={styles.actionButton}
                    disabled={booking.status === 'Cancelled'}
                  >
                    <FaDownload /> Download
                  </button>
                  
                  <button 
                    className={styles.actionButton}
                    disabled={booking.status === 'Cancelled'}
                  >
                    <FaPrint /> Print
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookingHistory;