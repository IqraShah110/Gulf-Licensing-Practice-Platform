import { useState, useEffect } from 'react';

const QUIZ_STATE_KEY = 'quizStateV1';
const QUIZ_TIMER_KEY = 'quizTimerV1';

export function useQuizState() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMCQs, setCurrentMCQs] = useState([]);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [isMockTest, setIsMockTest] = useState(false);

  const resetState = () => {
    setCurrentIndex(0);
    setCurrentMCQs([]);
    setScore(0);
    setAttempted(0);
    setUserAnswers([]);
    setIsMockTest(false);
  };

  const saveQuizState = (contextLabel) => {
    try {
      const payload = {
        context: contextLabel || '',
        currentIndex,
        userAnswers: Array.isArray(userAnswers) ? userAnswers : [],
        score,
        attempted,
        isMockTest,
        currentMCQs: Array.isArray(currentMCQs) ? currentMCQs : [],
        timestamp: Date.now()
      };
      localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(payload));
    } catch (e) {
      // Ignore storage errors
    }
  };

  const loadQuizState = () => {
    try {
      const raw = localStorage.getItem(QUIZ_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.currentMCQs)) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  };

  const clearQuizState = () => {
    try {
      localStorage.removeItem(QUIZ_STATE_KEY);
    } catch (e) {
      // ignore
    }
  };

  const handleMCQData = (data, month = '', subject = '') => {
    setCurrentMCQs(data);
    setCurrentIndex(0);
    const answers = new Array(data.length).fill(null);
    setUserAnswers(answers);
    setScore(0);
    setAttempted(0);
    setIsMockTest(subject === 'Mock Test');
    saveQuizState(subject ? `subject:${subject}` : month ? `month:${month}` : 'direct');
  };

  const selectOption = (selected, correct) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = selected;
    setUserAnswers(newAnswers);
    
    setAttempted(prev => prev + 1);
    if (selected === correct) {
      setScore(prev => prev + 1);
    }
    
    saveQuizState('attempt');
  };

  return {
    currentIndex,
    setCurrentIndex,
    currentMCQs,
    setCurrentMCQs,
    score,
    attempted,
    userAnswers,
    isMockTest,
    setIsMockTest,
    resetState,
    saveQuizState,
    loadQuizState,
    clearQuizState,
    handleMCQData,
    selectOption
  };
}

export function useMockTimer(isMockTest) {
  const [remainingMs, setRemainingMs] = useState(4 * 60 * 60 * 1000); // 4 hours
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!isMockTest) return;

    const loadTimer = () => {
      try {
        const saved = localStorage.getItem(QUIZ_TIMER_KEY);
        if (saved) {
          const timer = JSON.parse(saved);
          if (timer.isMockTest && Number.isFinite(timer.remainingMs)) {
            const now = Date.now();
            if (!timer.paused) {
              const elapsed = Math.max(0, now - (timer.lastTick || now));
              setRemainingMs(Math.max(0, timer.remainingMs - elapsed));
            } else {
              setRemainingMs(timer.remainingMs);
              setPaused(true);
            }
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      setRemainingMs(4 * 60 * 60 * 1000); // 4 hours
      setPaused(false);
    };

    loadTimer();

    const interval = setInterval(() => {
      if (!paused && remainingMs > 0) {
        setRemainingMs(prev => {
          const newRemaining = Math.max(0, prev - 1000);
          try {
            localStorage.setItem(QUIZ_TIMER_KEY, JSON.stringify({
              remainingMs: newRemaining,
              paused: false,
              lastTick: Date.now(),
              isMockTest: true
            }));
          } catch (e) {
            // ignore
          }
          return newRemaining;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMockTest, paused, remainingMs]);

  const formatTime = () => {
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const clearTimer = () => {
    try {
      localStorage.removeItem(QUIZ_TIMER_KEY);
    } catch (e) {
      // ignore
    }
    setRemainingMs(4 * 60 * 60 * 1000); // 4 hours
  };

  return { remainingMs, formatTime, clearTimer, paused, setPaused };
}

