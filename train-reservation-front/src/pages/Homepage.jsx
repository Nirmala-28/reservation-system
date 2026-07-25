import React, { useEffect } from 'react';
import Booking from '../components/Home/Booking';

function HomePage() {
  useEffect(() => {
    // Scroll to top when component is mounted
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      <Booking/>
    </div>
  );
}

export default HomePage;