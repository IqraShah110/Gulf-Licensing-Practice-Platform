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
  timerDisplay
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const currentMCQ = mcqs[currentIndex];
  
  if (!currentMCQ) {
    return <div>No question available</div>;
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
    if (isReview) {
      className += ' disabled';
    }
    return className;
  };

  return (
    <div className="main-content-container">
      <div className="header-container">
        <h2 className="section-title">
          {title}:<span id="stats-title">{currentIndex + 1}/{isMockTest ? 200 : mcqs.length}</span>
        </h2>
        {timerDisplay && (
          <span id="timer" style={{marginLeft: 'auto', fontWeight: 800, color: '#374151'}}>
            {timerDisplay}
          </span>
        )}
      </div>
      <div id="question-box" className="mcq-container" style={{margin: '0px'}}>
        {isReview && userAnswer && (
          <div className="review-mode">
            Review Mode - Your previous answer: {userAnswer}
          </div>
        )}
        <div className="question-box clean-white">
          <h6 className="question-title larger-stem">
            <span>
              <span className="question-label">Q:</span> {escapeHtml(questionText)}
            </span>
          </h6>
        </div>
        <div className="options-container even-options">
          {Object.entries(options).map(([key, value]) => {
            if (!value) return null;
            return (
              <div
                key={key}
                className={getOptionClass(key)}
                onClick={() => handleOptionClick(key)}
                style={{ cursor: (!hasCorrectAnswer || isReview) ? 'not-allowed' : 'pointer' }}
              >
                <input
                  type="radio"
                  name={`mcq-${currentIndex}`}
                  checked={userAnswer === key}
                  disabled={!hasCorrectAnswer || isReview}
                  readOnly
                />
                <span className="option-text">{key}) {value}</span>
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
        {!isMockTest && userAnswer && currentMCQ.explanation && (
          <div className="explanation-btn-container">
            <button 
              className="show-explanation-btn"
              onClick={() => setShowExplanation(true)}
            >
              Show Explanation
            </button>
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

