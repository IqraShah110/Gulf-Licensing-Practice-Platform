import React, { useState, useEffect } from 'react';

const years = [2023, 2024, 2025];
const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Abbreviated month names for display
const monthAbbreviations = {
  'January': 'Jan',
  'February': 'Feb',
  'March': 'Mar',
  'April': 'Apr',
  'May': 'May',
  'June': 'Jun',
  'July': 'Jul',
  'August': 'Aug',
  'September': 'Sep',
  'October': 'Oct',
  'November': 'Nov',
  'December': 'Dec'
};

function ExamWiseModal({ show, onClose, onSelect }) {
  const [currentYear, setCurrentYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 570);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setCurrentYear(2025);
      setSelectedMonth(null);
      setSelectedYear(null);
    }
  }, [show]);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 570);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!show) return null;

  const handleYearNavigation = (direction) => {
    const currentIndex = years.indexOf(currentYear);
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentYear(years[currentIndex - 1]);
      setSelectedMonth(null);
      setSelectedYear(null);
    } else if (direction === 'next' && currentIndex < years.length - 1) {
      setCurrentYear(years[currentIndex + 1]);
      setSelectedMonth(null);
      setSelectedYear(null);
    }
  };

  const handleMonthSelect = (month) => {
    // Check if year is 2023 or 2024 (no exams available)
    if (currentYear === 2023 || currentYear === 2024) {
      return;
    }
    
    if (isMobile) {
      // Auto-select and close modal when month is clicked on mobile
      onSelect({ year: currentYear, month: month });
    } else {
      // On desktop, just select the month (wait for Continue button)
      setSelectedMonth(month);
      setSelectedYear(currentYear);
    }
  };

  const handleContinue = () => {
    if (selectedMonth && selectedYear) {
      onSelect({ year: selectedYear, month: selectedMonth });
    }
  };

  const currentYearIndex = years.indexOf(currentYear);
  const isPrevDisabled = currentYearIndex === 0;
  const isNextDisabled = currentYearIndex === years.length - 1;

  // Mobile view (bottom sheet)
  if (isMobile) {
    return (
      <>
        <div 
          className="modal-overlay show" 
          onClick={onClose}
          style={{ display: 'block' }}
        ></div>
        <div id="exam-wise-modal" className="exam-session-modal-bottom-sheet show" style={{ display: 'block' }}>
          {/* Draggable Handle */}
          <div className="modal-drag-handle" onClick={onClose}></div>
          
          <div className="exam-session-content-bottom">
            {/* Year Navigation */}
            <div className="exam-year-navigation-bar">
              <button 
                className="year-nav-arrow" 
                onClick={() => handleYearNavigation('prev')}
                disabled={isPrevDisabled}
              >
                ←
              </button>
              <button className="current-year-display">{currentYear}</button>
              <button 
                className="year-nav-arrow" 
                onClick={() => handleYearNavigation('next')}
                disabled={isNextDisabled}
              >
                →
              </button>
            </div>
            
            {/* Month Grid */}
            <div className="exam-month-grid-container">
              {months.map(month => {
                const isNoExam = currentYear === 2023 || currentYear === 2024;
                
                return (
                  <button
                    key={month}
                    className={`exam-month-card ${isNoExam ? 'no-exam' : ''}`}
                    onClick={() => handleMonthSelect(month)}
                    disabled={isNoExam}
                  >
                    <div className="month-name">{monthAbbreviations[month]}</div>
                  </button>
                );
              })}
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
      <div id="exam-wise-modal" className="selection-modal exam-session-modal show" style={{ display: 'block' }}>
        <div className="modal-header exam-session-header">
          <div className="header-content">
            <h2>Select Exam Session</h2>
            <p className="header-subtitle">Choose year & month to view MCQs</p>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-content exam-session-content">
          {/* Year Navigation */}
          <div className="exam-year-navigation-bar">
            <button 
              className="year-nav-arrow" 
              onClick={() => handleYearNavigation('prev')}
              disabled={isPrevDisabled}
            >
              &lt;&lt;
            </button>
            <div className="current-year-display-desktop">{currentYear}</div>
            <button 
              className="year-nav-arrow" 
              onClick={() => handleYearNavigation('next')}
              disabled={isNextDisabled}
            >
              &gt;&gt;
            </button>
          </div>
          
          {/* Month Grid */}
          <div className="exam-month-grid-container-desktop">
            {months.map(month => {
              const isSelected = selectedMonth === month && selectedYear === currentYear;
              const isNoExam = currentYear === 2023 || currentYear === 2024;
              
              return (
                <button
                  key={month}
                  className={`exam-month-card-desktop ${isSelected ? 'selected' : ''} ${isNoExam ? 'no-exam' : ''}`}
                  onClick={() => handleMonthSelect(month)}
                  disabled={isNoExam}
                >
                  <div className="month-name-desktop">{month}</div>
                </button>
              );
            })}
          </div>
          
          {/* Selection Summary */}
          <div className="exam-selection-summary">
            Selected: <span>{selectedMonth && selectedYear ? `${selectedMonth} ${selectedYear}` : '-'}</span>
          </div>
          
          {/* Continue Button */}
          <button 
            className="exam-continue-btn" 
            onClick={handleContinue}
            disabled={!selectedMonth || !selectedYear}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}

export default ExamWiseModal;

