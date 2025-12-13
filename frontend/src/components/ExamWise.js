import React, { useState, useEffect } from 'react';
import { useQuizState } from '../hooks/useQuizState';
import { fetchMCQsByExam } from '../utils/api';
import MCQView from './MCQView';
import ResultsView from './ResultsView';

function ExamWise({ year: propYear, month: propMonth, onBackToHome, showToast, setLoading }) {
  const [year, setYear] = useState(propYear || null);
  const [month, setMonth] = useState(propMonth || null);
  const [showResults, setShowResults] = useState(false);
  const quizState = useQuizState();

  useEffect(() => {
    if (propYear && propMonth) {
      if (propYear !== year || propMonth !== month) {
        loadExamDate(propYear, propMonth);
      }
    } else if (year && month && quizState.currentMCQs.length === 0) {
      loadExamDate(year, month);
    }
  }, [propYear, propMonth]);

  const loadExamDate = async (selectedYear, selectedMonth) => {
    try {
      setLoading(true);
      setYear(selectedYear);
      setMonth(selectedMonth);
      const data = await fetchMCQsByExam(selectedYear, selectedMonth);
      
      if (!data || data.length === 0) {
        throw new Error(`This Month's MCQs for ${selectedYear} will be updated soon`);
      }

      quizState.handleMCQData(data, `${selectedMonth} ${selectedYear}`, '');
      quizState.setIsMockTest(false);
      showToast(`Loaded ${data.length} MCQs for ${selectedMonth} ${selectedYear}`, 'success');
    } catch (error) {
      console.error('Error loading exam MCQs:', error);
      showToast(error.message || 'Failed to load MCQs', 'error');
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

  if (!year || !month || quizState.currentMCQs.length === 0) {
    return (
      <div className="container my-5">
        <p>Loading exam data...</p>
      </div>
    );
  }

  return (
    <div className="content-section" style={{ display: 'block' }}>
      <MCQView
        mcqs={quizState.currentMCQs}
        currentIndex={quizState.currentIndex}
        userAnswers={quizState.userAnswers}
        onSelectOption={handleSelectOption}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isMockTest={false}
        title={`${month} ${year}`}
      />
    </div>
  );
}

export default ExamWise;

