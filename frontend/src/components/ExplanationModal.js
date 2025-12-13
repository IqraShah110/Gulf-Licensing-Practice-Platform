import React from 'react';
import { formatExplanation } from '../utils/api';

function ExplanationModal({ explanation, onClose }) {
  const formattedExplanation = formatExplanation(explanation);

  return (
    <>
      <div 
        className="modal-overlay show" 
        onClick={onClose}
        style={{ display: 'block' }}
      ></div>
      <div id="solution-card" className="solution-card show" style={{ display: 'block' }}>
        <div className="solution-header">
          <h3>Detailed Explanation</h3>
          <button className="close-explanation-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div 
          id="explanation-content" 
          className="solution-content"
          dangerouslySetInnerHTML={{ __html: formattedExplanation }}
        />
      </div>
    </>
  );
}

export default ExplanationModal;

