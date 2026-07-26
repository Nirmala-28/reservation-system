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
  const [bookings, setBookings] = useState([
    { start: 1, end: 3 }
  ]);
  const [query, setQuery] = useState({ start: 0, end: 1 });
  const [newBooking, setNewBooking] = useState({ start: 0, end: 1 });
  const [availabilityResult, setAvailabilityResult] = useState(null);

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
  const addBooking = () => {
    setBookings([...bookings, { 
      start: parseInt(newBooking.start), 
      end: parseInt(newBooking.end) 
    }]);
  };

  const queryAvailability = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/algorithm/segment-tree/query', {
        segments,
        bookings,
        query
      });
      setAvailabilityResult(response.data.isAvailable);
    } catch (err) {
      console.error(err);
    }
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
                    value={newBooking.start} 
                    onChange={e => setNewBooking({...newBooking, start: e.target.value})} 
                  />
                  <label>End Segment Index: </label>
                  <input 
                    type="number" 
                    value={newBooking.end} 
                    onChange={e => setNewBooking({...newBooking, end: e.target.value})} 
                  />
                  <button onClick={addBooking} className={styles.actionBtn}>Book Range</button>
                </div>

                <h4 style={{ marginTop: '1.5rem' }}>Active Range Bookings</h4>
                <div className={styles.edgesList}>
                  {bookings.map((booking, idx) => (
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
      </div>
    </div>
  );
};

export default AlgorithmVisualizers;
