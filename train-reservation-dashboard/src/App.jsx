import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import DashboardLayout from './components/Dashboard/Layout';
import TrainList from './components/Trains/TrainList';
import TrainForm from './components/Trains/TrainForm';
// NEW: Import scheduling components
import ScheduleList from './components/Trains/ScheduleList';
import ScheduleForm from './components/Trains/ScheduleForm';
import ScheduleMetrics from './components/Trains/ScheduleMetrics';
import MealList from './components/Meals/MealList';
import MealForm from './components/Meals/MealForm';
import CouponList from './components/Coupons/CouponList';
import CouponForm from './components/Coupons/CouponForm';
import BookingList from './components/Bookings/BookingList';
import Stats from './components/Stats/StatsChart';
import AlgorithmVisualizers from './components/Stats/AlgorithmVisualizers';
import styles from './App.module.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return user && user.role === 'admin' ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <div className={styles.app}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard/*"
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              }
            >
              {/* Basic Train Management Routes */}
              <Route path="trains" element={<TrainList />} />
              <Route path="trains/add" element={<TrainForm />} />
              <Route path="trains/edit/:id" element={<TrainForm />} />
              
              {/* NEW: Train Scheduling & Algorithm Routes */}
              <Route path="train-availability" element={<ScheduleList />} />
              <Route path="train-availability/add" element={<ScheduleForm />} />
              <Route path="train-availability/edit/:id" element={<ScheduleForm />} />
              <Route path="train-availability/metrics/:id" element={<ScheduleMetrics />} />
              
              {/* Existing Routes */}
              <Route path="meals" element={<MealList />} />
              <Route path="meals/add" element={<MealForm />} />
              <Route path="meals/edit/:id" element={<MealForm />} />
              <Route path="coupons" element={<CouponList />} />
              <Route path="coupons/add" element={<CouponForm />} />
              <Route path="coupons/edit/:id" element={<CouponForm />} />
              <Route path="bookings" element={<BookingList />} />
              <Route path="stats" element={<Stats />} />
              <Route path="algorithms" element={<AlgorithmVisualizers />} />
              <Route index element={<Navigate to="trains" replace />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;