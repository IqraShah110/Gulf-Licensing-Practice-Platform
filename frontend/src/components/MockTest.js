import React, { useState, useEffect } from 'react';
import { useQuizState, useMockTimer } from '../hooks/useQuizState';
import { fetchMockTestMCQs } from '../utils/api';
import MCQView from './MCQView';
import ResultsView from './ResultsView';

function MockTest({ onBackToHome, showToast, setLoading }) {
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const quizState = useQuizState();
  const timer = useMockTimer(quizState.isMockTest);

  useEffect(() => {
    // Reset state when component mounts
    setShowResults(false);
    setIsLoading(true);
    loadMockTest();
  }, []);

  useEffect(() => {
    // Only show results if timer expires AND we have MCQs AND we're not loading
    if (!isLoading && timer.remainingMs <= 0 && quizState.currentMCQs.length > 0) {
      setShowResults(true);
      timer.clearTimer();
    }
  }, [timer.remainingMs, quizState.currentMCQs.length, isLoading]);

  const loadMockTest = async () => {
    try {
      setLoading(true);
      setIsLoading(true);
      setShowResults(false); // Ensure results are hidden when loading
      
      const data = await fetchMockTestMCQs();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data || data.length === 0) {
        throw new Error('No MCQs available for mock test');
      }

      // Clear any persisted timer state for a fresh start
      try {
        localStorage.removeItem('quizTimerV1');
      } catch (e) {
        // ignore
      }

      quizState.handleMCQData(data, '', 'Mock Test');
      quizState.setIsMockTest(true);
      quizState.setCurrentIndex(0); // Reset to first question
      
      // Clear timer after isMockTest is set
      setTimeout(() => {
        timer.clearTimer();
      }, 100);
      
      showToast(`Mock test ready with ${data.length} questions`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to start mock test', 'error');
      onBackToHome();
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (quizState.currentIndex < quizState.currentMCQs.length - 1) {
      quizState.setCurrentIndex(quizState.currentIndex + 1);
      quizState.saveQuizState('next');
    } else {
      setShowResults(true);
      timer.clearTimer();
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

  // Show loading state
  if (isLoading || quizState.currentMCQs.length === 0) {
    return (
      <div className="container my-5" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '1.2em', color: '#374151', marginBottom: '10px' }}>
          Loading mock test questions...
        </div>
        <div style={{ fontSize: '0.9em', color: '#6b7280' }}>
          Fetching 210 MCQs from all subjects
        </div>
      </div>
    );
  }

  // Show results only after completion or timer expiry
  if (showResults) {
    const totalMs = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    // Calculate time taken: if timer expired, remainingMs will be 0 or very small
    // If user completed early, remainingMs will be > 0
    const elapsedMs = totalMs - timer.remainingMs;
    const takenMin = Math.max(0, Math.round(elapsedMs / 60000));
    
    // Ensure we have valid data
    if (!quizState.currentMCQs || quizState.currentMCQs.length === 0) {
      return (
        <div className="container my-5">
          <p>No test data available. Please start a new mock test.</p>
          <button className="btn btn-primary mt-3" onClick={onBackToHome}>
            Start New Mock Test
          </button>
        </div>
      );
    }
    
    return (
      <ResultsView
        mcqs={quizState.currentMCQs}
        userAnswers={quizState.userAnswers || []}
        isMockTest={true}
        onBackToHome={onBackToHome}
        onReview={() => {
          setShowResults(false);
          quizState.setCurrentIndex(0);
        }}
        timeTaken={takenMin}
      />
    );
  }

  const timerDisplay = `Time Remaining: ${timer.formatTime()}`;

  return (
    <div className="content-section active" style={{ display: 'block', opacity: 1 }}>
      <MCQView
        mcqs={quizState.currentMCQs}
        currentIndex={quizState.currentIndex}
        userAnswers={quizState.userAnswers}
        onSelectOption={handleSelectOption}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isMockTest={true}
        title={<span className="highlight">GulfCertify Mock Test – GP</span>}
        timerDisplay={timerDisplay}
      />
    </div>
  );
}

export default MockTest;

