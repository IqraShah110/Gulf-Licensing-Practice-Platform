import React, { useState, useEffect } from 'react';
import './index.css';
import Home from './components/Home';
import ExamWise from './components/ExamWise';
import SubjectWise from './components/SubjectWise';
import MockTest from './components/MockTest';
import ToastContainer from './components/ToastContainer';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [viewParams, setViewParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Initialize browser history on mount
  useEffect(() => {
    // Push initial state to history
    window.history.pushState({ view: 'home', params: {} }, '', window.location.pathname);
    
    // Handle browser back/forward buttons
    const handlePopState = (event) => {
      if (event.state) {
        setCurrentView(event.state.view || 'home');
        setViewParams(event.state.params || {});
      } else {
        // If no state, go to home
        setCurrentView('home');
        setViewParams({});
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const showToast = (message, type = 'info', timeout = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, timeout);
  };

  const showHomePage = () => {
    setCurrentView('home');
    setViewParams({});
    // Update browser history without page reload
    window.history.pushState({ view: 'home', params: {} }, '', window.location.pathname);
  };

  const handleViewChange = (view, params = {}) => {
    setCurrentView(view);
    setViewParams(params);
    // Update browser history without page reload
    window.history.pushState({ view, params }, '', window.location.pathname);
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
          openExamSelector={viewParams.openExamSelector}
          onBackToHome={showHomePage}
          showToast={showToast}
          setLoading={setLoading}
          onViewChange={handleViewChange}
        />
      )}
      
      {currentView === 'subject-wise' && (
        <SubjectWise 
          subject={viewParams.subject}
          onBackToHome={showHomePage}
          showToast={showToast}
          setLoading={setLoading}
          onViewChange={handleViewChange}
        />
      )}
      
      {currentView === 'mock-test' && (
        <MockTest 
          onBackToHome={showHomePage}
          showToast={showToast}
          setLoading={setLoading}
        />
      )}
      
    </div>
  );
}

export default App;

