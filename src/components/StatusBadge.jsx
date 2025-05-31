// src/components/StatusBadge.jsx
import React, { useState, useRef, useEffect } from 'react';

const STATUSES = ["To do", "Success", "Failed"];

function StatusBadge({ testId, currentStatus, onStatusChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const dropdownRef = useRef(null);
  const badgeRef = useRef(null);

  useEffect(() => {
    if (isEditing && dropdownRef.current && badgeRef.current) {
      // Place la dropdown sous le badge, en position fixe (viewport)
      const badgeRect = badgeRef.current.getBoundingClientRect();
      dropdownRef.current.style.position = 'fixed';
      dropdownRef.current.style.left = badgeRect.left + 'px';
      dropdownRef.current.style.top = (badgeRect.bottom + 3) + 'px'; // 3px d'écart
      dropdownRef.current.style.zIndex = 9999;
      dropdownRef.current.style.minWidth = badgeRect.width + 'px';
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    function handleClickOutside(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        badgeRef.current &&
        !badgeRef.current.contains(event.target)
      ) {
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
    <div style={{ display: "inline-block" }}>
      <span
        className={`badge badge-${currentStatus.replace(/\s/g, "").toLowerCase()} cliquable-badge`}
        style={{ cursor: "pointer" }}
        onClick={() => setIsEditing(true)}
        title="Click to change status"
        role="button"
        tabIndex={0}
        ref={badgeRef}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsEditing(true)}
      >
        {currentStatus}
      </span>
      {isEditing && (
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
      )}
    </div>
  );
}

export default StatusBadge;
