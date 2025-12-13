import React, { useState } from 'react';
import { escapeHtml } from '../utils/api';
import ExplanationModal from './ExplanationModal';

function ResultsView({ mcqs, userAnswers, isMockTest, onBackToHome, onReview, timeTaken }) {
  const [showReview, setShowReview] = useState(false);
  const [expandedExplanation, setExpandedExplanation] = useState(null);

  const totalAnswered = userAnswers.filter(answer => answer !== null).length;
  const correctAnswers = userAnswers.reduce((count, answer, index) => {
    return count + (answer === mcqs[index].correct_answer ? 1 : 0);
  }, 0);
  const percentage = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;

  if (showReview) {
    return (
      <div className="content-section" style={{ display: 'block', padding: '20px' }}>
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
          maxHeight: 'calc(100vh - 220px)',
          paddingRight: '8px'
        }}>
          {mcqs.map((q, index) => {
            const userAnswer = userAnswers[index];
            return (
              <div key={index} className="review-item">
                <div className="review-qnum">Q{index + 1}</div>
                <div className="review-qtext">{escapeHtml(q.question_text)}</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {Object.entries(q.options || {
                    A: q.option_a,
                    B: q.option_b,
                    C: q.option_c,
                    D: q.option_d,
                  }).map(([key, value]) => {
                    if (!value) return null;
                    const isCorrect = key === q.correct_answer;
                    const isChosen = key === userAnswer;
                    const base = 'border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;';
                    const muted = 'background:#f9fafb;color:#374151;';
                    const correct = 'background:#ecfdf5;color:#065f46;border-color:#86efac;';
                    const chosenWrong = 'background:#fef2f2;color:#7f1d1d;border-color:#fecaca;';
                    const style = isCorrect ? correct : (isChosen && !isCorrect ? chosenWrong : muted);
                    return (
                      <div key={key} style={{...base, ...style}}>
                        <strong>{key})</strong> {escapeHtml(value)}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      className="explanation-btn"
                      onClick={() => setExpandedExplanation(expandedExplanation === index ? null : index)}
                    >
                      <i className="fas fa-lightbulb"></i>
                      <span>{expandedExplanation === index ? 'Hide' : 'Show'} Explanation</span>
                      <i className={`fas fa-chevron-down explanation-arrow ${expandedExplanation === index ? 'active' : ''}`}></i>
                    </button>
                    {expandedExplanation === index && (
                      <div className="explanation-content" style={{ marginTop: '16px' }}>
                        <div dangerouslySetInnerHTML={{ __html: q.explanation }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <button className="nav-btn" onClick={onBackToHome}>
            Start New Practice
          </button>
        </div>
      </div>
    );
  }

  if (isMockTest) {
    return (
      <div className="content-section" style={{ display: 'block' }}>
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
            {correctAnswers} out of {mcqs.length}
          </div>
          <div className="mock-meta-sub" style={{ color: '#6b7280', margin: '4px 0' }}>
            Time Taken: {timeTaken || 0} minutes
          </div>
          <div className="mock-actions" style={{
            marginTop: '16px',
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <button className="nav-btn" onClick={() => setShowReview(true)}>
              Review Your Answers
            </button>
            <button className="nav-btn" onClick={onBackToHome}>
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
    <div className="content-section" style={{ display: 'block' }}>
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
              <span className="score-number">{totalAnswered}</span>
              <span className="score-text">Total</span>
            </div>
          </div>
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

