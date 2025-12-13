import React from 'react';

function LoadingSpinner({ loading }) {
  if (!loading) return null;

  return (
    <div 
      id="global-spinner"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.6)',
        zIndex: 1500
      }}
    >
      <div style={{
        width: '56px',
        height: '56px',
        border: '6px solid #e3eaf3',
        borderTopColor: '#1565c0',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}></div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LoadingSpinner;

