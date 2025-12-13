import React from 'react';

function ToastContainer({ toasts }) {
  return (
    <div id="toast-container" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {toasts.map(toast => {
        const bg = toast.type === 'error' ? '#fdecea' : toast.type === 'success' ? '#e8f5e9' : '#e3f2fd';
        const border = toast.type === 'error' ? '#f5c6cb' : toast.type === 'success' ? '#c8e6c9' : '#bbdefb';
        const color = toast.type === 'error' ? '#c0392b' : toast.type === 'success' ? '#2e7d32' : '#1565c0';
        
        return (
          <div
            key={toast.id}
            style={{
              background: bg,
              border: `1px solid ${border}`,
              color: color,
              padding: '10px 14px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              minWidth: '220px'
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;

