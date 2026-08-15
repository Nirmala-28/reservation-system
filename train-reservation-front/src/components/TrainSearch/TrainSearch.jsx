import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaArrowRight, FaTrain, FaCalendarAlt, FaSearch, FaClock, FaMapMarkerAlt, FaCheckCircle, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./TrainSearch.module.css";
import TrainDetailsModal from "./TrainDetailsModal";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE_URL } from "../../config/api";

const TrainSearch = () => {
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [selectedFare, setSelectedFare] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [trains, setTrains] = useState([]);
  const [dijkstraData, setDijkstraData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  
  const { isAuthenticated } = useContext(AuthContext);
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const searchParams = location.state || {
    fromStation: '',
    toStation: '',
    departureDate: ''
  };
  
  const extractStationCode = (stationString = '') => {
    if (!stationString) return '';
    return stationString.split(',')[0].trim();
  };

  const fromStationCode = extractStationCode(searchParams.fromStation);
  const fromStationName = searchParams.fromStation ? searchParams.fromStation.split(',')[1] || '' : '';
  const toStationCode = extractStationCode(searchParams.toStation);
  const toStationName = searchParams.toStation ? searchParams.toStation.split(',')[1] || '' : '';
  
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  const formattedDate = formatDisplayDate(searchParams.departureDate);
  
  useEffect(() => {
    const fetchTrains = async () => {
      setLoading(true);
      
      if (!fromStationCode || !toStationCode || !searchParams.departureDate) {
        console.log("Invalid search parameters:", { 
          fromStationCode, 
          toStationCode, 
          departureDate: searchParams.departureDate
        });
        setLoading(false);
        setTrains([]);
        return;
      }
      
      try {
        // Updated to use train-availability endpoint with search functionality
        const response = await fetch(API_BASE_URL + '/api/train-availability/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            departureStation: searchParams.fromStation,
            arrivalStation: searchParams.toStation,
            departureDate: searchParams.departureDate
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log(`Found ${data.count} trains using intelligent search`);
          setTrains(data.data);
          if (data.dijkstra && data.dijkstra.found) {
            setDijkstraData(data.dijkstra);
          } else {
            setDijkstraData(null);
          }
        } else {
          setError('Failed to load train schedules');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching train data:', err);
        setError('Failed to load train schedules');
        setLoading(false);
      }
    };
    
    fetchTrains();
  }, [fromStationCode, toStationCode, searchParams.departureDate, searchParams.fromStation, searchParams.toStation]);

  const handleBookNow = (train, fareOption = null) => {
    const selectedFareOption = fareOption || 
      selectedFare?.[train._id || train.trainNumber] || 
      (train.fareOptions && train.fareOptions[0]);
    
    if (!selectedFareOption) {
      alert("Please select a fare class before booking");
      return;
    }
    
    if (!isAuthenticated) {
      navigate('/login', { 
        state: { 
          from: '/trainview',
          searchParams: searchParams,
          selectedTrain: train,
          selectedFare: selectedFareOption
        } 
      });
      return;
    }
    
    navigate('/reviewbooking', { 
      state: { 
        selectedTrain: train,
        selectedFare: selectedFareOption,
        departureDate: searchParams.departureDate,
        fromStation: searchParams.fromStation,
        toStation: searchParams.toStation
      } 
    });
  };
  
  const handleFareSelect = (trainId, fareOption) => {
    setSelectedFare(prev => ({
      ...prev,
      [trainId]: fareOption
    }));
  };
  
  const isFareSelected = (trainId, fareOption) => {
    return selectedFare && 
           selectedFare[trainId] && 
           selectedFare[trainId].class === fareOption.class;
  };
  
  const generateDateOptions = () => {
    const dates = [];
    const currentDate = searchParams.departureDate 
      ? new Date(searchParams.departureDate) 
      : (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow;
        })();

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    
    for (let i = -2; i <= 3; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);

      const dateMidnight = new Date(date);
      dateMidnight.setHours(0, 0, 0, 0);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
      const dayNum = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      
      dates.push({
        full: date.toISOString().split('T')[0],
        display: `${dayName} ${dayNum}`,
        month: month,
        isPast: dateMidnight < todayMidnight
      });
    }
    
    return dates;
  };
  
  const dateOptions = generateDateOptions();
  
  const handleDateChange = (newDate) => {
    navigate('/trainview', { 
      state: { 
        ...searchParams,
        departureDate: newDate
      } 
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>
          <FaSpinner className={styles.spinner} />
          <p>Searching for available trains...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>
          <FaExclamationTriangle className={styles.errorIcon} />
          <h3>{error}</h3>
          <button 
            className={styles.searchBtn}
            onClick={() => navigate('/')}
          >
            Return to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className={styles.container}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      ref={containerRef}
    >
      <motion.div 
        className={styles.leftSection}
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div 
          className={styles.searchHeader}
          whileHover={{ scale: 1.01 }}
        >
          <h2 className={styles.heading}>
            <motion.span
              initial={{ rotate: -90 }}
              animate={{ rotate: 0 }}
              transition={{ delay: 0.2 }}
            >
              <FaTrain className={styles.icon} />
            </motion.span>
            Train Search Results
          </h2>
          <div className={styles.route}>
            <motion.div 
              className={styles.station}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <FaMapMarkerAlt className={styles.stationIcon} />
              <div>
                <span className={styles.stationCode}>{fromStationCode}</span>
                <span className={styles.stationName}>{fromStationName}</span>
              </div>
            </motion.div>
            <motion.div 
              className={styles.directionArrow}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              →
            </motion.div>
            <motion.div 
              className={styles.station}
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <FaMapMarkerAlt className={styles.stationIcon} />
              <div>
                <span className={styles.stationCode}>{toStationCode}</span>
                <span className={styles.stationName}>{toStationName}</span>
              </div>
            </motion.div>
          </div>
          <motion.div 
            className={styles.journeyDate}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <FaCalendarAlt className={styles.calendarIcon} />
            <span>{formattedDate}</span>
          </motion.div>
          <motion.button 
            className={styles.searchBtn}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
          >
            <FaSearch className={styles.searchIcon} /> Modify Search
          </motion.button>
        </motion.div>

        <motion.div 
          className={styles.dateSelectorContainer}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className={styles.sectionTitle}>
            <FaCalendarAlt className={styles.icon} /> Select Journey Date
          </h3>
          <div className={styles.dateSelector}>
            <motion.button 
              className={styles.arrow}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaArrowLeft />
            </motion.button>
            {dateOptions.map((date, index) => (
              <motion.div 
                key={index} 
                className={`${styles.date} ${date.full === searchParams.departureDate ? styles.activeDate : ''} ${date.isPast ? styles.pastDate : ''}`}
                whileHover={date.isPast ? {} : { scale: 1.05 }}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                onClick={() => !date.isPast && handleDateChange(date.full)}
                title={date.isPast ? 'Cannot select a past date' : ''}
              >
                <div className={styles.dateDay}>{date.display.split(' ')[0]}</div>
                <div className={styles.dateNumber}>{date.display.split(' ')[1]}</div>
                <div className={styles.dateMonth}>{date.month}</div>
              </motion.div>
            ))}
            <motion.button 
              className={styles.arrow}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <FaArrowRight />
            </motion.button>
          </div>
        </motion.div>

        <motion.div 
          className={styles.loginStatus}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className={styles.sectionTitle}>Booking Status</h3>
          <div className={styles.statusInfo}>
            {isAuthenticated ? (
              <div className={styles.loggedInStatus}>
                <FaCheckCircle className={styles.statusIcon} />
                <p>You are logged in and ready to book tickets.</p>
              </div>
            ) : (
              <div className={styles.loggedOutStatus}>
                <p>You need to log in before booking tickets.</p>
                <motion.button 
                  className={styles.loginBtn}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/login', { 
                    state: { from: '/trainview', searchParams } 
                  })}
                >
                  Log In to Book
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div 
          className={styles.travelTips}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className={styles.sectionTitle}>Travel Tips</h3>
          <p className={styles.infoText}>
            Bookings are processed using intelligent scheduling ensuring fair allocation. 
            All passengers get equal priority and efficient processing.
          </p>
        </motion.div>
      </motion.div>

      <motion.div 
        className={styles.rightSection}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div 
          className={styles.resultsHeader}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className={styles.availableTrains}>
            Available Trains 
            <span className={styles.trainCount}>
              {trains.length} trains found
            </span>
          </h3>
          <motion.div 
            className={styles.sortFilter}
            whileHover={{ scale: 1.02 }}
          >
            <select className={styles.sortDropdown}>
              <option>Sort by: Departure Time</option>
              <option>Sort by: Arrival Time</option>
              <option>Sort by: Duration</option>
              <option>Sort by: Price (Low to High)</option>
            </select>
          </motion.div>
        </motion.div>

        {trains.length > 0 ? (
          trains.map((train, index) => {
            const trainId = train._id || train.trainNumber;
            
            return (
              <motion.div 
                key={trainId} 
                className={styles.trainCard}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ y: -5 }}
                layout
              >
              {(() => {
                const isTrainFull = train.fareOptions && train.fareOptions.length > 0 &&
                  train.fareOptions.every(f => f.availableSeats === 0 || f.availableSeats === undefined);
                const hasWaitlistCapacity = train.fareOptions?.some(f => Number(f.waitingList || 0) > 0);
                return (
                  <>
                  <div className={styles.trainHeader}>
                    <h4 className={styles.trainName}>{train.trainNumber} - {train.trainName}</h4>
                    <motion.div 
                      className={styles.trainRating}
                      whileHover={{ scale: 1.1 }}
                    >
                      {train.rating} ★
                    </motion.div>
                    {isTrainFull && hasWaitlistCapacity && (
                      <div style={{ background: '#f59e0b', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                        ⏳ Waitlist Available
                      </div>
                    )}
                    <div className={styles.systemBadge}>
                      ⚡ Optimized
                    </div>
                  </div>
                
                <div className={styles.trainDetails}>
                  <div className={styles.timing}>
                    <motion.div 
                      className={styles.timeGroup}
                      initial={{ x: -10 }}
                      animate={{ x: 0 }}
                    >
                      <div className={styles.time}>{train.departureTime}</div>
                      <div className={styles.station}>{train.departureStation}</div>
                      <div className={styles.trainDate}>{train.departureDate ? new Date(train.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
                    </motion.div>
                    
                    <div className={styles.durationContainer}>
                      <div className={styles.durationLine}></div>
                      <motion.div 
                        className={styles.duration}
                        whileHover={{ scale: 1.1 }}
                      >
                        <FaClock className={styles.clockIcon} /> {train.duration}
                      </motion.div>
                      <div className={styles.durationLine}></div>
                    </div>
                    
                    <motion.div 
                      className={styles.timeGroup}
                      initial={{ x: 10 }}
                      animate={{ x: 0 }}
                    >
                      <div className={styles.time}>{train.arrivalTime}</div>
                      <div className={styles.station}>{train.arrivalStation}</div>
                      <div className={styles.trainDate}>{train.arrivalDate ? new Date(train.arrivalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</div>
                    </motion.div>
                  </div>
                  
                  <div className={styles.trainInfo}>
                    <p className={styles.runDays}>
                      <strong>Runs on:</strong> 
                      <motion.span 
                        className={styles.badge}
                        whileHover={{ scale: 1.05 }}
                      >
                        {train.runDays}
                      </motion.span>
                    </p>
                    {train.timeQuantum && (
                      <p className={styles.processingInfo}>
                        <strong>Processing Time:</strong> {train.timeQuantum} minutes
                      </p>
                    )}
                  </div>
                </div>
                
                <div className={styles.fareContainer}>
                  <div className={styles.fare}>
                    {train.fareOptions && train.fareOptions.map((fare, i) => (
                      <motion.div 
                        key={i} 
                        className={`${styles.seatType} ${isFareSelected(trainId, fare) ? styles.selectedFare : ''}`}
                        style={{ 
                          borderColor: fare.color,
                          backgroundColor: isFareSelected(trainId, fare) ? `${fare.color}20` : 'transparent' 
                        }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleFareSelect(trainId, fare)}
                      >
                        {isFareSelected(trainId, fare) && (
                          <div className={styles.selectedIndicator}>
                            <FaCheckCircle className={styles.checkIcon} />
                          </div>
                        )}
                        <div className={styles.className}>{fare.class}</div>
                        <div className={styles.price}>{fare.price}</div>
                        <div className={styles.availability}>
                          Available: {fare.availableSeats}/{fare.totalSeats}
                        </div>
                        {fare.waitingList > 0 && (
                          <div className={styles.waitingList}>WL: {fare.waitingList}</div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  <div className={styles.actions}>
                    <motion.button 
                      className={styles.viewBtn}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedTrain(train)}
                    >
                      View Details
                    </motion.button>
                    <motion.button 
                      className={styles.bookBtn}
                      style={isTrainFull && hasWaitlistCapacity ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' } : {}}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleBookNow(train)}
                      disabled={isTrainFull && !hasWaitlistCapacity}
                    >
                      {isTrainFull ? '⏳ Join Waitlist' : 'Book Now'}
                    </motion.button>
                  </div>
                </div>
                </>
                );
              })()}
              </motion.div>
            );
          })
        ) : (
          <>
            {dijkstraData ? (
              <motion.div 
                className={styles.dijkstraBanner}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginTop: '1rem', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <div style={{ background: '#eff6ff', color: '#3b82f6', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>No direct trains found</h3>
                    <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>Dijkstra recommends this shortest connecting route ({dijkstraData.totalDurationMinutes} min travel time). Each leg must be booked separately.</p>
                  </div>
                </div>
                
                <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>Suggested Route</div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '500', color: '#0f172a' }}>
                    {dijkstraData.path.map((station, index) => (
                      <React.Fragment key={index}>
                        <div style={{ background: '#fff', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{station}</div>
                        {index < dijkstraData.path.length - 1 && (
                          <div style={{ color: '#94a3b8' }}>→</div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {dijkstraData.hops.map((hop, index) => (
                    <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f1f5f9', padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#334155' }}>Leg {index + 1}</span>
                        <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: '500' }}>{hop.trainNumber} - {hop.trainName}</span>
                      </div>
                      <div style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', background: '#fff' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' }}>Departs</span>
                          <span style={{ color: '#0f172a', fontWeight: '500' }}>{hop.from} <span style={{ color: '#3b82f6' }}>{hop.departureTime}</span></span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' }}>Arrives</span>
                          <span style={{ color: '#0f172a', fontWeight: '500' }}>{hop.to} <span style={{ color: '#3b82f6' }}>{hop.arrivalTime}</span></span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginLeft: 'auto', textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: '600' }}>Duration</span>
                          <span style={{ color: '#0f172a', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><FaClock style={{ color: '#94a3b8' }}/> {hop.durationMinutes} min</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className={styles.noResults}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h3>No trains found for this route and date</h3>
                <p>Try changing your search criteria or selecting a different date. Our intelligent booking system ensures fair allocation for all passengers.</p>
                <motion.button 
                  className={styles.searchBtn}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/')}
                >
                  Modify Search
                </motion.button>
              </motion.div>
            )}
          </>
        )}
        
        {trains.length > 0 && (
          <motion.div 
            className={styles.pagination}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button 
              className={styles.pageBtn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Previous
            </motion.button>
            <motion.button 
              className={`${styles.pageBtn} ${styles.activePage}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              1
            </motion.button>
            {trains.length > 5 && (
              <motion.button 
                className={styles.pageBtn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                2
              </motion.button>
            )}
            <motion.button 
              className={styles.pageBtn}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Next
            </motion.button>
          </motion.div>
        )}
      </motion.div>
      
      <AnimatePresence>
        {selectedTrain && (
          <TrainDetailsModal 
            train={selectedTrain} 
            onClose={() => setSelectedTrain(null)} 
            departureDate={searchParams.departureDate}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TrainSearch;
