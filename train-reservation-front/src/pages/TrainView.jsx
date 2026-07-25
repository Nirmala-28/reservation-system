import React from 'react';
import TrainSearch from '../components/TrainSearch/TrainSearch';
import Navbar from '../components/ReusableComponent/Navbar';

function TrainView() {
  return (
    <div>
        <Navbar/>
      <TrainSearch/>
    </div>
  );
}

export default TrainView;