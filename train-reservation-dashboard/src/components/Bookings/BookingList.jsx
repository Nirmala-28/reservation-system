import { useState, useEffect } from 'react';
import useApi from '../../hooks/useApi';
import { CURRENCY_CONFIG } from '../../config/currency';
import styles from './BookingList.module.css';

const BookingList = () => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { get } = useApi();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching bookings...');
        
        const response = await get('/api/admin/bookings');
        console.log('Bookings API response:', response);
        
        // Handle the response based on the API structure
        if (response && response.success && Array.isArray(response.data)) {
          console.log('Setting bookings from response.data:', response.data);
          setBookings(response.data);
        } else if (response && Array.isArray(response.data)) {
          console.log('Setting bookings from response.data (no success flag):', response.data);
          setBookings(response.data);
        } else if (Array.isArray(response)) {
          console.log('Setting bookings from direct response:', response);
          setBookings(response);
        } else {
          console.error('Unexpected response format:', response);
          setBookings([]);
          setError('Invalid bookings data format received from server');
        }
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        setError(`Failed to load bookings: ${error.message || 'Please try again.'}`);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const filteredBookings = Array.isArray(bookings) ? bookings.filter(booking => {
    if (!booking) return false;
    
    // Date filtering
    const bookingDate = booking.travelDate || booking.departureDate || booking.createdAt;
    
    if (filter === 'upcoming') {
      return bookingDate && new Date(bookingDate) > new Date();
    }
    if (filter === 'past') {
      return bookingDate && new Date(bookingDate) <= new Date();
    }
    if (dateFilter) {
      const filterDate = new Date(dateFilter).toISOString().split('T')[0];
      const bookingDateOnly = new Date(bookingDate).toISOString().split('T')[0];
      return bookingDateOnly === filterDate;
    }

    // Status filtering
    if (statusFilter !== 'all') {
      return booking.status?.toLowerCase() === statusFilter.toLowerCase();
    }

    // Search filtering
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        booking.pnr?.toLowerCase().includes(searchLower) ||
        booking._id?.toLowerCase().includes(searchLower) ||
        booking.user?.name?.toLowerCase().includes(searchLower) ||
        booking.user?.email?.toLowerCase().includes(searchLower) ||
        booking.train?.trainNumber?.toLowerCase().includes(searchLower) ||
        booking.train?.trainName?.toLowerCase().includes(searchLower) ||
        booking.trainAvailability?.trainNumber?.toLowerCase().includes(searchLower) ||
        booking.trainAvailability?.trainName?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : []; // Ensure client-side sorting by newest first

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.replace(/:00$/, '');
  };

  const formatCurrency = (amount) => {
    if (!amount) return CURRENCY_CONFIG.symbol + '0';
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return CURRENCY_CONFIG.symbol + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const getAlgorithmColor = (algorithm) => {
    const colors = {
      'SegmentTree': '#e0f2fe',
      'RoundRobin': '#fef3c7',
      'PriorityQueue': '#fce7f3',
      'Dijkstra': '#dcfce7'
    };
    return colors[algorithm] || '#f3f4f6';
  };

  const getAlgorithmTextColor = (algorithm) => {
    const colors = {
      'SegmentTree': '#0369a1',
      'RoundRobin': '#d97706',
      'PriorityQueue': '#be185d',
      'Dijkstra': '#15803d'
    };
    return colors[algorithm] || '#374151';
  };

  const getAlgorithmLabel = (algorithm) => {
    const labels = {
      'SegmentTree': 'Segment Tree',
      'RoundRobin': 'Round Robin',
      'PriorityQueue': 'Priority Queue',
      'Dijkstra': 'Dijkstra'
    };
    return labels[algorithm] || algorithm;
  };

  const exportToCSV = () => {
    const headers = [
      'PNR', 'Train Number', 'Train Name', 'User Name', 'User Email',
      'Travel Date', 'Class', 'Passengers', 'Total Amount (रू)', 'Status', 'Created At'
    ];
    
    const csvData = filteredBookings.map(booking => [
      booking.pnr || '',
      booking.train?.trainNumber || booking.trainAvailability?.trainNumber || '',
      booking.train?.trainName || booking.trainAvailability?.trainName || '',
      booking.user?.name || '',
      booking.user?.email || booking.contactInfo?.email || '',
      formatDate(booking.travelDate),
      booking.classInfo || '',
      booking.passengers?.length || 0,
      booking.paymentDetails?.total || 0,
      booking.status || '',
      formatDate(booking.createdAt)
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={styles.bookingList}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3', 
            borderTop: '4px solid #007bff', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.bookingList}>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc3545' }}>
          <h3>Error Loading Bookings</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bookingList}>
      <div className={styles.header}>
        <h2>Booking Management</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={exportToCSV}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Export CSV
          </button>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.controls}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Bookings</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="waiting">Waiting</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className={styles.dateFilter}
        />

        <input
          type="text"
          placeholder="Search PNR, user, train..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.filterSelect}
          style={{ minWidth: '200px' }}
        />
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '4px'
      }}>
        <span>Total: <strong>{bookings.length}</strong> | Filtered: <strong>{filteredBookings.length}</strong></span>
        <span>Revenue: <strong>{formatCurrency(
          filteredBookings.reduce((sum, booking) => 
            sum + (parseFloat(booking.paymentDetails?.total) || 0), 0
          )
        )}</strong></span>
      </div>
      
      {filteredBookings.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          background: '#f9fafb', 
          borderRadius: '4px',
          color: '#6b7280'
        }}>
          {bookings.length === 0 
            ? "No bookings found in the system." 
            : "No bookings match your current filters."
          }
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{
                marginTop: '1rem',
                padding: '6px 12px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'block',
                margin: '1rem auto 0'
              }}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>PNR</th>
                <th>Train</th>
                <th>User</th>
                <th>Travel Date</th>
                <th>Class</th>
                <th>Passengers</th>
                <th>Meals</th>
                <th>Coupon</th>
                <th>Total</th>
                <th>Status</th>
                <th>Algorithms Used</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => (
                <tr key={booking._id || Math.random()}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <strong style={{ color: '#007bff' }}>{booking.pnr || 'N/A'}</strong>
                      <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                        {booking._id?.slice(-8) || 'N/A'}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div className={styles.trainInfo}>
                      <div className={styles.trainNumber}>
                        {booking.train?.trainNumber || booking.trainAvailability?.trainNumber || 'N/A'}
                      </div>
                      <div className={styles.trainName}>
                        {booking.train?.trainName || booking.trainAvailability?.trainName || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>
                        {booking.user?.name || booking.passengers?.[0]?.name || 'N/A'}
                      </div>
                      <div className={styles.userEmail}>
                        {booking.user?.email || booking.contactInfo?.email || 'N/A'}
                      </div>
                      {booking.contactInfo?.mobile && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {booking.contactInfo.mobile}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.datetime}>
                      <div>{formatDate(booking.travelDate)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Created: {formatDate(booking.createdAt)}
                      </div>
                    </div>
                  </td>
                  <td>{booking.classInfo || 'N/A'}</td>
                  <td>
                    <div>
                      <strong>{booking.passengers?.length || 0}</strong> passenger{(booking.passengers?.length || 0) !== 1 ? 's' : ''}
                    </div>
                    {booking.passengers && booking.passengers.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        {booking.passengers.slice(0, 2).map((passenger, index) => (
                          <div key={index} style={{ 
                            fontSize: '0.75rem', 
                            color: '#6b7280',
                            background: '#f3f4f6',
                            padding: '2px 4px',
                            borderRadius: '2px',
                            marginBottom: '2px'
                          }}>
                            {passenger.name} ({passenger.age}y)
                          </div>
                        ))}
                        {booking.passengers.length > 2 && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            +{booking.passengers.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    {booking.meals && booking.meals.length > 0 ? (
                      <ul className={styles.mealList}>
                        {booking.meals.slice(0, 2).map((mealItem, index) => (
                          <li key={index}>
                            {mealItem.meal?.name || 'Meal'} 
                            {mealItem.quantity && ` x${mealItem.quantity}`}
                          </li>
                        ))}
                        {booking.meals.length > 2 && (
                          <li style={{ color: '#6b7280' }}>+{booking.meals.length - 2} more</li>
                        )}
                      </ul>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>None</span>
                    )}
                  </td>
                  <td>
                    {booking.paymentDetails?.discount?.couponCode ? (
                      <div className={styles.couponInfo}>
                        <div className={styles.couponCode}>
                          {booking.paymentDetails.discount.couponCode}
                        </div>
                        <div style={{ color: '#059669', fontWeight: '600' }}>
                          -{formatCurrency(booking.paymentDetails.discount.discountAmount)}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>None</span>
                    )}
                  </td>
                  <td>
                    <strong>{formatCurrency(booking.paymentDetails?.total || 0)}</strong>
                  </td>
                  <td>
                    <span 
                      className={`${styles.status} ${
                        booking.status?.toLowerCase() === 'confirmed' ? styles.confirmed : 
                        booking.status?.toLowerCase() === 'cancelled' ? styles.cancelled : 
                        booking.status?.toLowerCase() === 'waiting' ? styles.pending :
                        styles.pending
                      }`}
                    >
                      {booking.status || 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {booking.algorithmLog && booking.algorithmLog.length > 0 ? (
                        // A booking can log the same algorithm more than once
                        // (e.g. Priority Queue for both "waitlisted" and later
                        // "promoted"). Group by algorithm so each shows one
                        // badge, with every event it logged in the tooltip.
                        Object.values(
                          booking.algorithmLog.reduce((groups, log) => {
                            (groups[log.algorithm] = groups[log.algorithm] || []).push(log);
                            return groups;
                          }, {})
                        ).map((logs, idx) => (
                          <div
                            key={idx}
                            title={logs.map(log => `${log.algorithm}: ${log.action} - ${log.result}`).join('\n')}
                            style={{
                              fontSize: '0.7rem',
                              background: getAlgorithmColor(logs[0].algorithm),
                              color: getAlgorithmTextColor(logs[0].algorithm),
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontWeight: '600',
                              display: 'inline-block',
                              width: 'fit-content',
                              cursor: 'pointer'
                            }}
                          >
                            {getAlgorithmLabel(logs[0].algorithm)}
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          No algorithm data
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BookingList;