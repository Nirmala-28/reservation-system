import { useState } from 'react';
import axios from 'axios';
import styles from './AlgorithmVisualizers.module.css';

const AlgorithmVisualizers = () => {
  const [activeTab, setActiveTab] = useState('dijkstra');
  
  // Dijkstra State
  const [startNode, setStartNode] = useState('Kathmandu');
  const [endNode, setEndNode] = useState('Chitwan');
  const [edges, setEdges] = useState([
    { source: 'Kathmandu', destination: 'Pokhara', weight: 120 },
    { source: 'Kathmandu', destination: 'Chitwan', weight: 240 },
    { source: 'Pokhara', destination: 'Chitwan', weight: 60 }
  ]);
  const [newEdge, setNewEdge] = useState({ source: '', destination: '', weight: '' });
  const [routeResult, setRouteResult] = useState(null);

  // Priority Queue State
  const [passengers, setPassengers] = useState([
    { name: 'Nirmala Chapagain', priority: 8, timestamp: Date.now() - 300000 },
    { name: 'Ram Rai', priority: 5, timestamp: Date.now() - 200000 },
    { name: 'Kalyan Sharma', priority: 2, timestamp: Date.now() - 100000 }
  ]);
  const [newPassenger, setNewPassenger] = useState({ name: '', priority: 5 });
  const [promotedPassenger, setPromotedPassenger] = useState(null);
  
  // Segment Tree State
  const [segments, setSegments] = useState(4);
  const [segmentBookings, setSegmentBookings] = useState([
    { start: 1, end: 3 }
  ]);
  const [query, setQuery] = useState({ start: 0, end: 1 });
  const [newSegmentBooking, setNewSegmentBooking] = useState({ start: 0, end: 1 });
  const [availabilityResult, setAvailabilityResult] = useState(null);

  // Round Robin State
  const [timeQuantum, setTimeQuantum] = useState(30);
  const [bookingQueue, setBookingQueue] = useState([
    { id: 'BK001', processingTime: 45, status: 'waiting' },
    { id: 'BK002', processingTime: 25, status: 'waiting' },
    { id: 'BK003', processingTime: 60, status: 'waiting' }
  ]);
  const [newRoundRobinBooking, setNewRoundRobinBooking] = useState({ id: '', processingTime: 30 });
  const [currentSlot, setCurrentSlot] = useState(0);
  const [processedBookings, setProcessedBookings] = useState([]);
  const [roundRobinResult, setRoundRobinResult] = useState(null);

  // Dijkstra Handlers
  const addEdge = () => {
    if (newEdge.source && newEdge.destination && newEdge.weight) {
      setEdges([...edges, { 
        source: newEdge.source, 
        destination: newEdge.destination, 
        weight: parseFloat(newEdge.weight) 
      }]);
      setNewEdge({ source: '', destination: '', weight: '' });
    }
  };

  const solveRoute = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/algorithm/dijkstra/solve', {
        startNode,
        endNode,
        edges
      });
      setRouteResult(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Priority Queue Handlers
  const addPassenger = () => {
    if (newPassenger.name && newPassenger.priority) {
      setPassengers([...passengers, {
        name: newPassenger.name,
        priority: parseFloat(newPassenger.priority),
        timestamp: Date.now()
      }]);
      setNewPassenger({ name: '', priority: 5 });
    }
  };

  const simulatePromotion = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/algorithm/priority-queue/simulate', {
        passengers,
        action: 'promote'
      });
      setPassengers(response.data.queueState);
      setPromotedPassenger(response.data.promotedPassenger);
    } catch (err) {
      console.error(err);
    }
  };

  // Segment Tree Handlers
  const addSegmentBooking = () => {
    setSegmentBookings([...segmentBookings, { 
      start: parseInt(newSegmentBooking.start), 
      end: parseInt(newSegmentBooking.end) 
    }]);
  };

  const queryAvailability = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/algorithm/segment-tree/query', {
        segments,
        bookings: segmentBookings,
        query
      });
      setAvailabilityResult(response.data.isAvailable);
    } catch (err) {
      console.error(err);
    }
  };

  // Round Robin Handlers
  const addRoundRobinBooking = () => {
    if (newRoundRobinBooking.id && newRoundRobinBooking.processingTime) {
      setBookingQueue([...bookingQueue, {
        id: newRoundRobinBooking.id,
        processingTime: parseInt(newRoundRobinBooking.processingTime),
        status: 'waiting'
      }]);
      setNewRoundRobinBooking({ id: '', processingTime: 30 });
    }
  };

  const resetRoundRobin = () => {
    setBookingQueue([
      { id: 'BK001', processingTime: 45, status: 'waiting' },
      { id: 'BK002', processingTime: 25, status: 'waiting' },
      { id: 'BK003', processingTime: 60, status: 'waiting' }
    ]);
    setProcessedBookings([]);
    setCurrentSlot(0);
    setRoundRobinResult(null);
  };

  const simulateRoundRobin = () => {
    const queue = [...bookingQueue];
    const processed = [];
    let currentTime = 0;
    let slotIndex = 0;
    
    while (queue.length > 0) {
      const currentBooking = queue[slotIndex];
      if (currentBooking.status === 'completed') {
        queue.splice(slotIndex, 1);
        slotIndex = slotIndex % queue.length;
        continue;
      }
      
      const executionTime = Math.min(timeQuantum, currentBooking.processingTime);
      currentBooking.processingTime -= executionTime;
      currentTime += executionTime;
      
      if (currentBooking.processingTime <= 0) {
        currentBooking.status = 'completed';
        processed.push({
          id: currentBooking.id,
          totalTime: currentTime,
          timeSlots: Math.ceil(currentTime / timeQuantum)
        });
      } else {
        currentBooking.status = 'processing';
      }
      
      slotIndex = (slotIndex + 1) % queue.length;
      if (queue.length === 0) break;
    }
    
    setProcessedBookings(processed);
    setBookingQueue(queue);
    setCurrentSlot(slotIndex);
    setRoundRobinResult({
      totalProcessed: processed.length,
      totalExecutionTime: currentTime,
      averageTimePerBooking: processed.length > 0 ? currentTime / processed.length : 0
    });
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>🎓 Final Year Project - Interactive Algorithm Playground</h2>
      <p className={styles.subtitle}>
        Real-time execution visualizers for core data structures implemented in the railway reservation system.
      </p>

      <div className={styles.tabHeader}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'dijkstra' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('dijkstra')}
        >
          📍 Dijkstra's Route Optimization
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'pq' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('pq')}
        >
          👑 Priority Queue Heap Waitlist
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'segtree' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('segtree')}
        >
          🌲 Segment Tree Seat Allocator
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'roundrobin' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('roundrobin')}
        >
          ⚙️ Round Robin Scheduling
        </button>
      </div>

      <div className={styles.tabContent}>
        {/* DIJKSTRA SOLVER VISUALIZER */}
        {activeTab === 'dijkstra' && (
          <div className={styles.visualizerBlock}>
            <h3>Shortest Route Planner (Dijkstra)</h3>
            <p className={styles.desc}>
              Dijkstra's algorithm dynamically calculates the absolute shortest path between two railway stations based on edge durations (minutes).
            </p>

            <div className={styles.grid}>
              <div className={styles.card}>
                <h4>Add Custom Route Segment</h4>
                <div className={styles.formRow}>
                  <input 
                    type="text" 
                    placeholder="Source Station (e.g. Pokhara)" 
                    value={newEdge.source} 
                    onChange={e => setNewEdge({...newEdge, source: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="Destination Station" 
                    value={newEdge.destination} 
                    onChange={e => setNewEdge({...newEdge, destination: e.target.value})}
                  />
                  <input 
                    type="number" 
                    placeholder="Duration (mins)" 
                    value={newEdge.weight} 
                    onChange={e => setNewEdge({...newEdge, weight: e.target.value})}
                  />
                  <button onClick={addEdge} className={styles.actionBtn}>Add Segment</button>
                </div>

                <h4 style={{ marginTop: '1.5rem' }}>Active Route Graph</h4>
                <div className={styles.edgesList}>
                  {edges.map((edge, idx) => (
                    <div key={idx} className={styles.edgeItem}>
                      {edge.source} ➔ {edge.destination} ({edge.weight} mins)
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <h4>Find Shortest Path</h4>
                <div className={styles.formRow}>
                  <label>From: </label>
                  <input type="text" value={startNode} onChange={e => setStartNode(e.target.value)} />
                  <label>To: </label>
                  <input type="text" value={endNode} onChange={e => setEndNode(e.target.value)} />
                  <button onClick={solveRoute} className={styles.solveBtn}>Run Solver</button>
                </div>

                {routeResult && (
                  <div className={styles.resultBox}>
                    {routeResult.path.length > 0 ? (
                      <>
                        <div className={styles.pathVisual}>
                          {routeResult.path.map((node, idx) => (
                            <span key={idx}>
                              <span className={styles.nodeBubble}>{node}</span>
                              {idx < routeResult.path.length - 1 && <span className={styles.arrow}>➔</span>}
                            </span>
                          ))}
                        </div>
                        <p className={styles.pathSummary}>
                          🚀 Optimal Path Duration: <strong>{routeResult.duration} minutes</strong> ({(routeResult.duration/60).toFixed(1)} hrs)
                        </p>
                      </>
                    ) : (
                      <p className={styles.errorText}>⚠️ No route connection exists between these stations.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRIORITY QUEUE HEAP VISUALIZER */}
        {activeTab === 'pq' && (
          <div className={styles.visualizerBlock}>
            <h3>Max-Heap Waitlist Promotion Queue</h3>
            <p className={styles.desc}>
              Instead of simple FIFO, the waitlist uses a Binary Max-Heap prioritizing passenger eligibility rank (e.g. reservation class, special status). If ranks are equal, timestamps break the tie fairly.
            </p>

            <div className={styles.grid}>
              <div className={styles.card}>
                <h4>Add Passenger to Waitlist</h4>
                <div className={styles.formRow}>
                  <input 
                    type="text" 
                    placeholder="Passenger Name" 
                    value={newPassenger.name} 
                    onChange={e => setNewPassenger({...newPassenger, name: e.target.value})}
                  />
                  <input 
                    type="number" 
                    placeholder="Priority Value (1-10)" 
                    value={newPassenger.priority} 
                    onChange={e => setNewPassenger({...newPassenger, priority: e.target.value})}
                  />
                  <button onClick={addPassenger} className={styles.actionBtn}>Enqueue</button>
                </div>

                <div className={styles.promotionBox}>
                  <button onClick={simulatePromotion} className={styles.promoteBtn}>
                    💡 Free a Seat (Promote Top Priority)
                  </button>
                  {promotedPassenger && (
                    <div className={styles.promotedResult}>
                      🎉 Promoted to Confirmed: <strong>{promotedPassenger}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <h4>Active Waitlist Heap Array</h4>
                <div className={styles.pqList}>
                  {passengers.length === 0 ? (
                    <p className={styles.emptyText}>Waitlist is currently empty.</p>
                  ) : (
                    passengers.map((passenger, idx) => (
                      <div key={idx} className={styles.pqItem}>
                        <span className={styles.indexBadge}>Heap Index {idx}</span>
                        <span className={styles.passengerName}>{passenger.name || passenger}</span>
                        {passenger.priority && (
                          <span className={styles.priorityBadge}>Priority: {passenger.priority}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SEGMENT TREE VISUALIZER */}
        {activeTab === 'segtree' && (
          <div className={styles.visualizerBlock}>
            <h3>Segment Tree Smart Seat Allocator</h3>
            <p className={styles.desc}>
              Enables segment-based ticketing (e.g. Kathmandu ➔ Chitwan ➔ Pokhara ➔ Bardiya). A passenger can book Chitwan to Pokhara, while another passenger is free to book Kathmandu to Chitwan on the exact same seat.
            </p>

            <div className={styles.grid}>
              <div className={styles.card}>
                <h4>Add Active Range Bookings</h4>
                <div className={styles.formRow}>
                  <label>Start Segment Index: </label>
                  <input 
                    type="number" 
                    value={newSegmentBooking.start} 
                    onChange={e => setNewSegmentBooking({...newSegmentBooking, start: e.target.value})} 
                  />
                  <label>End Segment Index: </label>
                  <input 
                    type="number" 
                    value={newSegmentBooking.end} 
                    onChange={e => setNewSegmentBooking({...newSegmentBooking, end: e.target.value})} 
                  />
                  <button onClick={addSegmentBooking} className={styles.actionBtn}>Book Range</button>
                </div>

                <h4 style={{ marginTop: '1.5rem' }}>Active Range Bookings</h4>
                <div className={styles.edgesList}>
                  {segmentBookings.map((booking, idx) => (
                    <div key={idx} className={styles.edgeItem}>
                      Stop {booking.start} ➔ Stop {booking.end}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <h4>Query Range Availability</h4>
                <div className={styles.formRow}>
                  <label>Query Start: </label>
                  <input 
                    type="number" 
                    value={query.start} 
                    onChange={e => setQuery({...query, start: e.target.value})} 
                  />
                  <label>Query End: </label>
                  <input 
                    type="number" 
                    value={query.end} 
                    onChange={e => setQuery({...query, end: e.target.value})} 
                  />
                  <button onClick={queryAvailability} className={styles.solveBtn}>Query Allocator</button>
                </div>

                {availabilityResult !== null && (
                  <div className={styles.resultBox}>
                    {availabilityResult ? (
                      <p className={styles.successText}>✅ Seat is AVAILABLE for requested stops range!</p>
                    ) : (
                      <p className={styles.errorText}>❌ Seat is ALREADY BOOKED/OCCUPIED in this stops range.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ROUND ROBIN VISUALIZER */}
        {activeTab === 'roundrobin' && (
          <div className={styles.visualizerBlock}>
            <h3>Round Robin CPU Scheduling Algorithm</h3>
            <p className={styles.desc}>
              Fair CPU scheduling algorithm that allocates a fixed time quantum to each booking request in circular order. Prevents starvation and ensures fair processing during high concurrency periods.
            </p>

            <div className={styles.grid}>
              <div className={styles.card}>
                <h4>Add Booking Request</h4>
                <div className={styles.formRow}>
                  <input 
                    type="text" 
                    placeholder="Booking ID (e.g. BK004)" 
                    value={newRoundRobinBooking.id} 
                    onChange={e => setNewRoundRobinBooking({...newRoundRobinBooking, id: e.target.value})}
                  />
                  <input 
                    type="number" 
                    placeholder="Processing Time (ms)" 
                    value={newRoundRobinBooking.processingTime} 
                    onChange={e => setNewRoundRobinBooking({...newRoundRobinBooking, processingTime: e.target.value})}
                  />
                  <button onClick={addRoundRobinBooking} className={styles.actionBtn}>Add to Queue</button>
                </div>

                <div className={styles.formRow} style={{ marginTop: '1rem' }}>
                  <label>Time Quantum: </label>
                  <input 
                    type="number" 
                    value={timeQuantum} 
                    onChange={e => setTimeQuantum(parseInt(e.target.value))}
                    min="10"
                    max="100"
                  />
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>ms per time slice</span>
                </div>

                <div className={styles.promotionBox}>
                  <button onClick={simulateRoundRobin} className={styles.promoteBtn}>
                    ⚡ Run Round Robin Scheduler
                  </button>
                  <button onClick={resetRoundRobin} className={styles.actionBtn} style={{ marginTop: '0.5rem' }}>
                    🔄 Reset Queue
                  </button>
                </div>
              </div>

              <div className={styles.card}>
                <h4>Booking Queue Status</h4>
                <div className={styles.pqList}>
                  {bookingQueue.length === 0 ? (
                    <p className={styles.emptyText}>Queue is currently empty.</p>
                  ) : (
                    bookingQueue.map((booking, idx) => (
                      <div key={booking.id} className={styles.pqItem}>
                        <span className={styles.indexBadge}>Position {idx + 1}</span>
                        <span className={styles.passengerName}>{booking.id}</span>
                        <span className={styles.priorityBadge}>
                          {booking.status === 'completed' ? '✅ Done' : 
                           booking.status === 'processing' ? '⏳ Processing' : 
                           '⏸️ Waiting'} ({booking.processingTime}ms)
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {roundRobinResult && (
                  <div className={styles.resultBox} style={{ marginTop: '1rem' }}>
                    <p className={styles.successText}>
                      🎯 Processed {roundRobinResult.totalProcessed} bookings
                    </p>
                    <p className={styles.pathSummary}>
                      Total Execution Time: <strong>{roundRobinResult.totalExecutionTime}ms</strong> | 
                      Average: <strong>{roundRobinResult.averageTimePerBooking.toFixed(1)}ms</strong> per booking
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlgorithmVisualizers;
