import { useState } from 'react';
import { FaTrain } from 'react-icons/fa';
import styles from "./Booking.module.css";
import Navbar from '../ReusableComponent/Navbar';
import BookingCard from './BookingCard';

const Booking = () => {
  const [fromStation, setFromStation] = useState('NDLS, New Delhi Railway Station');
  const [toStation, setToStation] = useState('LJN, Lucknow Junction');
  const [departureDate, setDepartureDate] = useState('');

  const handleDateChange = (date) => {
    setDepartureDate(date);
  };

  const swapStations = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
  };

  const handleSearch = () => {
    console.log('Searching with:', { fromStation, toStation, departureDate });
  };

  return (
    <div className={styles.homepageContainer}>
      <Navbar/>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.textContent}>
            <h3 className={styles.subtitle}>Plan Your Journey</h3>
            <h1 className={styles.mainTitle}>Travel Smarter, Not Harder</h1>
            <p className={styles.tagline}>
              Book train tickets in just a few clicks. Enjoy seamless travel with our 
              easy-to-use platform and exclusive member benefits.
            </p>
            
            <BookingCard
              fromStation={fromStation}
              toStation={toStation}
              departureDate={departureDate}
              onFromChange={setFromStation}
              onToChange={setToStation}
              onDateChange={handleDateChange}
              onSwap={swapStations}
              onSearch={handleSearch}
            />
          </div>
          
          <div className={styles.heroImage}>
            <img 
              src="https://i.ibb.co/1G6LWFPM/Screenshot-2025-04-05-225415.png" 
              alt="Happy travelers boarding a train" 
              className={styles.heroImg}
            />
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className={styles.featuresSection}>
        <h2 className={styles.featuresTitle}>Why Choose Us?</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚄</div>
            <h3 className={styles.featureTitle}>Extensive Network</h3>
            <p className={styles.featureDescription}>Access to all major routes across India with real-time availability</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>💳</div>
            <h3 className={styles.featureTitle}>Easy Payments</h3>
            <p className={styles.featureDescription}>Multiple payment options including UPI, cards, and wallets</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3 className={styles.featureTitle}>Secure Booking</h3>
            <p className={styles.featureDescription}>Your data is protected with bank-level security</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Booking;