import React, { useState, useEffect } from 'react';
import { useQuizState } from '../hooks/useQuizState';
import { fetchMCQsBySubject } from '../utils/api';
import MCQView from './MCQView';
import ResultsView from './ResultsView';

function SubjectWise({ subject: propSubject, onBackToHome, showToast, setLoading }) {
  const [subject, setSubject] = useState(propSubject || null);
  const [showResults, setShowResults] = useState(false);
  const quizState = useQuizState();

  useEffect(() => {
    if (propSubject && propSubject !== subject) {
      loadSubject(propSubject);
    } else if (subject && quizState.currentMCQs.length === 0) {
      loadSubject(subject);
    }
  }, [propSubject]);

  const loadSubject = async (selectedSubject) => {
    try {
      setLoading(true);
      setSubject(selectedSubject);
      const data = await fetchMCQsBySubject(selectedSubject);
      
      if (data.error) {
        throw new Error(data.error);
      }

      quizState.handleMCQData(data, '', selectedSubject);
      quizState.setIsMockTest(false);
      showToast(`Loaded ${data.length} ${selectedSubject} MCQs`, 'success');
    } catch (error) {
      console.error('Error loading subject MCQs:', error);
      showToast(error.message || 'Failed to load subject MCQs', 'error');
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

  if (!subject || quizState.currentMCQs.length === 0) {
    return (
      <div className="container my-5">
        <p>Loading subject data...</p>
      </div>
    );
  }

  const sectionTitle = (
    <>
      <span className="highlight">{subject}</span>
      <span className="highlight"> MCQs</span>
    </>
  );

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
        title={sectionTitle}
      />
    </div>
  );
}

export default SubjectWise;

