import { useState, useEffect } from 'react';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import useApi from '../../hooks/useApi';
import StatsCard from './StatsCard';
import styles from './StatsChart.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const StatsChart = () => {
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { get } = useApi();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching stats with range:', timeRange);
        
        const response = await get(`/api/admin/stats?range=${timeRange}`);
        console.log('Stats API response:', response);
        
        // Handle the response structure - extract data from response.data
        let statsData;
        if (response && response.data) {
          statsData = response.data;
        } else if (response && response.totals) {
          // Direct response format
          statsData = response;
        } else {
          console.error('Unexpected response format:', response);
          setError('Invalid data format received from server');
          return;
        }

        // Check if we have the new enhanced structure
        if (statsData.totals && statsData.revenue && statsData.bookings && statsData.popularTrains) {
          console.log('Using enhanced stats data:', statsData);
          setStats(statsData);
        } 
        // Handle the old/current API structure and transform it
        else if (statsData.totalBookings !== undefined || statsData.totalRevenue !== undefined) {
          console.log('Transforming old API structure:', statsData);
          
          // Transform old structure to new structure
          const transformedStats = {
            totals: {
              revenue: statsData.totalRevenue || 0,
              bookings: statsData.totalBookings || 0,
              confirmedBookings: statsData.confirmedBookings || 0,
              cancelledBookings: statsData.cancelledBookings || 0,
              activeCoupons: 0, // Not available in old structure
              mealsOrdered: 0, // Not available in old structure
              revenueChange: 0,
              bookingsChange: 0,
              mealsChange: 0
            },
            revenue: {
              labels: ['Current Period'],
              data: [statsData.totalRevenue || 0]
            },
            bookings: {
              labels: ['Current Period'],
              data: [statsData.totalBookings || 0]
            },
            popularTrains: {
              labels: (statsData.popularTrains || []).map(train => 
                `${train.trainDetails?.[0]?.trainNumber || 'Unknown'} - ${train.trainDetails?.[0]?.trainName || 'Unknown'}`
              ),
              data: (statsData.popularTrains || []).map(train => train.count || 0)
            }
          };
          
          console.log('Transformed stats:', transformedStats);
          setStats(transformedStats);
        } else {
          console.error('Missing required data properties:', statsData);
          setError('Incomplete statistics data received');
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setError(`Failed to load statistics: ${error.message || 'Please try again.'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [timeRange]);

  // Default empty data structures
  const emptyChartData = {
    labels: [],
    datasets: [{
      label: '',
      data: [],
      backgroundColor: [],
      borderColor: [],
      borderWidth: 1
    }]
  };

  const emptyTotals = {
    revenue: 0,
    bookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    activeCoupons: 0,
    mealsOrdered: 0,
    revenueChange: 0,
    bookingsChange: 0,
    mealsChange: 0
  };

  // Check if chart data is meaningful (not dummy/static data)
  const hasValidChartData = (dataKey) => {
    if (!stats || !stats[dataKey]) return false;
    
    const data = stats[dataKey];
    const labels = data.labels || [];
    const values = data.data || [];
    
    // Check if we have meaningful data
    if (labels.length === 0 || values.length === 0) return false;
    
    // For time-based charts, check if it's not just a single "Current Period" entry (dummy data)
    if ((dataKey === 'revenue' || dataKey === 'bookings') && 
        labels.length === 1 && labels[0] === 'Current Period') {
      return false;
    }
    
    // For popular trains, check if we have actual train data
    if (dataKey === 'popularTrains' && values.some(val => val > 0)) {
      return true;
    }
    
    // For time-based data, check if we have multiple time periods
    if ((dataKey === 'revenue' || dataKey === 'bookings') && labels.length > 1) {
      return true;
    }
    
    return false;
  };

  // Check if we have booking status data
  const hasBookingStatusData = () => {
    const totals = stats?.totals || emptyTotals;
    return totals.confirmedBookings > 0 || totals.cancelledBookings > 0;
  };

  // Calculate booking success rate
  const calculateBookingMetrics = () => {
    const totals = stats?.totals || emptyTotals;
    const total = totals.confirmedBookings + totals.cancelledBookings;
    
    if (total === 0) return { successRate: 0, cancellationRate: 0 };
    
    const successRate = ((totals.confirmedBookings / total) * 100).toFixed(1);
    const cancellationRate = ((totals.cancelledBookings / total) * 100).toFixed(1);
    
    return { successRate, cancellationRate };
  };

  // Safely get chart data
  const getChartData = (dataKey) => {
    if (!stats || !stats[dataKey]) {
      console.log(`No data for ${dataKey}, using empty chart`);
      return emptyChartData;
    }
    
    const data = stats[dataKey];
    console.log(`Chart data for ${dataKey}:`, data);

    return {
      labels: data.labels || [],
      datasets: [{
        label: dataKey === 'revenue' ? 'Revenue (Rs.)' : 
              dataKey === 'bookings' ? 'Bookings' : 'Popular Trains',
        data: data.data || [],
        backgroundColor: dataKey === 'popularTrains' ? [
          'rgba(79, 70, 229, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)',
          'rgba(139, 92, 246, 0.7)'
        ] : dataKey === 'revenue' ? 
          'rgba(79, 70, 229, 0.7)' : 'rgba(16, 185, 129, 0.7)',
        borderColor: dataKey === 'popularTrains' ? [
          'rgba(79, 70, 229, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)'
        ] : dataKey === 'revenue' ? 
          'rgba(79, 70, 229, 1)' : 'rgba(16, 185, 129, 1)',
        borderWidth: 1
      }]
    };
  };

  // Get booking status chart data
  const getBookingStatusChartData = () => {
    const totals = stats?.totals || emptyTotals;
    
    return {
      labels: ['Confirmed Bookings', 'Cancelled Bookings'],
      datasets: [{
        data: [totals.confirmedBookings, totals.cancelledBookings],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)', // Green for confirmed
          'rgba(239, 68, 68, 0.8)'   // Red for cancelled
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2
      }]
    };
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed} bookings`;
          }
        }
      }
    }
  };

  const bookingStatusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading statistics...</div>;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button className={styles.retryButton} onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const currentTotals = stats?.totals || emptyTotals;
  const bookingMetrics = calculateBookingMetrics();

  return (
    <div className={styles.statsContainer}>
      <div className={styles.header}>
        <h2>Dashboard Statistics</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className={styles.timeRangeSelect}
        >
          <option value="daily">Daily (Last 30 days)</option>
          <option value="weekly">Weekly (Last 12 weeks)</option>
          <option value="monthly">Monthly (Last 12 months)</option>
          <option value="yearly">Yearly (Last 5 years)</option>
        </select>
      </div>

      <div className={styles.statsCards}>
        <StatsCard 
          title="Total Revenue" 
          value={`Rs.${currentTotals.revenue.toLocaleString()}`} 
          change={currentTotals.revenueChange} 
        />
        <StatsCard 
          title="Total Bookings" 
          value={currentTotals.bookings.toLocaleString()} 
          change={currentTotals.bookingsChange} 
        />
        <StatsCard 
          title="Active Coupons" 
          value={currentTotals.activeCoupons.toLocaleString()} 
        />
        <StatsCard 
          title="Meals Ordered" 
          value={currentTotals.mealsOrdered.toLocaleString()} 
          change={currentTotals.mealsChange} 
        />
      </div>

      {/* Enhanced Booking Status Section */}
      {hasBookingStatusData() && (
        <div className={styles.bookingStatusSection}>
          <h3 className={styles.sectionTitle}>📋 Booking Status Overview</h3>
          
          <div className={styles.bookingStatusGrid}>
            {/* Booking Status Cards */}
            <div className={styles.bookingStatusCards}>
              <div className={`${styles.bookingStatusCard} ${styles.confirmedCard}`}>
                <div className={styles.statusIcon}>✅</div>
                <div className={styles.statusContent}>
                  <h4>Confirmed Bookings</h4>
                  <div className={styles.statusValue}>{currentTotals.confirmedBookings.toLocaleString()}</div>
                  <div className={styles.statusPercentage}>{bookingMetrics.successRate}% success rate</div>
                </div>
              </div>
              
              <div className={`${styles.bookingStatusCard} ${styles.cancelledCard}`}>
                <div className={styles.statusIcon}>❌</div>
                <div className={styles.statusContent}>
                  <h4>Cancelled Bookings</h4>
                  <div className={styles.statusValue}>{currentTotals.cancelledBookings.toLocaleString()}</div>
                  <div className={styles.statusPercentage}>{bookingMetrics.cancellationRate}% cancellation rate</div>
                </div>
              </div>
            </div>

            {/* Booking Status Chart */}
            <div className={styles.bookingStatusChart}>
              <h4>Booking Status Distribution</h4>
              <div className={styles.chartWrapper}>
                <Doughnut 
                  data={getBookingStatusChartData()} 
                  options={bookingStatusOptions}
                />
              </div>
            </div>
          </div>

          {/* Booking Insights */}
          <div className={styles.bookingInsights}>
            <div className={styles.insightItem}>
              <span className={styles.insightLabel}>Total Processed:</span>
              <span className={styles.insightValue}>
                {(currentTotals.confirmedBookings + currentTotals.cancelledBookings).toLocaleString()} bookings
              </span>
            </div>
            <div className={styles.insightItem}>
              <span className={styles.insightLabel}>Success Rate:</span>
              <span className={`${styles.insightValue} ${parseFloat(bookingMetrics.successRate) >= 80 ? styles.goodRate : styles.needsImprovement}`}>
                {bookingMetrics.successRate}%
                {parseFloat(bookingMetrics.successRate) >= 80 ? ' 🎉' : ' ⚠️'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.charts}>
        {hasValidChartData('popularTrains') && (() => {
          const trainData = stats.popularTrains;
          const maxCount = Math.max(...(trainData.data || [1]));
          const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
          const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
          return (
            <div className={styles.popularTrainsContainer}>
              <div className={styles.popularTrainsHeader}>
                <h3>🚂 Most Popular Trains</h3>
                <span className={styles.popularTrainsBadge}>{trainData.labels.length} trains</span>
              </div>
              <div className={styles.trainRankList}>
                {trainData.labels.map((label, i) => {
                  const count = trainData.data[i] || 0;
                  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                  // Split "TRN591 - Himalayan Express" into number and name
                  const parts = label.split(' - ');
                  const trainNumber = parts[0] || label;
                  const trainName = parts.slice(1).join(' - ') || '';
                  return (
                    <div key={i} className={styles.trainRankItem}>
                      <div className={styles.trainRankLeft}>
                        <span className={styles.rankBadge}>{rankEmojis[i] || `#${i + 1}`}</span>
                        <div className={styles.trainInfo}>
                          <span className={styles.trainNumber}>{trainNumber}</span>
                          {trainName && <span className={styles.trainName}>{trainName}</span>}
                        </div>
                      </div>
                      <div className={styles.trainRankRight}>
                        <div className={styles.trainBarWrapper}>
                          <div
                            className={styles.trainBar}
                            style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                          />
                        </div>
                        <span className={styles.trainCount}>{count} bookings</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        
        {/* Show message when no charts have valid data */}
        {!hasValidChartData('revenue') && !hasValidChartData('bookings') && !hasValidChartData('popularTrains') && (
          <div className={styles.noChartsMessage}>
            <h3>📊 Charts will appear here once you have more booking data</h3>
            <p>
              Revenue and booking charts require multiple time periods of data, 
              while popular trains chart needs actual bookings with train information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsChart;