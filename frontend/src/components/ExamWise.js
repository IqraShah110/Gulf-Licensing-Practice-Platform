import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuizState } from '../hooks/useQuizState';
import { fetchMCQsByExam } from '../utils/api';
import MCQView from './MCQView';
import ResultsView from './ResultsView';
import ExamWiseModal from './modals/ExamWiseModal';
import SubjectWiseModal from './modals/SubjectWiseModal';

function ExamWise({ year: propYear, month: propMonth, openExamSelector, onBackToHome, showToast, setLoading, onViewChange }) {
  const [year, setYear] = useState(propYear || null);
  const [month, setMonth] = useState(propMonth || null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoadingState] = useState(false);
  const [currentDisplayYear, setCurrentDisplayYear] = useState(propYear || 2025);
  const quizState = useQuizState();
  const toggleRef = useRef(null);

  const YEARS = [2023, 2024, 2025];
  const MIN_YEAR = Math.min(...YEARS);
  const MAX_YEAR = Math.max(...YEARS);
  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  // Detect mobile/desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (propYear && propMonth) {
      // If props changed or we don't have data yet, load
      if (propYear !== year || propMonth !== month || quizState.currentMCQs.length === 0) {
        loadExamDate(propYear, propMonth);
      }
      setCurrentDisplayYear(propYear);
      setYear(propYear);
      setMonth(propMonth);
    }
  }, [propYear, propMonth, year, month, quizState.currentMCQs.length]);


  // Close dropdown on outside click (desktop only, mobile uses backdrop)
  useEffect(() => {
    if (!isDropdownOpen || isMobile) return;
    const handleClickOutside = (event) => {
      // If click is on the toggle button, ignore (handled there)
      if (toggleRef.current && toggleRef.current.contains(event.target)) {
        return;
      }
      setIsDropdownOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isDropdownOpen, isMobile]);

  const openDropdown = () => {
    // Set current display year to the selected year when opening
    if (year) {
      setCurrentDisplayYear(year);
    }
    if (!isMobile && toggleRef.current) {
      const rect = toggleRef.current.getBoundingClientRect();
      const isTablet = window.innerWidth > 768 && window.innerWidth <= 1024;
      let left = rect.left;
      
      if (isTablet) {
        left = Math.max(16, Math.min(left, window.innerWidth - 300));
      } else {
        left = Math.max(16, left);
      }
      
      // Position dropdown at fixed top (51px) to align with toggle button
      setMenuPos({
        top: 51, // Fixed position to align with toggle button
        left: left
      });
    }
    setIsDropdownOpen(true);
  };

  const handleYearNavigation = (direction) => {
    if (direction === 'prev' && currentDisplayYear > MIN_YEAR) {
      setCurrentDisplayYear(currentDisplayYear - 1);
    } else if (direction === 'next' && currentDisplayYear < MAX_YEAR) {
      setCurrentDisplayYear(currentDisplayYear + 1);
    }
  };

  const loadExamDate = async (selectedYear, selectedMonth) => {
    // For 2023/2024 show "will be updated soon" message immediately
    if (selectedYear === 2023 || selectedYear === 2024) {
      setIsDropdownOpen(false);
      showToast(`Data for ${selectedMonth} ${selectedYear} will be updated soon`, 'info');
      return;
    }

    try {
      setLoadingState(true);
      setLoading(true);
      setIsDropdownOpen(false); // Close dropdown when loading starts
      
      // Set year and month state immediately so UI updates
      setYear(selectedYear);
      setMonth(selectedMonth);
      
      // API function will handle month lowercase conversion
      const data = await fetchMCQsByExam(selectedYear, selectedMonth);
      
      if (!data || data.length === 0) {
        throw new Error(`This Month's MCQs for ${selectedYear} will be updated soon`);
      }

      quizState.handleMCQData(data, `${selectedMonth} ${selectedYear}`, '');
      quizState.setIsMockTest(false);
      
      showToast(`Loaded ${data.length} MCQs for ${selectedMonth} ${selectedYear}`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to load MCQs', 'error');
      // Keep year and month set so user can see what they selected
      // User can try selecting a different month
    } finally {
      setLoadingState(false);
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (quizState.currentIndex < quizState.currentMCQs.length - 1) {
      quizState.setCurrentIndex(quizState.currentIndex + 1);
      quizState.saveQuizState('next');
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (quizState.currentIndex > 0) {
      quizState.setCurrentIndex(quizState.currentIndex - 1);
      quizState.saveQuizState('prev');
    }
  };

  const handleSelectOption = (selected, correct) => {
    quizState.selectOption(selected, correct);
  };

  const handleMonthYearSelect = (y, m) => {
    // Close dropdown when month is selected
    setIsDropdownOpen(false);
    // If already on this month/year, just return
    if (y === year && m === month) {
      return;
    }
    loadExamDate(y, m);
  };

  const handleSwitchToSubjectWise = () => {
    setShowSubjectModal(true);
  };

  const handleSubjectSelect = (subject) => {
    setShowSubjectModal(false);
    if (onViewChange) {
      onViewChange('subject-wise', { subject });
    } else {
      onBackToHome();
    }
  };

  const handleSubjectModalClose = () => {
    setShowSubjectModal(false);
  };

  const titleText = month && year ? `${month} ${year}` : 'Select Exam Session';

  const examTitle = (
    <div className="exam-selector">
      <button
        ref={toggleRef}
        type="button"
        className="exam-selector-toggle"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isDropdownOpen) {
            setIsDropdownOpen(false);
          } else {
            openDropdown();
          }
        }}
      >
        <span className="highlight exam-title-text">
          {titleText}
        </span>
        <span className="exam-selector-icon">{isDropdownOpen ? '▲' : '▼'}</span>
      </button>

      {isDropdownOpen &&
        createPortal(
          <>
            {isMobile && (
              <div
                className="exam-dropdown-backdrop"
                onClick={(e) => {
                  // Only close if clicking directly on backdrop, not on dropdown
                  if (e.target === e.currentTarget) {
                    setIsDropdownOpen(false);
                  }
                }}
                onTouchEnd={(e) => {
                  if (e.target === e.currentTarget) {
                    setIsDropdownOpen(false);
                  }
                }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 99998,
                  backdropFilter: 'blur(2px)',
                  animation: 'fadeIn 0.3s ease',
                  pointerEvents: 'auto'
                }}
              />
            )}
            <div
              className={`exam-dropdown-menu ${isMobile ? 'exam-dropdown-bottom-sheet' : ''}`}
              style={
                isMobile
                  ? {
                      position: 'fixed',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      zIndex: 99999,
                      animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      pointerEvents: 'auto',
                      touchAction: 'manipulation'
                    }
                  : {
                      top: `${menuPos.top}px`,
                      left: `${menuPos.left}px`,
                      animation: 'fadeInDown 0.2s ease',
                      pointerEvents: 'auto',
                      touchAction: 'manipulation'
                    }
              }
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* Year Navigation Bar */}
              <div className="exam-year-navigation">
                <button
                  type="button"
                  className="exam-year-nav-arrow"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleYearNavigation('prev');
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleYearNavigation('prev');
                  }}
                  disabled={currentDisplayYear <= MIN_YEAR}
                  style={{
                    pointerEvents: 'auto',
                    touchAction: 'manipulation'
                  }}
                  aria-label="Previous year"
                >
                  ←
                </button>
                <div
                  className={`exam-year-display ${
                    currentDisplayYear === 2023 || currentDisplayYear === 2024
                      ? 'disabled-year'
                      : ''
                  }`}
                >
                  {currentDisplayYear}
                </div>
                <button
                  type="button"
                  className="exam-year-nav-arrow"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleYearNavigation('next');
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleYearNavigation('next');
                  }}
                  disabled={currentDisplayYear >= MAX_YEAR}
                  style={{
                    pointerEvents: 'auto',
                    touchAction: 'manipulation'
                  }}
                  aria-label="Next year"
                >
                  →
                </button>
              </div>

              {/* Month Grid */}
              <div className="exam-month-grid">
                {MONTHS.map((m) => {
                  const isDisabled = currentDisplayYear === 2023 || currentDisplayYear === 2024;
                  const isActive =
                    currentDisplayYear === year && m === month;
                  return (
                    <button
                      key={`${currentDisplayYear}-${m}`}
                      type="button"
                      className={
                        'exam-month-item' +
                        (isActive ? ' active' : '') +
                        (isDisabled ? ' disabled-year' : '')
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMonthYearSelect(currentDisplayYear, m);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMonthYearSelect(currentDisplayYear, m);
                      }}
                      disabled={isDisabled}
                      style={{
                        pointerEvents: 'auto',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'rgba(52, 152, 219, 0.2)'
                      }}
                    >
                      {m.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );

  // Auto-open modal when coming from Subject-wise with no selection
  useEffect(() => {
    if (openExamSelector && (!year || !month)) {
      setShowModal(true);
    }
  }, [openExamSelector, year, month]);

  const handleModalSelect = ({ year: selectedYear, month: selectedMonth }) => {
    setShowModal(false);
    loadExamDate(selectedYear, selectedMonth);
  };

  const handleModalClose = () => {
    setShowModal(false);
    // If no selection was made, go back to home
    if (!year || !month) {
      onBackToHome();
    }
  };

  const switchButton = (
    <button 
      className="nav-btn switch-btn"
      onClick={handleSwitchToSubjectWise}
    >
      Switch to Subject-wise MCQs
    </button>
  );

  if (showResults) {
    return (
      <ResultsView
        mcqs={quizState.currentMCQs}
        userAnswers={quizState.userAnswers}
        isMockTest={false}
        onBackToHome={onBackToHome}
        onReview={() => {
          setShowResults(false);
          quizState.setCurrentIndex(0);
        }}
      />
    );
  }

  // Show loading state when actually loading
  if (loading) {
    return (
      <div className="container my-5">
        <p>Loading exam data...</p>
      </div>
    );
  }

  // If no year/month selected yet, show modal or message
  if (!year || !month) {
    return (
      <>
        <ExamWiseModal
          show={showModal}
          onClose={handleModalClose}
          onSelect={handleModalSelect}
        />
        {!showModal && (
          <div className="container my-5">
            <p>Please select a month and year to view MCQs.</p>
            <button 
              className="btn btn-primary mt-3"
              onClick={() => setShowModal(true)}
            >
              Select Exam Session
            </button>
          </div>
        )}
      </>
    );
  }

  // If we have year/month but no MCQs, show error message + reopen selector
  if (quizState.currentMCQs.length === 0) {
    return (
      <>
        <ExamWiseModal
          show={showModal}
          onClose={handleModalClose}
          onSelect={handleModalSelect}
          initialYear={year || 2025}
          initialMonth={month || 'January'}
        />
        <div className="container my-5">
          <p>MCQs for {month} {year} will be updated soon. Please try another month.</p>
          <button 
            className="btn btn-primary mt-3"
            onClick={() => {
              setShowModal(true);
              setIsDropdownOpen(false);
            }}
          >
            Select Different Month
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <SubjectWiseModal
        show={showSubjectModal}
        onClose={handleSubjectModalClose}
        onSelect={handleSubjectSelect}
      />
      <div className="content-section active" style={{ display: 'block', opacity: 1 }}>
      <MCQView
        mcqs={quizState.currentMCQs}
        currentIndex={quizState.currentIndex}
        userAnswers={quizState.userAnswers}
        onSelectOption={handleSelectOption}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isMockTest={false}
        title={examTitle}
          switchButton={switchButton}
      />
    </div>
    </>
  );
}

export default ExamWise;

