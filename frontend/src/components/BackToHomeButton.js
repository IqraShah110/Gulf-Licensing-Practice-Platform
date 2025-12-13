import React from 'react';

function BackToHomeButton({ onClick }) {
  return (
    <button 
      id="back-to-home-btn" 
      className="back-to-home-btn" 
      onClick={onClick}
      style={{ display: 'block' }}
    >
      <i className="fas fa-home"></i> HOME
    </button>
  );
}

export default BackToHomeButton;

