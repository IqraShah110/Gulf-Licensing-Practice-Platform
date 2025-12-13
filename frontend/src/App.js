import React, { useState } from 'react';
import './index.css';
import Home from './components/Home';
import ExamWise from './components/ExamWise';
import SubjectWise from './components/SubjectWise';
import MockTest from './components/MockTest';
import BackToHomeButton from './components/BackToHomeButton';
import ToastContainer from './components/ToastContainer';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [viewParams, setViewParams] = useState({});
  const [showBackButton, setShowBackButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', timeout = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, timeout);
  };

  const showHomePage = () => {
    setCurrentView('home');
    setShowBackButton(false);
    setViewParams({});
  };

  const handleViewChange = (view, params = {}) => {
    setCurrentView(view);
    setViewParams(params);
    setShowBackButton(view !== 'home');
  };

  return (
    <div className="w-100">
      <LoadingSpinner loading={loading} />
      <ToastContainer toasts={toasts} />
      
      {currentView === 'home' && (
        <Home 
          onViewChange={handleViewChange}
          showToast={showToast}
          setLoading={setLoading}
        />
      )}
      
      {currentView === 'exam-wise' && (
        <ExamWise 
          year={viewParams.year}
          month={viewParams.month}
          onBackToHome={showHomePage}
          showToast={showToast}
          setLoading={setLoading}
        />
      )}
      
      {currentView === 'subject-wise' && (
        <SubjectWise 
          subject={viewParams.subject}
          onBackToHome={showHomePage}
          showToast={showToast}
          setLoading={setLoading}
        />
      )}
      
      {currentView === 'mock-test' && (
        <MockTest 
          onBackToHome={showHomePage}
          showToast={showToast}
          setLoading={setLoading}
        />
      )}
      
      {showBackButton && (
        <BackToHomeButton onClick={showHomePage} />
      )}
    </div>
  );
}

export default App;

