import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaExchangeAlt, 
  FaCalendarAlt,
  FaSearch,
  FaMapMarkerAlt,
  FaChevronDown
} from 'react-icons/fa';
import styles from "./Booking.module.css";
import { API_BASE_URL } from "../../config/api";

const BookingCard = () => {
  const navigate = useNavigate();
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const dateInputRef = useRef(null);
  
  // State for the selected stations and date
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [trainData, setTrainData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Separate departure and arrival stations
  const [departureStations, setDepartureStations] = useState([]);
  const [arrivalStations, setArrivalStations] = useState([]);

  // Fetch train availability
  useEffect(() => {
    const fetchTrainData = async () => {
      try {
        const response = await fetch(API_BASE_URL + '/api/train-availability');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
          setTrainData(data.data);
          
          const uniqueDepartureStations = [...new Set(data.data.map(schedule => schedule.departureStation))];
          const uniqueArrivalStations = [...new Set(data.data.map(schedule => schedule.arrivalStation))];
          
          setDepartureStations(uniqueDepartureStations);
          setArrivalStations(uniqueArrivalStations);

          const firstSchedule = data.data[0];
          setFromStation(firstSchedule.departureStation);
          setToStation(firstSchedule.arrivalStation);
          
          // Format the departure date - convert from YYYY-MM-DD format
          if (firstSchedule.departureDate) {
            // departureDate is now in YYYY-MM-DD format from train availability
            setDepartureDate(firstSchedule.departureDate);
          } else {
            // Set tomorrow as default if no date
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDepartureDate(tomorrow.toISOString().split('T')[0]);
          }
        } else {
          // If no schedules found, set default date
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setDepartureDate(tomorrow.toISOString().split('T')[0]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching train availability data:', err);
        setError('Failed to load train schedules');
        setLoading(false);
        
        // Set default date even on error
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDepartureDate(tomorrow.toISOString().split('T')[0]);
      }
    };
    
    fetchTrainData();
  }, []);

  const formatDisplayDate = (dateString) => {
    if (!dateString) return 'Select Date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleFromSelect = (station) => {
    setFromStation(station);
    setShowFromDropdown(false);
    
    // Filter arrival stations based on available routes from the selected departure station
    const availableRoutes = trainData.filter(schedule => schedule.departureStation === station);
    const availableArrivalStations = [...new Set(availableRoutes.map(schedule => schedule.arrivalStation))];
    
    if (availableArrivalStations.length > 0) {
      setArrivalStations(availableArrivalStations);
      // Set the first available arrival station as default
      setToStation(availableArrivalStations[0]);
    }
  };

  const handleToSelect = (station) => {
    setToStation(station);
    setShowToDropdown(false);
  };

  const handleDateChange = (e) => {
    setDepartureDate(e.target.value);
  };

  const showDatePicker = () => {
    dateInputRef.current.showPicker();
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleSwap = () => {
    // Check if the swapped stations are valid
    const isValidSwap = arrivalStations.includes(fromStation) && departureStations.includes(toStation);
    
    if (isValidSwap) {
      const temp = fromStation;
      setFromStation(toStation);
      setToStation(temp);
      
      // Update available arrival stations for the new departure station
      const availableRoutes = trainData.filter(schedule => schedule.departureStation === toStation);
      const availableArrivalStations = [...new Set(availableRoutes.map(schedule => schedule.arrivalStation))];
      
      if (availableArrivalStations.length > 0) {
        setArrivalStations(availableArrivalStations);
      }
    } else {
      alert("This route cannot be swapped as there are no train schedules available in the reverse direction.");
    }
  };

  const handleSearch = () => {
    // For the new system, we use the ISO date format directly
    const searchData = {
      fromStation,
      toStation,
      departureDate, // YYYY-MM-DD format
      trainData // Pass the schedule data
    };
    
    // Pass the selected data to the train view page as state
    navigate('/trainview', { 
      state: searchData
    });
  };

  if (loading) {
    return <div className={styles.loading}>Loading train schedules...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.bookingCard}>
      <div className={styles.bookingForm}>
        <div className={styles.inputGroup}>
          {/* From Station Input */}
          <div className={styles.stationInput}>
            <label>
              <FaMapMarkerAlt className={styles.inputIcon} />
              <span>From</span>
            </label>
            <div 
              className={styles.stationValue} 
              onClick={() => {
                setShowFromDropdown(!showFromDropdown);
                setShowToDropdown(false);
              }}
            >
              <div className={styles.stationInfo}>
                <span className={styles.stationCode}>{fromStation.split(',')[0] || fromStation}</span>
                <p className={styles.stationName}>{fromStation.split(',')[1] || ''}</p>
              </div>
              <FaChevronDown className={styles.chevronIcon} />
            </div>
            {showFromDropdown && (
              <div className={styles.dropdown}>
                {departureStations.map((station) => (
                  <div 
                    key={station} 
                    className={styles.dropdownItem}
                    onClick={() => handleFromSelect(station)}
                  >
                    <span className={styles.stationCode}>{station.split(',')[0] || station}</span>
                    <p className={styles.stationName}>{station.split(',')[1] || ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button className={styles.swapButton} onClick={handleSwap}>
            <FaExchangeAlt className={styles.swapIcon} />
          </button>
          
          {/* To Station Input */}
          <div className={styles.stationInput}>
            <label>
              <FaMapMarkerAlt className={styles.inputIcon} />
              <span>To</span>
            </label>
            <div 
              className={styles.stationValue} 
              onClick={() => {
                setShowToDropdown(!showToDropdown);
                setShowFromDropdown(false);
              }}
            >
              <div className={styles.stationInfo}>
                <span className={styles.stationCode}>{toStation.split(',')[0] || toStation}</span>
                <p className={styles.stationName}>{toStation.split(',')[1] || ''}</p>
              </div>
              <FaChevronDown className={styles.chevronIcon} />
            </div>
            {showToDropdown && (
              <div className={styles.dropdown}>
                {arrivalStations.map((station) => (
                  <div 
                    key={station} 
                    className={styles.dropdownItem}
                    onClick={() => handleToSelect(station)}
                  >
                    <span className={styles.stationCode}>{station.split(',')[0] || station}</span>
                    <p className={styles.stationName}>{station.split(',')[1] || ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Date Selection */}
        <div className={styles.dateGroup}>
          <label>
            <FaCalendarAlt className={styles.inputIcon} />
            <span>Journey Date</span>
          </label>
          <div className={styles.dateContainer}>
            <input 
              type="date" 
              id="datePicker"
              ref={dateInputRef}
              className={styles.hiddenDateInput}
              onChange={handleDateChange}
              min={getTomorrowDate()}
              value={departureDate || ''}
            />
            <div 
              className={styles.dateDisplay} 
              onClick={showDatePicker}
            >
              {departureDate ? (
                <>
                  <span className={styles.dateDay}>{formatDisplayDate(departureDate).split(',')[0]},</span>
                  <span className={styles.dateRest}>{formatDisplayDate(departureDate).split(',').slice(1).join(',')}</span>
                </>
              ) : (
                <span className={styles.placeholder}>Select Date</span>
              )}
              <FaChevronDown className={styles.chevronIcon} />
            </div>
          </div>
        </div>
        
        <button 
          className={styles.ctaButton} 
          onClick={handleSearch}
          disabled={!fromStation || !toStation || !departureDate}
        >
          <FaSearch className={styles.searchIcon} />
          <span>Search for Trains</span>
        </button>
      </div>
    </div>
  );
};

export default BookingCard;