// src/components/MiniStats.jsx
import React from 'react';

function MiniStats({ total, todo, done, failed }) {
  return (
    <div className="mini-stats">
      <span className="mini-stat total" title="Total Tests">{total}</span>
      <span className="mini-stat todo" title="To do">{todo}</span>
      <span className="mini-stat done" title="Success">{done}</span>
      <span className="mini-stat failed" title="Failed">{failed}</span>
    </div>
  );
}

export default MiniStats;