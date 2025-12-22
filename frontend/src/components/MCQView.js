import React, { useState } from 'react';
import { escapeHtml, formatExplanation } from '../utils/api';
import ExplanationModal from './ExplanationModal';

function MCQView({ 
  mcqs, 
  currentIndex, 
  userAnswers, 
  onSelectOption, 
  onNext, 
  onPrevious,
  isMockTest,
  title,
  timerDisplay,
  switchButton
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  
  const currentMCQ = mcqs?.[currentIndex];
  
  if (!currentMCQ) {
    return <div>No question available (Index: {currentIndex}, Total: {mcqs?.length || 0})</div>;
  }

  const questionText = currentMCQ.question_text || currentMCQ.question || '';
  const options = currentMCQ.options || {
    A: currentMCQ.option_a,
    B: currentMCQ.option_b,
    C: currentMCQ.option_c,
    D: currentMCQ.option_d,
  };
  const hasCorrectAnswer = currentMCQ.correct_answer && currentMCQ.correct_answer.trim() !== '';
  const userAnswer = userAnswers[currentIndex];
  const isReview = userAnswer !== null;

  const handleOptionClick = (optionKey) => {
    if (!hasCorrectAnswer || isReview) return;
    onSelectOption(optionKey, currentMCQ.correct_answer);
  };

  const getOptionClass = (key) => {
    let className = 'option';
    if (userAnswer) {
      if (key === userAnswer) {
        className += userAnswer === currentMCQ.correct_answer ? ' correct' : ' incorrect';
      }
      if (key === currentMCQ.correct_answer) {
        className += ' correct';
      }
    }
    if (!hasCorrectAnswer) {
      className += ' disabled';
    }
    // Don't add disabled class when reviewing - keep options visible
    return className;
  };

  return (
    <div className="main-content-container">
      <div className="header-container">
        <h2 className="section-title">
          {title}<span id="stats-title">:{currentIndex + 1}/{isMockTest ? 210 : mcqs.length}</span>
        </h2>
        <div className="nav-center" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {switchButton}
          {timerDisplay && (
            <span id="timer" style={{fontWeight: 800, color: '#374151'}}>
              {timerDisplay}
            </span>
          )}
        </div>
      </div>
      <div id="question-box" className="mcq-container" style={{margin: '0px'}}>
        <div className="question-box clean-white">
          <h6 className="question-title larger-stem">
            <span>
              <span className="question-number-label">Q{currentIndex + 1}:</span> {escapeHtml(questionText)}
            </span>
          </h6>
        </div>
        <div className="options-container even-options">
          {Object.entries(options).map(([key, value]) => {
            if (!value) return null;
            const isCorrectAnswer = key === currentMCQ.correct_answer;
            // Show explanation button on correct answer after user has answered
            const showExplanationBtn = !isMockTest && userAnswer !== null && currentMCQ.explanation && isCorrectAnswer;
            
            return (
              <div
                key={key}
                className={getOptionClass(key)}
                onClick={() => handleOptionClick(key)}
                style={{ 
                  cursor: (!hasCorrectAnswer || isReview) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <input
                    type="radio"
                    name={`mcq-${currentIndex}`}
                    checked={userAnswer === key}
                    disabled={!hasCorrectAnswer || isReview}
                    readOnly
                  />
                  <span className="option-text">{value}</span>
                </div>
                {showExplanationBtn && (
                  <button
                    className="option-explanation-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExplanation(true);
                    }}
                    style={{
                      marginLeft: '12px',
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #28a745, #20c997)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.85em',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(40, 167, 69, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(40, 167, 69, 0.3)';
                    }}
                  >
                    <i className="fas fa-lightbulb" style={{ fontSize: '0.9em' }}></i>
                    <span>Explanation</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {!hasCorrectAnswer && (
          <div className="warning">
            Note: This question's correct answer is not available in the database.
            Please proceed to the next question.
          </div>
        )}
        <div className="nav-buttons">
          <button
            className="prev-btn"
            onClick={onPrevious}
            disabled={currentIndex === 0}
            style={{ display: currentIndex === 0 ? 'none' : 'block' }}
          >
            ← Previous Question
          </button>
          <button
            className="next-btn"
            onClick={onNext}
            style={{ display: userAnswer !== null ? 'block' : 'none' }}
          >
            {currentIndex === mcqs.length - 1 ? 'Show Results →' : 'Next Question →'}
          </button>
        </div>
      </div>
      {showExplanation && (
        <ExplanationModal
          explanation={currentMCQ.explanation}
          onClose={() => setShowExplanation(false)}
        />
      )}
    </div>
  );
}

export default MCQView;

