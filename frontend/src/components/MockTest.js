import React, { useState, useEffect } from 'react';
import { useQuizState, useMockTimer } from '../hooks/useQuizState';
import { fetchMockTestMCQs } from '../utils/api';
import MCQView from './MCQView';
import ResultsView from './ResultsView';

function MockTest({ onBackToHome, showToast, setLoading }) {
  const [showResults, setShowResults] = useState(false);
  const quizState = useQuizState();
  const timer = useMockTimer(quizState.isMockTest);

  useEffect(() => {
    loadMockTest();
  }, []);

  useEffect(() => {
    if (timer.remainingMs <= 0 && quizState.currentMCQs.length > 0) {
      setShowResults(true);
      timer.clearTimer();
    }
  }, [timer.remainingMs, quizState.currentMCQs.length]);

  const loadMockTest = async () => {
    try {
      setLoading(true);
      const data = await fetchMockTestMCQs();
      
      if (data.error) {
        throw new Error(data.error);
      }

      quizState.handleMCQData(data, '', 'Mock Test');
      quizState.setIsMockTest(true);
      showToast('Mock test ready', 'success');
    } catch (error) {
      console.error('Error loading mock test:', error);
      showToast(error.message || 'Failed to start mock test', 'error');
      onBackToHome();
    } finally {
      setLoading(false);
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

  if (showResults) {
    const totalMs = 4 * 60 * 60 * 1000; // 4 hours
    const takenMin = Math.max(0, Math.round((totalMs - timer.remainingMs) / 60000));
    
    return (
      <ResultsView
        mcqs={quizState.currentMCQs}
        userAnswers={quizState.userAnswers}
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

  if (quizState.currentMCQs.length === 0) {
    return (
      <div className="container my-5">
        <p>Loading mock test...</p>
      </div>
    );
  }

  const timerDisplay = `Time Remaining: ${timer.formatTime()}`;

  return (
    <div className="content-section" style={{ display: 'block' }}>
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

