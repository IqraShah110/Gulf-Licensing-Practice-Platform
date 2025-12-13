import React, { useState } from 'react';

const years = [2023, 2024, 2025];
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function ExamWiseModal({ show, onClose, onSelect }) {
  const [selectedYear, setSelectedYear] = useState(null);

  if (!show) return null;

  const handleYearSelect = (year) => {
    setSelectedYear(year);
  };

  const handleMonthSelect = (month) => {
    onSelect({ year: selectedYear, month });
  };

  const handleBack = () => {
    setSelectedYear(null);
  };

  return (
    <>
      <div 
        className="modal-overlay show" 
        onClick={onClose}
        style={{ display: 'block' }}
      ></div>
      <div id="exam-wise-modal" className="selection-modal show" style={{ display: 'block' }}>
        <div className="modal-header">
          <h2>{selectedYear ? `Select Month - ${selectedYear}` : 'Select Exam Year'}</h2>
          <button className="close-modal-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-content">
          {!selectedYear ? (
            <div className="month-grid">
              {years.map(year => (
                <button
                  key={year}
                  className="month-btn"
                  onClick={() => handleYearSelect(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <button 
                  className="nav-btn" 
                  onClick={handleBack}
                  style={{ 
                    background: 'linear-gradient(135deg, #6c757d, #5a6268)',
                    marginBottom: '10px'
                  }}
                >
                  ← Back to Years
                </button>
              </div>
              <div className="month-grid">
                {months.map(month => (
                  <button
                    key={month}
                    className="month-btn"
                    onClick={() => handleMonthSelect(month)}
                  >
                    {month}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default ExamWiseModal;

