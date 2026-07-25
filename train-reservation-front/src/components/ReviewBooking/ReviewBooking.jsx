import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  FaUser, FaPhone, FaUtensils, FaTrain, FaRupeeSign, 
  FaEdit, FaCheck, FaChevronDown, FaChevronUp, 
  FaRegClock, FaRegUser, FaRegHeart, FaHeart, 
  FaQrcode, FaShieldAlt, FaPlus, FaMinus, FaTrash,
  FaCreditCard, FaPaypal, FaTag, FaSpinner
} from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';
import styles from "./ReviewBooking.module.css";
import Navbar from "../ReusableComponent/Navbar";

// Constants for fare calculation
const RESERVATION_CHARGES = 40;
const SUPERFAST_CHARGES = 75;
const GST_PERCENTAGE = 5;

const ReviewBooking = () => {
  const [expandedSection, setExpandedSection] = useState('traveller');
  const [favoriteTrain, setFavoriteTrain] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [travelers, setTravelers] = useState([
    { name: "", age: "", gender: "Male", nationality: "Indian", berthPreference: "No Preference" }
  ]);
  const [contact, setContact] = useState({ mobile: "", email: "" });
  const [meals, setMeals] = useState({});
  const [selectedMeals, setSelectedMeals] = useState({});
  const [mealsLoading, setMealsLoading] = useState(false);
  const [mealsError, setMealsError] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(null);
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({
    travelers: {},
    contact: {}
  });

  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const parsePrice = (priceString) => {
    if (typeof priceString === 'number') return priceString;
    return parseFloat(priceString.toString().replace(/[₹,\s]/g, '')) || 0;
  };

  const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return '₹' + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Payment method options - Stripe commented out
  const paymentMethods = [
    // { id: "stripe", name: "Credit/Debit Card (Stripe)", icon: <FaCreditCard />, color: "#635BFF" },
    { id: "paypal", name: "PayPal", icon: <FaPaypal />, color: "#0070BA" }
  ];

  useEffect(() => {
    if (location.state?.selectedTrain) {
      // Fixed to use the correct train number from selected train
      fetchMeals(location.state.selectedTrain.trainNumber);
    }
  }, [location.state]);

  const fetchMeals = async (trainNumber) => {
    if (!trainNumber) {
      console.error("No train number provided for fetching meals");
      return;
    }

    try {
      setMealsLoading(true);
      setMealsError(null);
      
      console.log(`Fetching meals for train: ${trainNumber}`);
      
      // Updated to use the correct endpoint for train-specific meals
      const response = await fetch(`http://localhost:5002/api/meals/train/${trainNumber}`);
      const data = await response.json();
      
      console.log("Meals API response:", data);
      
      if (data.success) {
        // Data is already grouped by category from the backend
        const mealsByCategory = data.data || {};
        
        console.log(`Found meals for ${trainNumber}:`, mealsByCategory);
        setMeals(mealsByCategory);
        
        // Initialize selected meals state
        const initialSelected = {};
        Object.keys(mealsByCategory).forEach(category => {
          initialSelected[category] = Array(mealsByCategory[category].length).fill(false);
        });
        setSelectedMeals(initialSelected);
      } else {
        console.log(`No meals found for train ${trainNumber}`);
        setMeals({});
        setSelectedMeals({});
        setMealsError(data.message || `No meals available for train ${trainNumber}`);
      }
    } catch (error) {
      console.error("Failed to fetch meals:", error);
      setMealsError("Failed to load meals. Please try again later.");
      setMeals({});
      setSelectedMeals({});
    } finally {
      setMealsLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const validateTravelerField = (index, field, value) => {
    const errors = { ...validationErrors };
    if (!errors.travelers[index]) errors.travelers[index] = {};

    switch (field) {
      case 'name':
        if (!value.trim()) {
          errors.travelers[index].name = 'Name is required';
        } else if (value.trim().length < 2) {
          errors.travelers[index].name = 'Name must be at least 2 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(value)) {
          errors.travelers[index].name = 'Name should only contain letters and spaces';
        } else {
          delete errors.travelers[index].name;
        }
        break;
      
      case 'age':
        const ageNum = parseInt(value);
        if (!value) {
          errors.travelers[index].age = 'Age is required';
        } else if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
          errors.travelers[index].age = 'Please enter a valid age (1-120)';
        } else {
          delete errors.travelers[index].age;
        }
        break;
      
      default:
        break;
    }

    if (Object.keys(errors.travelers[index]).length === 0) {
      delete errors.travelers[index];
    }

    setValidationErrors(errors);
  };

  const validateContactField = (field, value) => {
    const errors = { ...validationErrors };

    switch (field) {
      case 'mobile':
        if (!value) {
          errors.contact.mobile = 'Mobile number is required';
        } else if (!/^\d{10}$/.test(value)) {
          errors.contact.mobile = 'Please enter a valid 10-digit mobile number';
        } else {
          delete errors.contact.mobile;
        }
        break;
      
      case 'email':
        if (!value) {
          errors.contact.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.contact.email = 'Please enter a valid email address';
        } else {
          delete errors.contact.email;
        }
        break;
      
      default:
        break;
    }

    setValidationErrors(errors);
  };

  const addTraveler = () => {
    setTravelers([...travelers, { 
      name: "", 
      age: "", 
      gender: "Male", 
      nationality: "Indian", 
      berthPreference: "No Preference" 
    }]);
  };

  const removeTraveler = (index) => {
    if (travelers.length > 1) {
      const updated = [...travelers];
      updated.splice(index, 1);
      setTravelers(updated);
      
      const errors = { ...validationErrors };
      delete errors.travelers[index];
      const newTravelerErrors = {};
      Object.keys(errors.travelers).forEach(key => {
        const keyIndex = parseInt(key);
        if (keyIndex > index) {
          newTravelerErrors[keyIndex - 1] = errors.travelers[key];
        } else if (keyIndex < index) {
          newTravelerErrors[keyIndex] = errors.travelers[key];
        }
      });
      errors.travelers = newTravelerErrors;
      setValidationErrors(errors);
    }
  };

  const updateTraveler = (index, field, value) => {
    const updated = [...travelers];
    updated[index][field] = value;
    setTravelers(updated);
    validateTravelerField(index, field, value);
  };

  const toggleMeal = (category, index) => {
    setSelectedMeals(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState[category]) {
        newState[category] = Array(meals[category].length).fill(false);
      }
      while (newState[category].length <= index) {
        newState[category].push(false);
      }
      newState[category][index] = !newState[category][index];
      return newState;
    });
  };

  const isMealSelected = (category, index) => {
    if (!selectedMeals[category]) return false;
    if (index >= selectedMeals[category].length) return false;
    return selectedMeals[category][index] === true;
  };

  const handleContactChange = (field, value) => {
    setContact({ ...contact, [field]: value });
    validateContactField(field, value);
  };

  const handleCouponChange = (e) => {
    setCouponCode(e.target.value);
    setCouponError(null);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setIsCouponLoading(true);
    setCouponError(null);
    
    try {
      const fareBreakdown = calculateFareBreakdown(true);
      const baseAmount = parseFloat(fareBreakdown.totalAmount);

      const response = await fetch(`http://localhost:5002/api/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          code: couponCode,
          totalAmount: baseAmount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        let discountAmount = data.discountAmount;
        let discountType = 'fixed';
        let discountValue = discountAmount;
        
        if (data.coupon) {
          discountType = data.coupon.discountType || 'fixed';
          discountValue = data.coupon.discountValue || discountAmount;
        }
        
        if (!discountAmount && discountType === 'percentage' && discountValue) {
          discountAmount = (baseAmount * (discountValue / 100)).toFixed(2);
        }
        
        if (!discountAmount || isNaN(discountAmount)) {
          discountAmount = 0;
        }
        
        setCouponDiscount({
          code: couponCode,
          type: discountType,
          value: discountValue,
          amount: parseFloat(discountAmount)
        });
      } else {
        setCouponError(data.message || "Invalid coupon code");
        setCouponDiscount(null);
      }
    } catch (error) {
      console.error("Error applying coupon:", error);
      setCouponError("Failed to apply coupon");
      setCouponDiscount(null);
    } finally {
      setIsCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponDiscount(null);
    setCouponError(null);
  };

  const validateForm = () => {
    const hasValidationErrors = Object.keys(validationErrors.travelers).length > 0 || 
                                Object.keys(validationErrors.contact).length > 0;
    
    if (hasValidationErrors) {
      return false;
    }

    const validTravelers = travelers.every(t => 
      t.name.trim() && t.age && !isNaN(t.age) && t.gender
    );
    const validContact = contact.mobile.match(/^\d{10}$/) && 
                         contact.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    const validPayment = selectedPaymentMethod !== null;
    
    return validTravelers && validContact && validPayment;
  };

  const calculateTotalMealsPrice = () => {
    let total = 0;
    
    Object.entries(meals).forEach(([category, categoryMeals]) => {
      categoryMeals.forEach((meal, index) => {
        if (isMealSelected(category, index)) {
          const mealPrice = parsePrice(meal.price);
          total += mealPrice;
        }
      });
    });
    
    return total;
  };

  const calculateFareBreakdown = (withoutCoupon = false) => {
    if (!location.state?.selectedFare) return { baseFare: 0, totalAmount: 0 };
    
    const basePrice = parsePrice(location.state.selectedFare.price);
    const baseFare = basePrice * travelers.length;
    const reservationCharges = RESERVATION_CHARGES;
    const superfastCharges = SUPERFAST_CHARGES;
    const gstAmount = ((baseFare + reservationCharges + superfastCharges) * GST_PERCENTAGE / 100).toFixed(2);
    const mealsPrice = calculateTotalMealsPrice();
    
    let subtotal = baseFare + reservationCharges + superfastCharges + parseFloat(gstAmount) + mealsPrice;
    
    let discountAmount = 0;
    if (couponDiscount && !withoutCoupon) {
      discountAmount = couponDiscount.amount;
    }
    
    const totalAmount = (subtotal - discountAmount).toFixed(2);
    
    return {
      baseFare,
      reservationCharges,
      superfastCharges,
      gstAmount,
      mealsPrice,
      discountAmount,
      totalAmount
    };
  };

  const handlePayment = async () => {
    // Disable Stripe payments
    if (selectedPaymentMethod === 'stripe') {
      alert('Credit/Debit Card payments are temporarily unavailable. Please select PayPal.');
      return;
    }
  
    if (!validateForm()) {
      if (!selectedPaymentMethod) {
        alert("Please select a payment method");
      } else {
        alert("Please fill all required fields correctly");
      }
      return;
    }
  
    const fareBreakdown = calculateFareBreakdown();
    
    const paymentBreakdown = [
      { 
        label: `Base Fare (${travelers.length} ${travelers.length > 1 ? 'Adults' : 'Adult'})`, 
        amount: fareBreakdown.baseFare.toFixed(2) 
      },
      { 
        label: 'Reservation Charges', 
        amount: fareBreakdown.reservationCharges.toFixed(2) 
      },
      { 
        label: 'Superfast Charges', 
        amount: fareBreakdown.superfastCharges.toFixed(2) 
      },
      { 
        label: `GST (${GST_PERCENTAGE}%)`, 
        amount: fareBreakdown.gstAmount 
      }
    ];
    
    if (fareBreakdown.mealsPrice > 0) {
      paymentBreakdown.push({
        label: 'Meals',
        amount: fareBreakdown.mealsPrice.toFixed(2)
      });
    }
    
    if (fareBreakdown.discountAmount > 0) {
      paymentBreakdown.push({
        label: `Discount (${couponCode})`,
        amount: `-${fareBreakdown.discountAmount.toFixed(2)}`
      });
    }
  
    const mealSelections = [];
    
    if (Object.keys(meals).length > 0) {
      Object.entries(meals).forEach(([category, categoryMeals]) => {
        categoryMeals.forEach((meal, index) => {
          if (isMealSelected(category, index)) {
            mealSelections.push({ 
              mealId: meal._id, 
              quantity: 1 
            });
          }
        });
      });
    }
  
    const bookingData = {
      trainId: location.state.selectedTrain._id,
      classInfo: location.state.selectedFare.class,
      passengers: travelers.map(t => ({
        name: t.name,
        age: parseInt(t.age),
        gender: t.gender,
        seat: "",
        berthPreference: t.berthPreference
      })),
      travelDate: location.state.departureDate,
      contactInfo: contact,
      paymentDetails: {
        paymentMethod: selectedPaymentMethod,
        transactionId: "PENDING_" + Date.now(),
        breakdown: paymentBreakdown,
        total: parseFloat(fareBreakdown.totalAmount)
      },
      ...(couponDiscount && { couponCode: couponCode }),
      mealSelections: mealSelections
    };
  
    try {
      const response = await fetch('http://localhost:5002/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bookingData)
      });
  
      const data = await response.json();
  
      if (data.success) {
        // Directly navigate to payment page without showing alert
        navigate('/payment', { 
          state: { 
            bookingId: data.booking,
            amount: data.totalAmount,
            pnr: data.pnr,
            paymentMethod: selectedPaymentMethod,
            selectedTrain: location.state.selectedTrain,
            selectedFare: location.state.selectedFare,
            travelers: travelers,
            fareBreakdown: fareBreakdown,
            couponCode: couponDiscount ? couponCode : null,
            couponDiscount: couponDiscount ? couponDiscount.amount : 0,
            roundRobinAllocation: data.roundRobinAllocation
          } 
        });
      } else {
        alert(data.message || "Booking failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Failed to create booking. Please try again.");
    }
  };

  if (!location.state?.selectedTrain) {
    return (
      <div className={styles.container}>
        <h2>No booking data found</h2>
        <button onClick={() => navigate('/')}>Back to Search</button>
      </div>
    );
  }

  const { selectedTrain, selectedFare } = location.state;
  const fareBreakdown = calculateFareBreakdown();

  return (
    <><Navbar/>
    <div className={styles.container} ref={containerRef}>
      <div className={styles.mainContent}>
        <div className={styles.leftSection}>
          <motion.div className={styles.card}>
            <div className={styles.cardHeader} onClick={() => toggleSection('traveller')}>
              <div className={styles.headerContent}>
                <FaUser className={styles.cardIcon} />
                <h3 className={styles.cardTitle}>Traveler Details ({travelers.length})</h3>
                <span className={styles.editBadge}>EDIT</span>
              </div>
              {expandedSection === 'traveller' ? <FaChevronUp /> : <FaChevronDown />}
            </div>
            
            <AnimatePresence>
              {expandedSection === 'traveller' && (
                <motion.div 
                  className={styles.cardContent}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {travelers.map((traveler, index) => (
                    <motion.div 
                      key={index}
                      className={styles.travelerForm}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className={styles.travelerHeader}>
                        <h4>Traveler {index + 1}</h4>
                        {travelers.length > 1 && (
                          <button 
                            className={styles.removeButton}
                            onClick={() => removeTraveler(index)}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                      
                      <div className={styles.formGroup}>
                        <label>Full Name*</label>
                        <input 
                          type="text" 
                          value={traveler.name}
                          onChange={(e) => updateTraveler(index, 'name', e.target.value)}
                          className={`${styles.input} ${validationErrors.travelers[index]?.name ? styles.inputError : ''}`}
                        />
                        {validationErrors.travelers[index]?.name && (
                          <span className={styles.errorMessage}>{validationErrors.travelers[index].name}</span>
                        )}
                      </div>
                      
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Age*</label>
                          <input 
                            type="number" 
                            value={traveler.age}
                            onChange={(e) => updateTraveler(index, 'age', e.target.value)}
                            className={`${styles.input} ${validationErrors.travelers[index]?.age ? styles.inputError : ''}`}
                          />
                          {validationErrors.travelers[index]?.age && (
                            <span className={styles.errorMessage}>{validationErrors.travelers[index].age}</span>
                          )}
                        </div>
                        <div className={styles.formGroup}>
                          <label>Gender*</label>
                          <select 
                            value={traveler.gender}
                            onChange={(e) => updateTraveler(index, 'gender', e.target.value)}
                            className={styles.selectInput}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Nationality</label>
                          <select 
                            value={traveler.nationality}
                            onChange={(e) => updateTraveler(index, 'nationality', e.target.value)}
                            className={styles.selectInput}
                          >
                            <option value="Indian">Indian</option>
                            <option value="Nepali">Nepali</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className={styles.formGroup}>
                          <label>Berth Preference</label>
                          <select 
                            value={traveler.berthPreference}
                            onChange={(e) => updateTraveler(index, 'berthPreference', e.target.value)}
                            className={styles.selectInput}
                          >
                            <option value="No Preference">No Preference</option>
                            <option value="Lower">Lower</option>
                            <option value="Middle">Middle</option>
                            <option value="Upper">Upper</option>
                            <option value="Side">Side</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  <button className={styles.addTravelerButton} onClick={addTraveler}>
                    <FaPlus /> Add Another Traveler
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div className={styles.card}>
            <div className={styles.cardHeader}>
              <FaPhone className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Contact Information</h3>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.formGroup}>
                <label>Mobile Number*</label>
                <input 
                  type="tel" 
                  value={contact.mobile}
                  onChange={(e) => handleContactChange('mobile', e.target.value)}
                  placeholder="10-digit mobile number" 
                  className={`${styles.input} ${validationErrors.contact.mobile ? styles.inputError : ''}`}
                />
                {validationErrors.contact.mobile && (
                  <span className={styles.errorMessage}>{validationErrors.contact.mobile}</span>
                )}
              </div>
              
              <div className={styles.formGroup}>
                <label>Email*</label>
                <input 
                  type="email" 
                  value={contact.email}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                  placeholder="Your email address" 
                  className={`${styles.input} ${validationErrors.contact.email ? styles.inputError : ''}`}
                />
                {validationErrors.contact.email && (
                  <span className={styles.errorMessage}>{validationErrors.contact.email}</span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Payment Method Selection */}
          <motion.div className={styles.card}>
            <div className={styles.cardHeader}>
              <FaCreditCard className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Select Payment Method</h3>
            </div>
            
            <div className={styles.cardContent}>
              <div className={styles.paymentMethods}>
                {paymentMethods.map((method) => (
                  <motion.div
                    key={method.id}
                    className={`${styles.paymentMethod} ${selectedPaymentMethod === method.id ? styles.selected : ''}`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    style={{ borderLeft: `4px solid ${method.color}` }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className={styles.paymentIcon} style={{ color: method.color }}>{method.icon}</span>
                    <span className={styles.paymentName}>{method.name}</span>
                    {selectedPaymentMethod === method.id && (
                      <span className={styles.checkMark}>
                        <FaCheck />
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Coupon Code Section */}
          <motion.div className={styles.card}>
            <div className={styles.cardHeader}>
              <FaTag className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Apply Coupon</h3>
            </div>
            
            <div className={styles.cardContent}>
              {couponDiscount ? (
                <div className={styles.appliedCoupon}>
                  <div className={styles.couponInfo}>
                    <span className={styles.couponCode}>{couponCode}</span>
                    <span className={styles.couponDiscount}>
                      {formatCurrency(couponDiscount.amount)} discount applied
                    </span>
                  </div>
                  <button 
                    className={styles.removeCouponButton}
                    onClick={removeCoupon}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className={styles.couponForm}>
                  <div className={styles.couponInputGroup}>
                    <input 
                      type="text" 
                      value={couponCode}
                      onChange={handleCouponChange}
                      placeholder="Enter coupon code" 
                      className={styles.input}
                      disabled={isCouponLoading}
                    />
                    <button 
                      className={styles.applyCouponButton}
                      onClick={applyCoupon}
                      disabled={isCouponLoading}
                    >
                      {isCouponLoading ? <FaSpinner className={styles.spinner} /> : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <div className={styles.couponError}>{couponError}</div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Enhanced Meals Section */}
          <motion.div className={styles.card}>
            <div className={styles.cardHeader}>
              <FaUtensils className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>
                Add Meals 
                {/* {selectedTrain.trainNumber && (
                  <span className={styles.trainBadge}>for {selectedTrain.trainNumber}</span>
                )} */}
              </h3>
            </div>
            
            <div className={styles.cardContent}>
              {mealsLoading ? (
                <div className={styles.mealsLoading}>
                  <FaSpinner className={styles.spinner} />
                  <p>Loading available meals...</p>
                </div>
              ) : mealsError ? (
                <div className={styles.mealsError}>
                  <p>{mealsError}</p>
                  <button 
                    className={styles.retryButton}
                    onClick={() => fetchMeals(selectedTrain.trainNumber)}
                  >
                    Retry
                  </button>
                </div>
              ) : Object.keys(meals).length > 0 ? (
                Object.entries(meals).map(([category, categoryMeals]) => (
                  <div key={category} className={styles.mealCategory}>
                    <h4 className={styles.categoryTitle}>{category}</h4>
                    <div className={styles.foodGrid}>
                      {categoryMeals.map((meal, index) => (
                        <motion.div 
                          key={meal._id}
                          className={`${styles.foodCard} ${isMealSelected(category, index) ? styles.selected : ''}`}
                          onClick={() => toggleMeal(category, index)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className={styles.foodImage}>
                            {meal.photo && <img src={meal.photo} alt={meal.name} />}
                            {isMealSelected(category, index) && (
                              <div className={styles.selectedBadge}>✓</div>
                            )}
                          </div>
                          <div className={styles.foodDetails}>
                            <h4>{meal.name}</h4>
                            <p className={styles.mealPrice}>{formatCurrency(meal.price)}</p>
                            {/* {meal.description && (
                              <p className={styles.mealDescription}>{meal.description}</p>
                            )} */}
                            <button 
                              className={styles.addButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMeal(category, index);
                              }}
                            >
                              {isMealSelected(category, index) ? 'Remove' : 'Add'}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noMeals}>
                  <FaUtensils className={styles.noMealsIcon} />
                  <p>No meals available for train {selectedTrain.trainNumber}</p>
                  <small>Meals may be added by the operator later</small>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className={styles.rightSection}>
          <motion.div className={styles.card}>
            <div className={styles.cardHeader}>
              <FaTrain className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Your Journey</h3>
            </div>
            
            <div className={styles.journeyCard}>
              <div className={styles.trainBadge}>{selectedTrain.trainNumber}</div>
              <h4 className={styles.trainName}>{selectedTrain.trainName}</h4>
              
              <div className={styles.timeline}>
                <div className={styles.timelineEvent}>
                  <div className={styles.time}>{selectedTrain.departureTime}</div>
                  <div className={styles.date}>{selectedTrain.departureDate}</div>
                  <div className={styles.station}>{selectedTrain.departureStation}</div>
                </div>
                
                <div className={styles.duration}>
                  <FaRegClock className={styles.clockIcon} />
                  <span>{selectedTrain.duration}</span>
                </div>
                
                <div className={styles.timelineEvent}>
                  <div className={styles.time}>{selectedTrain.arrivalTime}</div>
                  <div className={styles.date}>{selectedTrain.arrivalDate}</div>
                  <div className={styles.station}>{selectedTrain.arrivalStation}</div>
                </div>
              </div>
              
              <div className={styles.passengerSummary}>
                <FaRegUser className={styles.userIcon} />
                <span>{travelers.length} {travelers.length > 1 ? 'Adults' : 'Adult'} • {selectedFare.class}</span>
              </div>
            </div>
          </motion.div>

          <motion.div className={styles.card}>
            <div className={styles.cardHeader}>
              <FaRupeeSign className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Fare Breakdown</h3>
            </div>
            
            <div className={styles.fareDetails}>
              <div className={styles.fareItem}>
                <span>Base Fare ({travelers.length} {travelers.length > 1 ? 'Adults' : 'Adult'}) - {selectedFare.class}</span>
                <span>{formatCurrency(fareBreakdown.baseFare)}</span>
              </div>
              
              <div className={styles.fareItem}>
                <span>Reservation Charges</span>
                <span>{formatCurrency(fareBreakdown.reservationCharges)}</span>
              </div>
              
              <div className={styles.fareItem}>
                <span>Superfast Charges</span>
                <span>{formatCurrency(fareBreakdown.superfastCharges)}</span>
              </div>
              
              <div className={styles.fareItem}>
                <span>GST ({GST_PERCENTAGE}%)</span>
                <span>{formatCurrency(fareBreakdown.gstAmount)}</span>
              </div>
              
              {fareBreakdown.mealsPrice > 0 && (
                <div className={styles.fareItem}>
                  <span>Meals</span>
                  <span>{formatCurrency(fareBreakdown.mealsPrice)}</span>
                </div>
              )}
              
              {fareBreakdown.discountAmount > 0 && (
                <div className={`${styles.fareItem} ${styles.discountItem}`}>
                  <span>Discount ({couponCode})</span>
                  <span>-{formatCurrency(fareBreakdown.discountAmount)}</span>
                </div>
              )}
              
              <div className={styles.divider}></div>
              
              <div className={styles.totalFare}>
                <span>Total Amount</span>
                <span className={styles.totalAmount}>{formatCurrency(fareBreakdown.totalAmount)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div className={styles.securityCard}>
            <div className={styles.securityBadge}>
              <FaShieldAlt className={styles.shieldIcon} />
              <span>100% Secure Payment</span>
            </div>
            
            <div className={styles.actionButtons}>
              <button 
                className={styles.cancelButton}
                onClick={() => navigate('/')}
              >
                Cancel
              </button>
              <button 
                className={styles.bookNowButton}
                onClick={handlePayment}
                disabled={!validateForm()}
              >
                {selectedPaymentMethod ? 'Proceed to Payment' : 'Select Payment Method to Continue'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ReviewBooking;