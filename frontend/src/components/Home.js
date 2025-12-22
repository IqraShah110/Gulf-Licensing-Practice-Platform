import React, { useState } from 'react';
import ExamWiseModal from './modals/ExamWiseModal';
import SubjectWiseModal from './modals/SubjectWiseModal';
import MockTestModal from './modals/MockTestModal';

function Home({ onViewChange, showToast, setLoading }) {
  const [showExamModal, setShowExamModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);

  const handleExamWiseClick = () => {
    setShowExamModal(true);
  };

  const handleSubjectWiseClick = () => {
    setShowSubjectModal(true);
  };

  const handleMockTestClick = () => {
    setShowMockModal(true);
  };

  const handleExamMonthSelect = ({ year, month }) => {
    setShowExamModal(false);
    onViewChange('exam-wise', { year, month });
  };

  const handleSubjectSelect = (subject) => {
    setShowSubjectModal(false);
    onViewChange('subject-wise', { subject });
  };

  const handleMockTestStart = () => {
    setShowMockModal(false);
    onViewChange('mock-test');
  };

  return (
    <div id="main-content" className="w-100">
      {/* Hero Section */}
      <section className="hero-section py-4 position-relative overflow-hidden">
        <div className="hero-bg"></div>
        <div className="container text-center text-white position-relative">
          <div className="hero-content">
            <h1 className="hero-title fw-bold mb-3 animate-fade-in">GulfCertify</h1>
            <p className="hero-subtitle mb-0 animate-fade-in-delay">
              Practice exam-wise, subject-wise, or take a quick mock test. Clean UI, focused learning.
            </p>
            <div className="hero-stats mt-4 animate-fade-in-delay-2">
              <div className="row justify-content-center">
                <div className="col-auto">
                  <div className="stat-item">
                    <span className="stat-emoji" aria-hidden="true">📘</span>
                    <span className="stat-number">5000+</span>
                    <span className="stat-label">MCQs</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-item">
                    <span className="stat-emoji" aria-hidden="true">📚</span>
                    <span className="stat-number">4</span>
                    <span className="stat-label">Subjects</span>
                  </div>
                </div>
                <div className="col-auto">
                  <div className="stat-item">
                    <span className="stat-emoji" aria-hidden="true">💯</span>
                    <span className="stat-number">100%</span>
                    <span className="stat-label">Free</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div className="container my-5" id="main-nav">
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div 
              className="feature-card card h-100 shadow-sm border-0 nav-card animate-slide-up" 
              onClick={handleExamWiseClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body d-flex flex-column">
                <div className="feature-icon mb-3">
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <h5 className="card-title mb-0">Exam-wise MCQs</h5>
                <p className="card-text text-muted mb-4">
                  Practice MCQs from previous Gulf Licensing exams with detailed explanations on GulfCertify.
                </p>
                <div className="mt-auto">
                  <button className="btn btn-primary btn-hover-effect">
                    <span>Start Practice</span>
                    <i className="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div 
              className="feature-card card h-100 shadow-sm border-0 nav-card animate-slide-up-delay" 
              onClick={handleSubjectWiseClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body d-flex flex-column">
                <div className="feature-icon mb-3">
                  <i className="fas fa-book-medical"></i>
                </div>
                <h5 className="card-title">Subject-wise MCQs</h5>
                <p className="card-text text-muted mb-4">
                  Focus on specific subjects: Medicine, Gynae, Surgery, or Paeds.
                </p>
                <div className="mt-auto">
                  <button className="btn btn-primary btn-hover-effect">
                    <span>Choose Subject</span>
                    <i className="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div 
              className="feature-card card h-100 shadow-sm border-0 nav-card animate-slide-up-delay-2" 
              onClick={handleMockTestClick}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-body d-flex flex-column">
                <div className="feature-icon mb-3">
                  <i className="fas fa-clipboard-check"></i>
                </div>
                <h5 className="card-title">Mock Test</h5>
                <p className="card-text text-muted mb-4">
                  Generate a random mixed test for comprehensive practice.
                </p>
                <div className="mt-auto">
                  <button className="btn btn-primary btn-hover-effect">
                    <span>Start Mock Test</span>
                    <i className="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ExamWiseModal 
        show={showExamModal} 
        onClose={() => setShowExamModal(false)}
        onSelect={handleExamMonthSelect}
      />
      <SubjectWiseModal 
        show={showSubjectModal} 
        onClose={() => setShowSubjectModal(false)}
        onSelect={handleSubjectSelect}
      />
      <MockTestModal 
        show={showMockModal} 
        onClose={() => setShowMockModal(false)}
        onStart={handleMockTestStart}
      />
    </div>
  );
}

export default Home;

