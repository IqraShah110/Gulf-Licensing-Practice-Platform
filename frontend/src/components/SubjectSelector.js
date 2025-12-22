import React, { useState, useRef, useEffect } from 'react';

const subjects = ['Surgery', 'Medicine', 'Gynae', 'Paeds'];

function SubjectSelector({ currentSubject, onSubjectChange, showIcon = true, showSubject = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const handleToggleDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleSubjectClick = (subject) => {
    if (subject !== currentSubject) {
      onSubjectChange(subject);
    }
    setIsOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const subjectName = (
    <span 
      className="highlight subject-name" 
      style={{ 
        display: 'inline',
        color: '#3498db',
        pointerEvents: 'none',
        WebkitTextFillColor: '#3498db',
        WebkitBackgroundClip: 'unset',
        backgroundClip: 'unset',
        background: 'transparent',
        visibility: 'visible',
        opacity: 1,
        fontWeight: 600,
        textDecoration: 'underline'
      }}
    >
      {currentSubject || 'Loading...'}
    </span>
  );

  const dropdownButton = showIcon && (
    <button
      className="subject-selector-btn"
      onClick={handleToggleDropdown}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '2px 4px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: '4px',
        color: '#3498db',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        fontWeight: '600',
        outline: 'none',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        verticalAlign: 'middle'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      aria-label="Change subject"
    >
      <span style={{ fontSize: '0.75em', display: 'inline-block', color: '#3498db', fontWeight: 'bold', lineHeight: '1' }}>▼</span>
    </button>
  );

  return (
    <div
      ref={containerRef}
      className="subject-selector-container"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {showSubject && subjectName}
      {dropdownButton}

      {isOpen && (
        <div
          className="subject-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            minWidth: '185px',
            zIndex: 9999
          }}
        >
          {subjects.map((subject) => (
            <button
              key={subject}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubjectClick(subject);
              }}
              className={subject === currentSubject ? 'subject-dropdown-item active' : 'subject-dropdown-item'}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.95em',
                fontWeight: subject === currentSubject ? '600' : '400',
                transition: 'all 0.2s ease',
                display: 'block',
                background: 'transparent'
              }}
            >
              {subject}
              {subject === currentSubject && (
                <span style={{ marginLeft: '8px', color: '#2563eb' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SubjectSelector;
