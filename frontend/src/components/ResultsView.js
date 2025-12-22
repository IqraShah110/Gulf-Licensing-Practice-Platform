import React, { useState } from 'react';
import { escapeHtml, formatExplanation } from '../utils/api';
import ExplanationModal from './ExplanationModal';

function ResultsView({ mcqs, userAnswers, isMockTest, onBackToHome, onReview, timeTaken }) {
  const [showReview, setShowReview] = useState(false);
  const [expandedExplanation, setExpandedExplanation] = useState(null);

  const totalQuestions = mcqs.length;
  const totalAnswered = userAnswers.filter(answer => answer !== null).length;
  const correctAnswers = userAnswers.reduce((count, answer, index) => {
    if (index < mcqs.length && mcqs[index]) {
      return count + (answer === mcqs[index].correct_answer ? 1 : 0);
    }
    return count;
  }, 0);
  
  // Calculate percentage based on total questions for both mock test and regular practice
  // This provides a consistent scoring method
  const percentage = totalQuestions > 0 
    ? Math.round((correctAnswers / totalQuestions) * 100) 
    : 0;
  
  // Also calculate accuracy of answered questions for reference
  const accuracyPercentage = totalAnswered > 0 
    ? Math.round((correctAnswers / totalAnswered) * 100) 
    : 0;

  // Calculate subject-wise breakdown for mock test
  const subjectBreakdown = {};
  if (isMockTest && mcqs.length > 0) {
    mcqs.forEach((mcq, index) => {
      const subject = mcq.subject || 'Unknown';
      if (!subjectBreakdown[subject]) {
        subjectBreakdown[subject] = {
          total: 0,
          correct: 0,
          answered: 0
        };
      }
      subjectBreakdown[subject].total++;
      const userAnswer = userAnswers[index];
      if (userAnswer !== null) {
        subjectBreakdown[subject].answered++;
        if (userAnswer === mcq.correct_answer) {
          subjectBreakdown[subject].correct++;
        }
      }
    });
  }

  // Subject name mapping for display
  const subjectDisplayNames = {
    'Medicine': 'Medicine',
    'Gynae': 'Obstetrics & Gynecology',
    'Paeds': 'Pediatrics',
    'Surgery': 'Surgery'
  };

  if (showReview) {
    return (
      <div className="content-section active" style={{ display: 'block', opacity: 1, padding: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ color: '#2c3e50', margin: 0 }}>Review All Questions</h2>
          <button 
            className="nav-btn" 
            onClick={() => setShowReview(false)}
          >
            ← Back to Results
          </button>
        </div>
        <div style={{
          maxWidth: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 180px)',
          paddingRight: '8px',
          paddingBottom: '20px'
        }}>
          {mcqs.map((q, index) => {
            const userAnswer = userAnswers[index];
            const options = q.options || {
              A: q.option_a,
              B: q.option_b,
              C: q.option_c,
              D: q.option_d,
            };
            const hasExplanation = q.explanation && q.explanation.trim() !== '';
            const showExplanationForThis = expandedExplanation === index;
            
            return (
              <div key={index} className="review-item" style={{
                marginBottom: '30px',
                padding: '20px',
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9em',
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </div>
                  <div style={{
                    flex: 1,
                    fontSize: '1.05em',
                    color: '#1f2937',
                    fontWeight: 500,
                    lineHeight: 1.5
                  }}>
                    {escapeHtml(q.question_text)}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  {Object.entries(options).map(([key, value]) => {
                    if (!value) return null;
                    const isCorrect = key === q.correct_answer;
                    const isChosen = key === userAnswer;
                    
                    // Determine styling
                    let optionStyle = {
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      background: '#ffffff',
                      color: '#374151',
                      cursor: 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      pointerEvents: 'none'
                    };
                    
                    if (isCorrect) {
                      // Green for correct answer
                      optionStyle.background = '#ecfdf5';
                      optionStyle.borderColor = '#10b981';
                      optionStyle.color = '#065f46';
                      optionStyle.fontWeight = 600;
                    } else if (isChosen && !isCorrect) {
                      // Red for wrong user selection
                      optionStyle.background = '#fef2f2';
                      optionStyle.borderColor = '#ef4444';
                      optionStyle.color = '#7f1d1d';
                      optionStyle.fontWeight = 600;
                    } else {
                      // Gray for other options
                      optionStyle.background = '#f9fafb';
                      optionStyle.borderColor = '#e5e7eb';
                      optionStyle.color = '#6b7280';
                    }
                    
                    return (
                      <div key={key} style={optionStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <input
                            type="radio"
                            name={`review-mcq-${index}`}
                            checked={isCorrect || isChosen}
                            disabled
                            readOnly
                            style={{
                              marginRight: '12px',
                              cursor: 'not-allowed',
                              width: '18px',
                              height: '18px',
                              accentColor: isCorrect ? '#10b981' : (isChosen ? '#ef4444' : '#9ca3af'),
                              pointerEvents: 'none'
                            }}
                          />
                          <span style={{ flex: 1 }}>
                            <strong style={{ marginRight: '8px' }}>{key}.</strong>
                            {escapeHtml(value)}
                            {isCorrect && <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: 700, fontSize: '0.9em' }}>✓ Correct Answer</span>}
                            {isChosen && !isCorrect && <span style={{ marginLeft: '8px', color: '#ef4444', fontWeight: 700, fontSize: '0.9em' }}>✗ Your Answer (Wrong)</span>}
                            {!isChosen && !isCorrect && userAnswer !== null && <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '0.85em' }}>(Not selected)</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Explanation Button - Always visible if explanation exists */}
                {hasExplanation && (
                  <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                    <button
                      className="explanation-btn"
                      onClick={() => {
                        setExpandedExplanation(showExplanationForThis ? null : index);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        background: showExplanationForThis 
                          ? 'linear-gradient(135deg, #1d4ed8, #1e40af)' 
                          : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.95em',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!showExplanationForThis) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!showExplanationForThis) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                        }
                      }}
                    >
                      <i className="fas fa-lightbulb" style={{ fontSize: '1em' }}></i>
                      <span>{showExplanationForThis ? 'Hide Explanation' : 'Show Explanation'}</span>
                      <i className={`fas fa-chevron-${showExplanationForThis ? 'up' : 'down'}`} style={{ fontSize: '0.85em', marginLeft: '4px' }}></i>
                    </button>
                  </div>
                )}
                
                {/* Explanation Content */}
                {hasExplanation && showExplanationForThis && (
                  <div className="explanation-content" style={{
                    marginTop: '12px',
                    padding: '20px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '2px solid #3b82f6',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                  }}>
                    <div style={{
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '2px solid #e5e7eb',
                      color: '#1e40af',
                      fontWeight: 700,
                      fontSize: '1em'
                    }}>
                      📚 Explanation:
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: formatExplanation(q.explanation) }} style={{
                      lineHeight: 1.6,
                      color: '#374151'
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button 
            className="nav-btn" 
            onClick={() => {
              if (onBackToHome) {
                onBackToHome();
              }
            }}
          >
            Start New Practice
          </button>
        </div>
      </div>
    );
  }

  if (isMockTest) {
    return (
      <div className="content-section active" style={{ display: 'block', opacity: 1 }}>
        <div className="mock-result-card" style={{
          maxWidth: 'min(520px, 92vw)',
          margin: '0 auto',
          padding: 'clamp(16px,2.5vw,24px)',
          background: '#fff',
          borderRadius: '14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          textAlign: 'center'
        }}>
          <div className="mock-result-title" style={{
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: '10px',
            fontSize: 'clamp(16px,2vw,18px)'
          }}>Test Result</div>
          <div className="mock-result-label" style={{ color: '#1f2937', marginBottom: '4px' }}>Score:</div>
          <div className="mock-score" style={{
            fontSize: 'clamp(32px,6vw,40px)',
            fontWeight: 800,
            color: '#1e3a8a',
            lineHeight: 1
          }}>{percentage}%</div>
          <div className="mock-progress" style={{
            height: '8px',
            background: '#e5e7eb',
            borderRadius: '9999px',
            margin: '14px 0',
            overflow: 'hidden'
          }}>
            <div className="mock-progress-fill" style={{
              width: `${percentage}%`,
              height: '100%',
              background: '#22c55e'
            }}></div>
          </div>
          <div className="mock-meta" style={{ color: '#374151', margin: '8px 0' }}>
            {correctAnswers} out of {totalQuestions}
          </div>
          <div className="mock-meta-sub" style={{ color: '#6b7280', margin: '4px 0' }}>
            Time Taken: {timeTaken !== undefined && timeTaken !== null ? timeTaken : 0} minutes
          </div>
          
          {/* Subject-wise Breakdown */}
          {Object.keys(subjectBreakdown).length > 0 && (
            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'left'
            }}>
              <div style={{
                fontWeight: 600,
                color: '#374151',
                marginBottom: '12px',
                fontSize: '0.95em',
                textAlign: 'center'
              }}>
                Subject-wise Performance
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {Object.entries(subjectBreakdown)
                  .sort(([a], [b]) => {
                    // Sort by: Medicine, Obstetrics & Gynecology, Pediatrics, Surgery
                    const order = ['Medicine', 'Gynae', 'Paeds', 'Surgery'];
                    return (order.indexOf(a) === -1 ? 999 : order.indexOf(a)) - 
                           (order.indexOf(b) === -1 ? 999 : order.indexOf(b));
                  })
                  .map(([subject, stats]) => (
                    <div key={subject} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#f9fafb',
                      borderRadius: '6px',
                      fontSize: '0.9em'
                    }}>
                      <span style={{ color: '#374151', fontWeight: 500 }}>
                        {subjectDisplayNames[subject] || subject}:
                      </span>
                      <span style={{ color: '#1e40af', fontWeight: 600 }}>
                        {stats.correct}/{stats.total}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          <div className="mock-actions" style={{
            marginTop: '20px',
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button 
              className="nav-btn" 
              onClick={() => {
                setShowReview(true);
                // Call onReview callback if provided (to reset index to 0)
                if (onReview) {
                  onReview();
                }
              }}
            >
              Review Your Answers
            </button>
            <button 
              className="nav-btn" 
              onClick={() => {
                if (onBackToHome) {
                  onBackToHome();
                }
              }}
            >
              Start New Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular results view
  let performanceLevel, performanceColor, performanceIcon, performanceMessage;
  if (percentage >= 80) {
    performanceLevel = 'Excellent';
    performanceColor = '#10b981';
    performanceIcon = '🎉';
    performanceMessage = 'Outstanding performance!';
  } else if (percentage >= 60) {
    performanceLevel = 'Good';
    performanceColor = '#3b82f6';
    performanceIcon = '👍';
    performanceMessage = 'Well done!';
  } else if (percentage >= 40) {
    performanceLevel = 'Fair';
    performanceColor = '#f59e0b';
    performanceIcon = '📚';
    performanceMessage = 'Keep practicing!';
  } else {
    performanceLevel = 'Needs Improvement';
    performanceColor = '#ef4444';
    performanceIcon = '💪';
    performanceMessage = 'Don\'t give up!';
  }

  return (
    <div className="content-section active" style={{ display: 'block', opacity: 1 }}>
      <div className="results-container">
        <div className="results-header">
          <h2 className="results-title">Practice Complete!</h2>
          <p className="results-subtitle">{performanceMessage}</p>
        </div>
        
        <div className="score-display">
          <div className="score-circle" style={{ '--score-color': performanceColor, '--percentage': percentage }}>
            <div className="score-percentage">{percentage}%</div>
            <div className="score-label">Score</div>
          </div>
          
          <div className="score-details">
            <div className="score-item">
              <span className="score-number" style={{ color: performanceColor }}>{correctAnswers}</span>
              <span className="score-text">Correct</span>
            </div>
            <div className="score-divider"></div>
            <div className="score-item">
              <span className="score-number">{totalQuestions}</span>
              <span className="score-text">Total Questions</span>
            </div>
            {totalAnswered < totalQuestions && (
              <>
                <div className="score-divider"></div>
                <div className="score-item">
                  <span className="score-number" style={{ color: '#6b7280', fontSize: '0.9em' }}>{totalAnswered}</span>
                  <span className="score-text" style={{ fontSize: '0.85em' }}>Answered</span>
                </div>
              </>
            )}
          </div>
          {totalAnswered < totalQuestions && (
            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: '#f3f4f6',
              borderRadius: '8px',
              fontSize: '0.9em',
              color: '#6b7280'
            }}>
              Accuracy: {accuracyPercentage}% ({correctAnswers} out of {totalAnswered} answered)
            </div>
          )}
        </div>
        
        <div className="performance-badge" style={{
          background: `linear-gradient(135deg, ${performanceColor}, ${performanceColor}dd)`
        }}>
          <span className="badge-text">{performanceLevel}</span>
        </div>
        
        <div className="action-buttons">
          <button className="btn-review" onClick={() => setShowReview(true)}>
            <i className="fas fa-list-check"></i>
            <span>Review Answers</span>
          </button>
          <button className="btn-restart" onClick={onBackToHome}>
            <i className="fas fa-redo"></i>
            <span>Start New Practice</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultsView;

