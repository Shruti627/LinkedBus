// src/components/BusList.jsx
import React from 'react';
import BusCard from './BusCard';

const BusList = ({ buses }) => {
  return (
    <div className="mt-10">
      <h3 className="text-2xl font-bold mb-5 text-gray-800">{buses.length} Buses Found</h3>
      <div className="space-y-4">
        {buses.map((bus) => (
          <BusCard key={bus.id} bus={bus} />
        ))}
      </div>
    </div>
  );
};

export default BusList;