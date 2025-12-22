import React, { useState, useEffect } from 'react';

const subjects = ['Surgery', 'Medicine', 'Gynae', 'Paeds'];

function SubjectWiseModal({ show, onClose, onSelect }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 570);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 570);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setSelectedSubject(null);
    }
  }, [show]);

  if (!show) return null;

  const handleSubjectSelect = (subject) => {
    if (isMobile) {
      // Auto-select and close modal when subject is clicked on mobile
      onSelect(subject);
    } else {
      // On desktop, just select the subject (wait for Continue button)
      setSelectedSubject(subject);
    }
  };

  const handleContinue = () => {
    if (selectedSubject) {
      onSelect(selectedSubject);
    }
  };

  // Mobile view (bottom sheet)
  if (isMobile) {
    return (
      <>
        <div 
          className="modal-overlay show" 
          onClick={onClose}
          style={{ display: 'block' }}
        ></div>
        <div id="subject-wise-modal" className="exam-session-modal-bottom-sheet show" style={{ display: 'block' }}>
          {/* Draggable Handle */}
          <div className="modal-drag-handle" onClick={onClose}></div>
          
          <div className="exam-session-content-bottom">
            <div className="subject-selection-grid">
              {subjects.map(subject => (
                <button
                  key={subject}
                  className="subject-selection-card"
                  onClick={() => handleSubjectSelect(subject)}
                >
                  <div className="subject-name">{subject}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop view (centered modal)
  return (
    <>
      <div 
        className="modal-overlay show" 
        onClick={onClose}
        style={{ display: 'block' }}
      ></div>
      <div id="subject-wise-modal" className="selection-modal show" style={{ display: 'block' }}>
        <div className="modal-header exam-session-header">
          <div className="header-content">
            <h2>Select Subject</h2>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-content exam-session-content">
          <div className="subject-selection-grid-desktop">
            {subjects.map(subject => {
              const isSelected = selectedSubject === subject;
              
              return (
                <button
                  key={subject}
                  className={`subject-selection-card-desktop ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSubjectSelect(subject)}
                >
                  <div className="subject-name-desktop">{subject}</div>
                </button>
              );
            })}
          </div>
          
          {/* Continue Button */}
          <button 
            className="exam-continue-btn" 
            onClick={handleContinue}
            disabled={!selectedSubject}
            style={{ marginTop: '24px' }}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}

export default SubjectWiseModal;

