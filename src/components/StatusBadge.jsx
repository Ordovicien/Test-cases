// src/components/StatusBadge.jsx
import React, { useState, useRef, useEffect } from 'react';

const STATUSES = ["To do", "Success", "Failed"]; // Peut être importé d'un fichier de constantes

function StatusBadge({ testId, currentStatus, onStatusChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isEditing) return;
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  const handleSelectStatus = (newStatus) => {
    onStatusChange(testId, newStatus);
    setIsEditing(false);
  };

  return (
    <div style={{ position: "relative", minWidth: 120 }}>
      {isEditing ? (
        <div ref={dropdownRef} className="status-dropdown">
          {STATUSES.map((st) => (
            <div
              key={st}
              className={`status-dropdown-item badge badge-${st.replace(/\s/g, "").toLowerCase()}`}
              onClick={() => handleSelectStatus(st)}
            >
              {st}
            </div>
          ))}
        </div>
      ) : (
        <span
          className={`badge badge-${currentStatus.replace(/\s/g, "").toLowerCase()}`}
          style={{ cursor: "pointer" }}
          onClick={() => setIsEditing(true)}
          title="Click to change status"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsEditing(true)}
        >
          {currentStatus}
        </span>
      )}
    </div>
  );
}

export default StatusBadge;