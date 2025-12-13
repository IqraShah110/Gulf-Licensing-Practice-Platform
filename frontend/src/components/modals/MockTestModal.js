import React from 'react';

function MockTestModal({ show, onClose, onStart }) {
  if (!show) return null;

  return (
    <>
      <div 
        className="modal-overlay show" 
        onClick={onClose}
        style={{ display: 'block' }}
      ></div>
      <div id="mock-test-modal" className="selection-modal show" style={{ display: 'block' }}>
        <div className="modal-header">
          <h2>MOCK TEST DETAILS</h2>
          <button className="close-modal-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-content">
          <div style={{textAlign: 'left'}}>
            <div style={{
              marginBottom: '14px',
              color: '#1f2937',
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: '8px 12px',
              alignItems: 'center'
            }}>
              <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span aria-hidden="true">📘</span><span>Title</span>
              </div>
              <div>GulfCertify Mock Test – GP</div>
              <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span aria-hidden="true">🧮</span><span>Total Questions</span>
              </div>
              <div>200</div>
              <div style={{fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span aria-hidden="true">⏱️</span><span>Duration</span>
              </div>
              <div>4 Hours</div>
            </div>
            <hr style={{border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0'}} />
            <div style={{
              marginTop: '16px',
              marginBottom: '8px',
              fontWeight: 700,
              color: '#1565c0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span aria-hidden="true">📚</span>
              <span>SUBJECT-WISE DISTRIBUTION</span>
            </div>
            <ul style={{margin: 0, paddingLeft: 0, color: '#374151', listStyle: 'none'}}>
              <li style={{display: 'grid', gridTemplateColumns: '180px auto', gap: '0 12px', alignItems: 'center'}}>
                <strong>Medicine</strong>
                <span>70 Questions</span>
              </li>
              <li style={{display: 'grid', gridTemplateColumns: '180px auto', gap: '0 12px', alignItems: 'center'}}>
                <strong>Pediatrics</strong>
                <span>50 Questions</span>
              </li>
              <li style={{display: 'grid', gridTemplateColumns: '180px auto', gap: '0 12px', alignItems: 'center'}}>
                <strong>Obstetrics & Gynecology</strong>
                <span>40 Questions</span>
              </li>
              <li style={{display: 'grid', gridTemplateColumns: '180px auto', gap: '0 12px', alignItems: 'center'}}>
                <strong>General Surgery</strong>
                <span>30 Questions</span>
              </li>
            </ul>
          </div>
          <button 
            className="btn mock-start-btn" 
            onClick={onStart}
            style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none',
              color: 'white',
              padding: '12px 20px',
              borderRadius: '10px',
              boxShadow: '0 8px 20px rgba(37,99,235,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 600,
              marginTop: '16px'
            }}
          >
            <span aria-hidden="true">▶</span>
            <span>Start Mock Test</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default MockTestModal;

