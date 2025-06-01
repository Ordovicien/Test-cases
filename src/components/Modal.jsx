// src/components/Modal.jsx
import React, { useEffect, useRef, useId, useMemo } from 'react';
import ReactDOM from 'react-dom';

const FOCUSABLE_ELEMENTS_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function Modal({ isOpen, onClose, title, children, size }) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  const titleId = useMemo(() => { // Ou useId
    if (!title) return undefined;
    return `modal-title-${Math.random().toString(36).substring(2, 9)}`;
  }, [title]);

  // Stocker onClose dans une ref pour éviter de le mettre dans les dépendances de l'effet principal
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      // La restauration du focus est gérée par la fonction de cleanup de l'effet précédent
      return;
    }

    // *** Effet principal quand la modale s'ouvre ***
    previousActiveElement.current = document.activeElement;
    const modalElement = modalRef.current;
    if (!modalElement) return;

    // Focus initial
    const focusableElements = Array.from(modalElement.querySelectorAll(FOCUSABLE_ELEMENTS_SELECTOR));
    const firstFocusableElement = focusableElements[0];
    if (firstFocusableElement) {
      firstFocusableElement.focus();
    } else {
      modalElement.focus();
    }

    // Listeners
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current(); // Utiliser la ref
      }
    };

    const trapFocus = (event) => {
      if (event.key !== 'Tab' || !modalElement) return;
      const currentFocusableElements = Array.from(modalElement.querySelectorAll(FOCUSABLE_ELEMENTS_SELECTOR)); // Récupérer au moment de l'event
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        return;
      }
      const currentFirstFocusable = currentFocusableElements[0];
      const currentLastFocusable = currentFocusableElements[currentFocusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === currentFirstFocusable) {
          currentLastFocusable.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === currentLastFocusable) {
          currentFirstFocusable.focus();
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleEsc);
    document.addEventListener('keydown', trapFocus);

    // Cleanup function: s'exécute quand isOpen devient false ou quand le composant est démonté
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', trapFocus);
      if (previousActiveElement.current && document.body.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]); // L'effet ne dépend QUE de isOpen pour son exécution/nettoyage principal.

  if (!isOpen) {
    return null;
  }

  let modalContentClass = "modal-content";
  if (size === "lg") modalContentClass += " modal-lg";
  else if (size === "sm") modalContentClass += " modal-sm";

  return ReactDOM.createPortal(
    <div
      className={`modal-overlay active`}
      onClick={onClose} // Ici on peut utiliser onClose directement
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