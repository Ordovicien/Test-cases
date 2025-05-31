// src/components/Modal.jsx
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

function Modal({ isOpen, onClose, title, children, size }) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Gestion focus + ESC
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement;

    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);

    // Focus sur premier élément focusable, sinon la modale
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      modalRef.current?.focus();
    }

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEsc);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  // Si non ouvert, rien à afficher
  if (!isOpen) {
    return null;
  }

  let modalContentClass = "modal-content";
  if (size === "lg") modalContentClass += " modal-lg";
  else if (size === "sm") modalContentClass += " modal-sm";

  // Id pour aria-labelledby si title existe
  const titleId = title ? `modal-title-${Math.random().toString(36).substr(2, 9)}` : undefined;

  // Important: ajoutez la classe "active" quand isOpen est true !
  return ReactDOM.createPortal(
    <div
      className={`modal-overlay${isOpen ? " active" : ""}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={modalContentClass}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {title && <h2 className="modal-title" id={titleId}>{title}</h2>}
        {children}
      </div>
    </div>,
    document.getElementById('modal-root')
  );
}

export default Modal;
