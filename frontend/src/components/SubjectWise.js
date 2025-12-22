import React, { useState, useEffect } from 'react';
import { useQuizState } from '../hooks/useQuizState';
import { fetchMCQsBySubject } from '../utils/api';
import MCQView from './MCQView';
import ResultsView from './ResultsView';
import SubjectSelector from './SubjectSelector';

function SubjectWise({ subject: propSubject, onBackToHome, showToast, setLoading, onViewChange }) {
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

  const handleSubjectChange = (newSubject) => {
    if (newSubject !== subject) {
      loadSubject(newSubject);
    }
  };

  const sectionTitle = (
    <>
      <span className="highlight subject-name">
        {subject}
      </span>
      <span className="highlight mcqs-text"> MCQs</span>
      {/* Icon-only selector placed after 'MCQs' */}
      <SubjectSelector 
        currentSubject={subject} 
        onSubjectChange={handleSubjectChange}
        showIcon={true}
        showSubject={false}
      />
    </>
  );

  const switchButton = onViewChange ? (
    <button 
      className="nav-btn switch-btn"
      onClick={() => onViewChange('exam-wise', { openExamSelector: true })}
    >
      Switch to Exam-wise MCQs
    </button>
  ) : null;

  return (
    <div className="content-section active" style={{ display: 'block', opacity: 1 }}>
      <MCQView
        mcqs={quizState.currentMCQs}
        currentIndex={quizState.currentIndex}
        userAnswers={quizState.userAnswers}
        onSelectOption={handleSelectOption}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isMockTest={false}
        title={sectionTitle}
        switchButton={switchButton}
      />
    </div>
  );
}

export default SubjectWise;

