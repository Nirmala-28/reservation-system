import React from "react";
import { FaTimes, FaTrain, FaClock, FaCalendarAlt, FaChair, FaWifi, FaUtensils, FaBed, FaCoffee } from "react-icons/fa";
import { motion } from "framer-motion";
import styles from "./popupModal.module.css"; // Use dedicated CSS file for modal

const TrainDetailsModal = ({ train, onClose, departureDate }) => {
  if (!train) return null;

  // Map facilities to icons
  const facilityIcons = {
    "Pantry": <FaUtensils />,
    "WiFi": <FaWifi />,
    "AC": <FaChair />,
    "Bedding": <FaBed />,
    "Breakfast": <FaCoffee />,
    "Tea/Coffee": <FaCoffee />,
    "Charging Points": <FaChair />
  };

  // Handle click outside modal to close
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <motion.div 
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleOverlayClick}
    >
      <motion.div 
        className={styles.modalContent}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 500 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.closeButton} onClick={onClose}>
          <FaTimes />
        </button>
        
        <div className={styles.modalHeader}>
          <h3>
            <FaTrain className={styles.trainIcon} /> 
            {train.trainNumber} - {train.trainName}
            {train.rating && (
              <span className={styles.trainRating}>{train.rating} ★</span>
            )}
          </h3>

        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.tripDetails}>
            <div className={styles.tripTiming}>
              <div className={styles.timeGroup}>
                <div className={styles.time}>{train.departureTime}</div>
                <div className={styles.station}>{train.departureStation}</div>
                <div className={styles.date}>
                  <FaCalendarAlt /> {train.departureDate || departureDate}
                </div>
              </div>
              
              <div className={styles.durationContainer}>
                <div className={styles.durationLine}></div>
                <div className={styles.duration}>
                  <FaClock /> {train.duration}
                </div>
                <div className={styles.durationLine}></div>
              </div>
              
              <div className={styles.timeGroup}>
                <div className={styles.time}>{train.arrivalTime}</div>
                <div className={styles.station}>{train.arrivalStation}</div>
                <div className={styles.date}>
                  <FaCalendarAlt /> {train.arrivalDate || departureDate}
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.detailsSection}>
            <h4>Train Information</h4>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Scheduled for:</span>
              <span className={styles.detailValue}>
                {train.departureDate
                  ? new Date(train.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Date not set'}
              </span>
            </div>
            
            {train.runningStatus && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Status:</span>
                <span className={`${styles.detailValue} ${styles.statusBadge}`}>
                  {train.runningStatus}
                </span>
              </div>
            )}

            {train.timeQuantum && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Time Quantum:</span>
                <span className={styles.detailValue}>{train.timeQuantum} minutes</span>
              </div>
            )}
            
            <div className={styles.classesSection}>
              <span className={styles.detailLabel}>Available Classes:</span>
              <div className={styles.classesList}>
                {train.fareOptions && train.fareOptions.map((fare, i) => (
                  <div 
                    key={i} 
                    className={styles.classCard}
                    style={{ borderColor: fare.color }}
                  >
                    <div className={styles.classHeader}>
                      <span className={styles.className}>{fare.class}</span>
                      <span className={styles.classPrice}>{fare.price}</span>
                    </div>
                    <div className={styles.classDetails}>
                      <div className={styles.availability}>
                        <span className={styles.availableSeats}>
                          {fare.availableSeats || 0} available
                        </span>
                        <span className={styles.totalSeats}>
                          of {fare.totalSeats || 'N/A'} seats
                        </span>
                      </div>
                      {fare.waitingListActual > 0 && (
                        <div className={styles.waitingList}>
                          Waiting List: {fare.waitingListActual}
                        </div>
                      )}
                      <div className={`${styles.statusIndicator} ${
                        (fare.availableSeats > 10) ? styles.available : 
                        (fare.availableSeats > 0) ? styles.limited : 
                        styles.full
                      }`}>
                        {(fare.availableSeats > 10) ? 'Available' : 
                         (fare.availableSeats > 0) ? 'Few Left' : 
                         'Full'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {train.facilities && train.facilities.length > 0 && (
            <div className={styles.detailsSection}>
              <h4>Facilities</h4>
              <div className={styles.facilitiesGrid}>
                {train.facilities.map((facility, i) => (
                  <div key={i} className={styles.facilityItem}>
                    {facilityIcons[facility] || <FaChair />}
                    <span>{facility}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {train.fareOptions && train.fareOptions.length > 0 && (
            <div className={styles.detailsSection}>
              <h4>Fare Details</h4>
              <div className={styles.fareTable}>
                <div className={styles.fareHeader}>
                  <span>Class</span>
                  <span>Price</span>
                  <span>Availability</span>
                  <span>Status</span>
                </div>
                {train.fareOptions.map((fare, i) => (
                  <div 
                    key={i} 
                    className={styles.fareRow} 
                    style={{ borderLeft: `4px solid ${fare.color}` }}
                  >
                    <span className={styles.fareClass}>{fare.class}</span>
                    <span className={styles.farePrice}>{fare.price}</span>
                    <span className={styles.fareAvailability}>
                      {fare.availableSeats || fare.availability}/{fare.totalSeats || 'N/A'}
                    </span>
                    <span className={`${styles.fareStatus} ${
                      (fare.availableSeats > 10 || fare.availability?.includes('Available')) 
                        ? styles.available 
                        : fare.waitingList > 0 
                          ? styles.waitingList 
                          : styles.limited
                    }`}>
                      {fare.availableSeats > 10 ? 'Available' : 
                       fare.waitingList > 0 ? `WL ${fare.waitingList}` : 
                       fare.availableSeats > 0 ? 'Few Left' : 'Full'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.modalFooter}>
          <button className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
          {/* <button 
            className={styles.primaryButton}
            onClick={() => {
              // You can add booking logic here or call a parent function
              console.log('Book now clicked for train:', train.trainNumber);
              // For now, just close the modal
              onClose();
            }}
          >
            Book Now
          </button> */}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TrainDetailsModal;