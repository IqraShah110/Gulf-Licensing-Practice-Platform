import React from 'react';

const subjects = ['Surgery', 'Medicine', 'Gynae', 'Paeds'];

function SubjectWiseModal({ show, onClose, onSelect }) {
  if (!show) return null;

  return (
    <>
      <div 
        className="modal-overlay show" 
        onClick={onClose}
        style={{ display: 'block' }}
      ></div>
      <div id="subject-wise-modal" className="selection-modal show" style={{ display: 'block' }}>
        <div className="modal-header">
          <h2>Select Subject</h2>
          <button className="close-modal-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-content">
          <div id="subject-buttons">
            {subjects.map(subject => (
              <button
                key={subject}
                className="subject-btn"
                onClick={() => onSelect(subject)}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default SubjectWiseModal;

