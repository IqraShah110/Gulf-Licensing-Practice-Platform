// Question formatting function for better readability
function formatQuestionText(text) {
  if (!text) return '';
  
  // Clean up common punctuation issues
  let formatted = text
    .replace(/,\s*,/g, ',') // Remove double commas
    .replace(/\s+/g, ' ') // Remove extra spaces
    .replace(/\s*,\s*/g, ', ') // Standardize comma spacing
    .replace(/\s*\.\s*/g, '. ') // Standardize period spacing
    .replace(/\s*\?\s*/g, '? ') // Standardize question mark spacing
    .replace(/\s*:\s*/g, ': ') // Standardize colon spacing
    .replace(/\s*;\s*/g, '; ') // Standardize semicolon spacing
    .trim();
  
  // Add line breaks for better readability
  formatted = formatted
    .replace(/(\d+\.\s)/g, '\n$1') // Line break before numbered items
    .replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2') // Line break after sentences
    .replace(/(\w+:\s)/g, '\n$1') // Line break before colons
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim();
  
  return formatted;
}

// Escape HTML to prevent unintended parsing and keep original line breaks intact
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Global variables
let currentIndex = 0;
let currentMCQs = [];
let score = 0;
let attempted = 0;
let validQuestions = 0;
let userAnswers = [];
// Flag to track Mock Test mode (hide explanations)
let isMockTest = false;

// Persistent state keys
const QUIZ_STATE_KEY = "quizStateV1";
const QUIZ_TIMER_KEY = "quizTimerV1"; // stores { remainingMs, paused, lastTick, isMockTest }

let mockTimerInterval = null;

// Page-lifecycle boot id (resets on full reload). Stored in sessionStorage only
function getBootId() {
  try {
    let id = sessionStorage.getItem('PAGE_BOOT_ID');
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem('PAGE_BOOT_ID', id);
    }
    return id;
  } catch {
    return 'no-session';
  }
}

// Persist and restore helpers
function getSerializableQuizState(contextLabel) {
  try {
    return {
      context: contextLabel || "",
      currentIndex: currentIndex,
      userAnswers: Array.isArray(userAnswers) ? userAnswers : [],
      score: score,
      attempted: attempted,
      isMockTest: isMockTest,
      currentMCQs: Array.isArray(currentMCQs) ? currentMCQs : [],
      navigation: currentNavigationState,
      timestamp: Date.now()
    };
  } catch (e) {
    return null;
  }
}

function saveQuizState(contextLabel) {
  try {
    const payload = getSerializableQuizState(contextLabel);
    if (!payload) return;
    localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(payload));
  } catch (e) {
    // Ignore storage errors (quota/private mode)
  }
}

function loadQuizState() {
  try {
    const raw = localStorage.getItem(QUIZ_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.currentMCQs)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function clearQuizState() {
  try {
    localStorage.removeItem(QUIZ_STATE_KEY);
  } catch (e) {
    // ignore
  }
}

function clearQuizTimer() {
  try {
    localStorage.removeItem(QUIZ_TIMER_KEY);
  } catch (e) {
    // ignore
  }
}

function isPageReload() {
  try {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
    if (nav && nav.length) {
      return nav[0].type === 'reload';
    }
    // Fallback (deprecated API)
    // 1 === TYPE_RELOAD
    if (performance.navigation) {
      return performance.navigation.type === 1;
    }
  } catch {}
  return false;
}

// Home button visibility helpers
function hideNavigationHomeButton() {
  const backButton = document.getElementById("back-to-home-btn");
  if (backButton) {
    backButton.style.display = "none";
    backButton.style.visibility = "hidden";
    backButton.style.opacity = "0";
  }
}
function showNavigationHomeButton() {
  const backButton = document.getElementById("back-to-home-btn");
  if (backButton) {
    backButton.style.display = "block";
    backButton.style.visibility = "visible";
    backButton.style.opacity = "1";
  }
}

// Add event listener for Enter key
document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    // Only trigger next question if the Next Question button is displayed
    const nextButton = document.querySelector(".next-btn");
    if (nextButton && nextButton.style.display === "block") {
      nextQuestion();
    }
  }
});

// Navigation functions
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".content-section").forEach((section) => {
    section.style.display = "none";
  });
  // Show selected section
  if (sectionId) {
    const section = document.getElementById(sectionId);
    section.style.display = "block";
    section.style.opacity = "0";

    // Add fade-in effect
    setTimeout(() => {
      section.style.opacity = "1";
      section.style.transition = "opacity 0.3s ease";
    }, 50);
  }
}

function resetState() {
  currentIndex = 0;
  currentMCQs = [];
  score = 0;
  attempted = 0;
  validQuestions = 0;
  userAnswers = [];
}

function showMonthGrid() {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  document.getElementById("exam-wise").innerHTML = `
        <h2>Select Exam Month</h2>
        <div class="month-grid">
            ${months
              .map(
                (month) => `
                <button class="month-btn ${month === "March" ? "has-mcqs" : ""}"
                    onclick="loadExamDate('${month}')">
                    ${month}
                    ${
                      month === "March"
                        ? '<span class="mcq-badge">Available</span>'
                        : ""
                    }
                </button>
            `
              )
              .join("")}
        </div>
    `;
}

// Selection Modal Functions
function showSelectionModal(type) {
  const modalId = `${type}-modal`;
  const modal = document.getElementById(modalId);
  // Ensure overlay exists even on home page
  let overlay = document.getElementById("modal-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "modal-overlay";
    overlay.className = "modal-overlay";
    document.body.appendChild(overlay);
  }

  if (!modal) return;

  // Show modal and overlay
  modal.style.display = "block";
  overlay.style.display = "block";

  // Add show class after a small delay for animation
  setTimeout(() => {
    modal.classList.add("show");
    overlay.classList.add("show");
  }, 50);

  // Add click handler to close modal when clicking overlay
  overlay.onclick = () => hideSelectionModal(modalId);
}

function hideSelectionModal(modalId) {
  const modal = document.getElementById(modalId);
  const overlay = document.getElementById("modal-overlay");

  if (modal) modal.classList.remove("show");
  if (overlay) overlay.classList.remove("show");

  // Hide modal and overlay after animation
  setTimeout(() => {
    if (modal) modal.style.display = "none";
    if (overlay) overlay.style.display = "none";
  }, 300);
}

// MCQ Loading functions
// Simple navigation state tracking
let navigationStack = [];
let currentNavigationState = null;

// Add navigation state to stack
function pushNavigationState(section, month, subject, questionIndex) {
  const state = {
    section: section,
    month: month,
    subject: subject,
    questionIndex: questionIndex,
    timestamp: Date.now()
  };
  
  // Store current state
  currentNavigationState = state;
  
  // Add to stack for history
  navigationStack.push(state);
  
  // Keep only last 10 navigation states to prevent memory issues
  if (navigationStack.length > 10) {
    navigationStack.shift();
  }
  
  console.log('Navigation stack:', navigationStack);
}

// Get previous navigation state without removing current
function getPreviousNavigationState() {
  if (navigationStack.length > 1) {
    return navigationStack[navigationStack.length - 2];
  }
  return null;
}

// Show home page
function showHomePage() {
  // Hide all sections
  document.getElementById("exam-wise").style.display = "none";
  document.getElementById("subject-wise").style.display = "none";
  
  // Show main navigation
  const mainNav = document.getElementById("main-nav");
  if (mainNav) {
    mainNav.style.display = "block";
  }
  
  // Show hero section and other home elements
  const heroSection = document.querySelector(".hero-section");
  if (heroSection) {
    heroSection.style.display = "block";
  }
  
  // Show elements with mb-0 class
  document.querySelectorAll(".mb-0").forEach((element) => {
    element.style.display = "block";
  });
  
  // Hide navigation Home button on the landing page
  hideNavigationHomeButton();
  
  // Reset state
  currentMCQs = [];
  currentIndex = 0;
  userAnswers = [];
  
  // Clear navigation stack
  navigationStack = [];
  
  // Update history to home page
  history.pushState({ page: 'home' }, '', '/');
  
  console.log('Returned to home page');

  // Pause mock timer if active (user navigated away)
  try {
    const timer = getSavedTimer();
    if (timer) {
      // Deduct elapsed time since last tick and then pause
      const now = Date.now();
      const elapsed = Math.max(0, now - (timer.lastTick || now));
      timer.remainingMs = Math.max(0, (timer.remainingMs || 0) - elapsed);
      timer.paused = true;
      timer.lastTick = now;
      localStorage.setItem(QUIZ_TIMER_KEY, JSON.stringify(timer));
      // Mark that resuming within this session is allowed
      try { sessionStorage.setItem('ALLOW_MOCK_RESUME', '1'); } catch {}
    }
  } catch {}
}

// Enhanced loadExamDate function
async function loadExamDate(month) {
  hideSelectionModal("exam-wise-modal");
  updateActiveButton("month-btn", month);
  resetState();

  try {
    setLoading(true);
    const response = await fetch(`/get_mcqs/exam/${month}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    if (!data || data.error || data.length === 0) {
      throw new Error(
        data?.error || "MCQs Not Available for now"
      );
    }

    isMockTest = false;
    handleMCQData(data, month);
    showSection("exam-wise");
    addBackToHomeButton(); // Ensure button is shown
    hideNavigationHomeButton(); // Hide navigation Home button
    showToast(`Loaded ${data.length} MCQs for ${month}`, "success");
    
    // Add to navigation stack and update history
    pushNavigationState('exam-wise', month, null, 0);
    history.pushState({ page: 'exam', month: month }, '', '/exam');
  } catch (error) {
    console.error("Error loading exam MCQs:", error);
    showErrorMessage(error);
    showToast(error.message || "Failed to load MCQs", "error");
  } finally {
    setLoading(false);
  }
}

async function loadSubject(subject) {
  hideSelectionModal("subject-wise-modal");
  updateActiveButton("subject-btn", subject);
  resetState();

  try {
    setLoading(true);
    const response = await fetch(`/get_mcqs/${subject}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    isMockTest = false;
    handleMCQData(data, "", subject);
    showSection("subject-wise");
    addBackToHomeButton(); // Ensure button is shown
    hideNavigationHomeButton(); // Hide navigation Home button
    showToast(`Loaded ${data.length} ${subject} MCQs`, "success");
    
    // Add to navigation stack and update history
    pushNavigationState('subject-wise', null, subject, 0);
    history.pushState({ page: 'subject', subject: subject }, '', '/subject');
  } catch (error) {
    showErrorMessage(error);
    showToast(error.message || "Failed to load subject MCQs", "error");
  } finally {
    setLoading(false);
  }
}

async function startMockTest() {
  hideSelectionModal("mock-test-modal");
  hideMainNavigation();
  resetState();
  try {
    setLoading(true);
    // Resume is only allowed for in-session navigation, not on full reload
    const allowResume = (() => { try { return sessionStorage.getItem('ALLOW_MOCK_RESUME') === '1'; } catch { return false; } })();
    const saved = loadQuizState();
    const savedTimer = getSavedTimer();
    if (allowResume && saved && saved.currentMCQs && saved.currentMCQs.length && saved.isMockTest) {
      currentMCQs = saved.currentMCQs;
      currentIndex = Math.min(Math.max(0, saved.currentIndex || 0), saved.currentMCQs.length - 1);
      userAnswers = Array.isArray(saved.userAnswers) ? saved.userAnswers : new Array(saved.currentMCQs.length).fill(null);
      score = Number.isFinite(saved.score) ? saved.score : 0;
      attempted = Number.isFinite(saved.attempted) ? saved.attempted : 0;
      isMockTest = true;
      setupQuestionInterface('', 'Mock Test');
      showSection('subject-wise');
      hideNavigationHomeButton();
      createExplanationModal();
      updateStats();
      showQuestion(userAnswers[currentIndex] !== null);
      // Resume timer from saved remaining
      startOrResumeMockTimer(20);
      showToast("Resumed mock test", "success");
    } else {
      // Ensure any stale state is cleared so test starts fresh
      clearQuizState();
      clearQuizTimer();
    const response = await fetch("/get_mcqs/mock_test");
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    isMockTest = true;
    handleMCQData(data, "", "Mock Test");
    showSection("subject-wise");
    hideNavigationHomeButton(); // Hide navigation Home button
      startOrResumeMockTimer(20); // start 20-minute timer
    showToast("Mock test ready", "success");
    }
  } catch (error) {
    showErrorMessage(error);
    showToast(error.message || "Failed to start mock test", "error");
  } finally {
    setLoading(false);
  }
}

function handleMCQData(data, month = "", subject = "") {
  console.log("Received MCQ data:", data);
  currentMCQs = data;
  validQuestions = currentMCQs.filter((q) => q.correct_answer).length;
  currentIndex = 0;
  userAnswers = new Array(currentMCQs.length).fill(null);

  // Debug: Check explanation data in first few questions
  console.log("Checking explanation data in first 3 questions:");
  for (let i = 0; i < Math.min(3, currentMCQs.length); i++) {
    const q = currentMCQs[i];
    console.log(`Question ${i + 1}:`, {
      id: q.id,
      question_number: q.question_number,
      explanation: q.explanation,
      explanation_type: typeof q.explanation,
      explanation_length: q.explanation ? q.explanation.length : 0
    });
  }

  setupQuestionInterface(month, subject);
  createExplanationModal();
  addBackToHomeButton();
  updateStats();
  showQuestion();

  // Persist after initial render
  saveQuizState(subject ? `subject:${subject}` : month ? `month:${month}` : "direct");
}

function createExplanationModal() {
  // Remove existing modal if it exists
  const existingOverlay = document.getElementById("modal-overlay");
  const existingCard = document.getElementById("solution-card");
  
  if (existingOverlay) existingOverlay.remove();
  if (existingCard) existingCard.remove();
  
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.id = "modal-overlay";
  overlay.className = "modal-overlay";
  
  // Create solution card
  const card = document.createElement("div");
  card.id = "solution-card";
  card.className = "solution-card";
  
  card.innerHTML = `
    <div class="solution-header">
      <h3>Detailed Explanation</h3>
      <button class="close-explanation-btn" onclick="toggleExplanation()">&times;</button>
    </div>
    <div id="explanation-content" class="solution-content">
      <!-- Explanation will be inserted here -->
    </div>
  `;
  
  // Add to body
  document.body.appendChild(overlay);
  document.body.appendChild(card);
  
  // Add click event to overlay to close modal
  overlay.addEventListener('click', toggleExplanation);
  
  console.log("Explanation modal created and added to body");
}

function addBackToHomeButton() {
  // Show the existing back button
  const backButton = document.getElementById("back-to-home-btn");
  if (backButton) {
    backButton.style.display = "block";
    backButton.style.visibility = "visible";
    backButton.style.opacity = "1";
    console.log("Back to home button shown");
    console.log("Button styles:", {
      display: backButton.style.display,
      visibility: backButton.style.visibility,
      opacity: backButton.style.opacity,
      position: window.getComputedStyle(backButton).position,
      zIndex: window.getComputedStyle(backButton).zIndex
    });
  } else {
    console.log("Back to home button not found in DOM");
  }
}

function setupQuestionInterface(month = "", subject = "") {
  const examWiseSection = document.getElementById("exam-wise");
  const subjectWiseSection = document.getElementById("subject-wise");

  // Fallback helper for pages that don't have selection modals (template pages)
  function safeSwitch(type) {
    if (typeof showSelectionModal === 'function') {
      showSelectionModal(type);
    } else {
      // Navigate to home where selection is available
      window.location.href = '/';
    }
  }

  if (month) {
    // Setup exam-wise interface
    const target = examWiseSection || document.querySelector('.content-section');
    if (!target) return;
    const switchBtnHTML = isMockTest ? '' : `
                        <button onclick="(${safeSwitch.toString()})(\'subject-wise\')" class="nav-btn switch-btn">
                            Switch to Subject-wise MCQs
                        </button>`;
    target.innerHTML = `
            <div class="main-content-container">
                <div class="header-container">
                    <h2 class="section-title">Exam: ${month} 2025</h2>
                    <div class="nav-center">
                        ${switchBtnHTML}
                    </div>
                    ${isMockTest ? `<span id="timer" style="margin-left:auto;font-weight:800;color:#374151">--:--</span>` : ''}
                </div>
                <div class="stats-bar">
                    <span id="progress">Question 0/${currentMCQs.length}</span>
                </div>
                <div id="question-box" class="mcq-container" style="margin: 0px;">
                    <p>Loading question...</p>
                </div>
            </div>
        `;
    if (examWiseSection && subjectWiseSection) {
      examWiseSection.style.display = "block";
      subjectWiseSection.style.display = "none";
    }
  } else {
    // Setup subject-wise interface
    let sectionTitle =
      subject === "Mock Test"
        ? `<span class="highlight">Gulf Licensing Mock Test – GP</span>`
        : `<span class="highlight">${subject}</span> <span class="highlight">MCQs</span>`;
    const target = subjectWiseSection || document.querySelector('.content-section');
    if (!target) return;
    const switchBtnHTML = isMockTest ? '' : `
                        <button onclick="(${safeSwitch.toString()})(\'exam-wise\')" class="nav-btn switch-btn">
                            Switch to Exam-wise MCQs
                        </button>`;
    target.innerHTML = `
            <div class="main-content-container">
                <div class="header-container">
                    <h2 class="section-title">${sectionTitle}</h2>
                    <div class="nav-center">
                        ${switchBtnHTML}
                    </div>
                    ${isMockTest ? `<span id="timer" style="margin-left:auto;font-weight:800;color:#374151">--:--</span>` : ''}
                </div>
                <div class="stats-bar">
                    <span id="progress">Question 0/${currentMCQs.length}</span>
                </div>
                <div id="question-box" class="mcq-container" style="margin: 0px;">
                    <p>Loading question...</p>
                </div>
            </div>
        `;
    if (examWiseSection && subjectWiseSection) {
      examWiseSection.style.display = "none";
      subjectWiseSection.style.display = "block";
    }
  }
  updateStats();
}

function getQuestionInterfaceHTML() {
  return `
        <div class="stats-bar">
            <span id="progress">Question 0/0</span>
            <span id="score">Score: 0/0</span>
        </div>
        <div id="question-box" class="mcq-container">
            <p>Loading question...</p>
        </div>
        <div id="modal-overlay" class="modal-overlay"></div>
        <div id="solution-card" class="solution-card">
            <div class="solution-header">
                <h3>Detailed Explanation</h3>
                <button class="close-explanation-btn" onclick="toggleExplanation()">&times;</button>
            </div>
            <div id="explanation-content" class="solution-content">
                <!-- Explanation will be inserted here -->
            </div>
        </div>
    `;
}

// Question display and interaction functions
function showQuestion(isReview = false) {
  const q = currentMCQs[currentIndex];
  if (!q) {
    console.log("No question found at index:", currentIndex);
    return;
  }
  console.log("Displaying question:", q);

  const activeSection = document.querySelector(
    ".content-section[style*='display: block']"
  );
  const container = activeSection.querySelector("#question-box");
  container.style.display = "block";

  // Handle both old and new data structures
  const questionText = q.question_text || q.question || "";
  const options = q.options || {
    A: q.option_a,
    B: q.option_b,
    C: q.option_c,
    D: q.option_d,
  };

  const hasCorrectAnswer = q.correct_answer && q.correct_answer.trim() !== "";
  const userAnswer = userAnswers[currentIndex];

  const reviewHTML =
    isReview && userAnswer
      ? `<div class="review-mode">Review Mode - Your previous answer: ${userAnswer}</div>`
      : "";

  container.innerHTML = `
        ${reviewHTML}
        <div class="question-box clean-white">
          <h6 class="question-title larger-stem"><span>${escapeHtml(questionText)}</span></h6>
        </div>
        <div class="options-container even-options">
            ${Object.entries(options)
              .map(([key, value]) => {
                if (!value) return "";
                let optionClass = "option";
                if (userAnswer) {
                  if (key === userAnswer) {
                    optionClass +=
                      userAnswer === q.correct_answer
                        ? " correct"
                        : " incorrect";
                  }
                  if (key === q.correct_answer) {
                    optionClass += " correct";
                  }
                }
                if (!hasCorrectAnswer) {
                  optionClass += " disabled";
                }
                const clickable = !isReview && hasCorrectAnswer
        ? `selectOption(this, '${key}', '${q.correct_answer}')`
                  : "";
                return `<div class="${optionClass} ${isReview ? "disabled" : ""}" onclick="${clickable}">
                  <input type="radio" name="mcq-${currentIndex}" ${userAnswer===key?"checked":""} ${(!hasCorrectAnswer||isReview)?"disabled":""} />
                  <span class="option-text">${key}) ${value}</span>
</div>`;
              })
              .join("")}
        </div>
        ${
          !hasCorrectAnswer
            ? `
            <div class="warning">
                Note: This question's correct answer is not available in the database.
                Please proceed to the next question.
            </div>
        `
            : ""
        }
        <div id="explanation-btn-slot"></div>
        ${getNavigationHTML()}
    `;

  // If no correct answer, show next button immediately
  if (!hasCorrectAnswer) {
    const nextButton = container.querySelector(".next-btn");
    if (nextButton) {
      nextButton.style.display = "block";
    }
  }

  activeSection.querySelector(".stats-bar").style.display = "block";
  
  // Render the explanation button into the slot for this question
  renderExplanationButton();
  
  resetExplanationState();

  updateStats();
}

function getOptionsHTML(q, isReview, userAnswer, hasCorrectAnswer) {
  return Object.entries(q.options)
    .map(([key, value]) => {
      if (!value) return "";

      let buttonClass = "option-btn";
      if (isReview && userAnswer) {
        if (key === userAnswer) {
          buttonClass +=
            userAnswer === q.correct_answer ? " correct" : " incorrect";
        } else if (key === q.correct_answer) {
          buttonClass += " correct";
        }
        buttonClass += " disabled";
      }

      return `<button class="${buttonClass}" 
                    onclick="${
                      !isReview && hasCorrectAnswer
                        ? `selectOption(this, '${key}', '${q.correct_answer}')`
                        : ""
                    }"
                    ${isReview || !hasCorrectAnswer ? "disabled" : ""}>
                    ${key}) ${value}
                </button>`;
    })
    .join("");
}

function getWarningHTML(hasCorrectAnswer) {
  return !hasCorrectAnswer
    ? `
        <div class="warning">
            Note: This question's correct answer is not available in the database.
            Please skip to the next question.
        </div>
    `
    : "";
}

function getNavigationHTML() {
  return `
        <div class="nav-buttons">
            <button class="prev-btn" onclick="previousQuestion()" 
                ${currentIndex === 0 ? "disabled" : ""} style="display: ${currentIndex === 0 ? "none" : "block"}">
                ← Previous Question
            </button>
            <button class="next-btn" onclick="nextQuestion()" style="display: ${
              userAnswers[currentIndex] !== null ? "block" : "none"
            }">
                ${
                  currentIndex === currentMCQs.length - 1
                    ? "Show Results"
                    : "Next Question"
                } →
            </button>
        </div>
    `;
}

function selectOption(element, selected, correct) {
  const container = element.closest(".options-container");
  const options = container.querySelectorAll(".option");

  // Disable all options
  options.forEach((option) => {
    option.style.pointerEvents = "none";
  });

  // Mark user's selection
  element.classList.add(selected === correct ? "correct" : "incorrect");

  // If answer is incorrect, highlight the correct answer
  if (selected !== correct) {
    options.forEach((option) => {
      const optionKey = option.textContent.split(")")[0].trim();
      if (optionKey === correct) {
        option.classList.add("correct");
      }
    });
  }

  // Update score and user answers
  attempted++;
  userAnswers[currentIndex] = selected;
  if (selected === correct) {
    score++;
  }

  // Show the next button after selection
  const nextButton = container
    .closest("#question-box")
    .querySelector(".next-btn");
  if (nextButton) {
    nextButton.style.display = "block";
  }

  updateStats();

  // Show explanation button if explanation exists
  const currentMCQ = currentMCQs[currentIndex];
  if (currentMCQ.explanation) {
    showExplanationButton();
  }

  // Persist after user attempts a question
  saveQuizState('attempt');
}

// Navigation and Review functions
function previousQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    showQuestion(true);
    
    // Update navigation stack
    const currentState = navigationStack[navigationStack.length - 1];
    if (currentState) {
      pushNavigationState(currentState.section, currentState.month, currentState.subject, currentIndex);
    }

    // Persist navigation change
    saveQuizState('prev');
  }
}

function nextQuestion() {
  if (currentIndex < currentMCQs.length - 1) {
    currentIndex++;
    showQuestion(userAnswers[currentIndex] !== null);
    
    // Update navigation stack
    const currentState = navigationStack[navigationStack.length - 1];
    if (currentState) {
      pushNavigationState(currentState.section, currentState.month, currentState.subject, currentIndex);
    }
    // Persist navigation change
    saveQuizState('next');
  } else {
    showFinalResults();
  }
}

function showFinalResults() {
  const totalAnswered = userAnswers.filter((answer) => answer !== null).length;
  const correctAnswers = userAnswers.reduce((count, answer, index) => {
    return count + (answer === currentMCQs[index].correct_answer ? 1 : 0);
  }, 0);

  const percentage = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
  const container = document.querySelector(
    ".content-section[style*='display: block']"
  );
  const questionBox = container.querySelector("#question-box");

  // Hide stats score when showing results (requested)
  try {
    const statsBar = container.querySelector('.stats-bar');
    const scoreStat = container.querySelector('#score');
    if (statsBar) statsBar.style.display = 'none';
    if (scoreStat) scoreStat.style.display = 'none';
  } catch {}

  if (isMockTest) {
    // Simple result card for Mock Test
    const percent = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    const timer = getSavedTimer();
    const totalMs = 20 * 60 * 1000;
    const remainingMs = timer && Number.isFinite(timer.remainingMs) ? timer.remainingMs : totalMs;
    const takenMin = Math.max(0, Math.round((totalMs - remainingMs) / 60000));

    questionBox.innerHTML = `
      <div class="mock-result-card" style="max-width:min(520px, 92vw);margin:0 auto;padding:clamp(16px,2.5vw,24px);background:#fff;border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,0.08);text-align:center;">
        <div class="mock-result-title" style="font-weight:700;color:#1f2937;margin-bottom:10px;font-size:clamp(16px,2vw,18px);">Test Result</div>
        <div class="mock-result-label" style="color:#1f2937;margin-bottom:4px;">Score:</div>
        <div class="mock-score" style="font-size:clamp(32px,6vw,40px);font-weight:800;color:#1e3a8a;line-height:1;">${percent}%</div>
        <div class="mock-progress" style="height:8px;background:#e5e7eb;border-radius:9999px;margin:14px 0;overflow:hidden;">
          <div class="mock-progress-fill" style="width:${percent}%;height:100%;background:#22c55e;"></div>
        </div>
        <div class="mock-meta" style="color:#374151;margin:8px 0;">${correctAnswers} out of ${currentMCQs.length}</div>
        <div class="mock-meta-sub" style="color:#6b7280;margin:4px 0;">Time Taken: ${takenMin} minutes</div>
        <div class="mock-actions" style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="nav-btn" onclick="showAllMCQsReview(); document.getElementById('modal-overlay')?.classList.remove('show'); document.getElementById('solution-card')?.classList.remove('show');">Review Your Answers</button>
          <button class="nav-btn" onclick="startNewPractice()">Start New Practice</button>
        </div>
      </div>
    `;

    // Stop here for Mock Test customized result
    // Hide timer
    const timerElement = document.getElementById('timer');
    if (timerElement) timerElement.style.display = 'none';
    // Clear timer storage after results
    clearQuizTimer();
    return;
  }

  // Determine performance level and colors (non-mock)
  let performanceLevel, performanceColor, performanceIcon, performanceMessage;
  if (percentage >= 80) {
    performanceLevel = "Excellent";
    performanceColor = "#10b981";
    performanceIcon = "🎉";
    performanceMessage = "Outstanding performance!";
  } else if (percentage >= 60) {
    performanceLevel = "Good";
    performanceColor = "#3b82f6";
    performanceIcon = "👍";
    performanceMessage = "Well done!";
  } else if (percentage >= 40) {
    performanceLevel = "Fair";
    performanceColor = "#f59e0b";
    performanceIcon = "📚";
    performanceMessage = "Keep practicing!";
  } else {
    performanceLevel = "Needs Improvement";
    performanceColor = "#ef4444";
    performanceIcon = "💪";
    performanceMessage = "Don't give up!";
  }

  questionBox.innerHTML = `
    <div class="results-container">
        <div class="results-header">
        <h2 class="results-title">Practice Complete!</h2>
        <p class="results-subtitle">${performanceMessage}</p>
      </div>
      
      <div class="score-display">
        <div class="score-circle" style="--score-color: ${performanceColor}; --percentage: ${percentage}">
          <div class="score-percentage">${percentage}%</div>
          <div class="score-label">Score</div>
        </div>
        
        <div class="score-details">
          <div class="score-item">
            <span class="score-number" style="color: ${performanceColor}">${correctAnswers}</span>
            <span class="score-text">Correct</span>
          </div>
          <div class="score-divider"></div>
          <div class="score-item">
            <span class="score-number">${totalAnswered}</span>
            <span class="score-text">Total</span>
          </div>
        </div>
      </div>
      
      <div class="performance-badge" style="background: linear-gradient(135deg, ${performanceColor}, ${performanceColor}dd)">
        <span class="badge-text">${performanceLevel}</span>
      </div>
      
      <div class="action-buttons">
        <button class="btn-review" onclick="showAllMCQsReview(); document.getElementById('modal-overlay')?.classList.remove('show'); document.getElementById('solution-card')?.classList.remove('show');">
          <i class="fas fa-list-check"></i>
          <span>Review Answers</span>
        </button>
        <button class="btn-restart" onclick="startNewPractice()">
          <i class="fas fa-redo"></i>
          <span>Start New Practice</span>
        </button>
      </div>
    </div>
  `;

  // Persist final state (so review can be resumed)
  saveQuizState('results');

  // Hide the timer when results are displayed
  const activeSection = document.querySelector(".content-section[style*='display: block']");
  const timerElement = activeSection ? activeSection.querySelector('#timer') : null;
  if (timerElement) timerElement.style.display = 'none';
}

// Start new practice - reset everything and return to home
function startNewPractice() {
  // Reset all global variables
  currentIndex = 0;
  currentMCQs = [];
  score = 0;
  attempted = 0;
  validQuestions = 0;
  userAnswers = [];
  isMockTest = false;
  
  // Clear navigation stack
  navigationStack = [];
  
  // Hide all content sections
  document.getElementById("exam-wise").style.display = "none";
  document.getElementById("subject-wise").style.display = "none";
  
  // Show main navigation
  const mainNav = document.getElementById("main-nav");
  if (mainNav) {
    mainNav.style.display = "block";
  }
  
  // Show hero section and other home elements
  const heroSection = document.querySelector(".hero-section");
  if (heroSection) {
    heroSection.style.display = "block";
  }
  
  // Show elements with mb-0 class
  document.querySelectorAll(".mb-0").forEach((element) => {
    element.style.display = "block";
  });
  
  // Hide back to home button
  const backButton = document.getElementById("back-to-home-btn");
  if (backButton) {
    backButton.style.display = "none";
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Update history to home page
  history.pushState({ page: 'home' }, '', '/');
  
  console.log('Started new practice - returned to home page');

  // Clear persisted quiz state on full reset
  clearQuizState();
}

function generateReviewQuestionHTML(q, index, userAnswer) {
  const isCorrect = userAnswer === q.correct_answer;
  const statusClass = userAnswer ? (isCorrect ? "correct" : "incorrect") : "unanswered";
  const statusText = userAnswer
    ? isCorrect
      ? "Correct"
      : "Incorrect"
    : "Not Answered";

  const statusIcon = userAnswer
    ? isCorrect
      ? "fas fa-check-circle"
      : "fas fa-times-circle"
    : "fas fa-question-circle";

  const statusColor = userAnswer
    ? isCorrect
      ? "#10b981"
      : "#ef4444"
    : "#6b7280";

  return `
    <div class="review-question-card ${statusClass}">
      <div class="review-question-header">
        <div class="question-number">
          <span class="number">${index + 1}</span>
          <span class="label">Question</span>
        </div>
        <div class="status-indicator" style="--status-color: ${statusColor}">
          <i class="${statusIcon}"></i>
          <span class="status-text">${statusText}</span>
        </div>
      </div>
      
      <div class="review-question-content">
        <div class="question-stem">
          ${escapeHtml(q.question_text)}
        </div>
        
        <div class="review-options-grid">
          ${Object.entries(q.options)
            .map(([key, value]) => {
              if (!value) return "";
              let optionClass = "review-option";
              let icon = "";
              let optionStyle = "";
              
              if (key === q.correct_answer) {
                optionClass += " correct-option";
                icon = '<i class="fas fa-check"></i>';
                optionStyle = "background: linear-gradient(135deg, #10b981, #059669); color: white;";
              } else if (key === userAnswer && userAnswer !== q.correct_answer) {
                optionClass += " incorrect-option";
                icon = '<i class="fas fa-times"></i>';
                optionStyle = "background: linear-gradient(135deg, #ef4444, #dc2626); color: white;";
              } else {
                optionClass += " neutral-option";
                optionStyle = "background: #f8fafc; color: #374151; border: 2px solid #e5e7eb;";
              }
              
              return `
                <div class="${optionClass}" style="${optionStyle}">
                  <div class="option-content">
                    <span class="option-key">${key}</span>
                    <span class="option-text">${escapeHtml(value)}</span>
                    ${icon ? `<span class="option-icon">${icon}</span>` : ''}
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
        
        <div class="explanation-section">
          <button class="explanation-btn" onclick="toggleReviewExplanation(${index})">
            <i class="fas fa-lightbulb"></i>
            <span>Show Explanation</span>
            <i class="fas fa-chevron-down explanation-arrow"></i>
          </button>
          <div class="explanation-content" id="explanation-${index}" style="display: none;">
            <div class="explanation-header">
              <i class="fas fa-info-circle"></i>
              <span>Explanation</span>
            </div>
            <div class="explanation-text">
              ${q.explanation ? formatExplanation(q.explanation) : "No explanation available for this question."}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function toggleReviewExplanation(index) {
  const explanationDiv = document.getElementById(`explanation-${index}`);
  const button = explanationDiv.previousElementSibling;

  if (explanationDiv.style.display === "none") {
    explanationDiv.style.display = "block";
    button.textContent = "Hide Explanation";
    button.classList.add("active");
  } else {
    explanationDiv.style.display = "none";
    button.textContent = "Show Explanation";
    button.classList.remove("active");
  }
}

function showAllMCQsReview() {
  const container = document.getElementById("question-box");
  const reviewHTML = currentMCQs
    .map((q, index) => {
      const userAnswer = userAnswers[index];
      return `
        <div class="review-item" style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;">
          <div style="font-weight:600;color:#1f2937;margin-bottom:8px;">Q${index + 1}</div>
          <div style="color:#374151;margin-bottom:10px;">${escapeHtml(q.question_text)}</div>
          <div style="display:grid;gap:8px;">
            ${Object.entries(q.options).map(([key,value])=>{
              if(!value) return '';
              const isCorrect = key === q.correct_answer;
              const isChosen = key === userAnswer;
              const base = 'border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;';
              const muted = 'background:#f9fafb;color:#374151;';
              const correct = 'background:#ecfdf5;color:#065f46;border-color:#86efac;';
              const chosenWrong = 'background:#fef2f2;color:#7f1d1d;border-color:#fecaca;';
              const style = isCorrect ? correct : (isChosen && !isCorrect ? chosenWrong : muted);
              return `<div style="${base}${style}"><strong>${key})</strong> ${escapeHtml(value)}</div>`;
            }).join('')}
          </div>
        </div>`;
    })
    .join("");

  container.innerHTML = `
        <div class="main-content-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin: 0;">Review All Questions</h2>
                <button class="nav-btn" onclick="showFinalResults()" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    ← Back to Results
                </button>
            </div>
            <div style="max-width: 100%; overflow-x: hidden; overflow-y: auto; max-height: calc(100vh - 220px); padding-right: 8px;">
                ${reviewHTML}
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <button class="nav-btn" onclick="startNewPractice()" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    Start New Practice
                </button>
            </div>
        </div>
    `;

  // Hide stats bar during review
  const statsBar = document.querySelector(".stats-bar");
  if (statsBar) {
    statsBar.style.display = "none";
  }

  // Prevent scrolling beyond last review item (allow upward scrolling)
  const scrollHost = container.querySelector('div[style*="overflow-y: auto"]');
  if (scrollHost) {
    scrollHost.addEventListener('wheel', (e) => {
      const bottomThreshold = scrollHost.scrollHeight - scrollHost.clientHeight - 2; // allow final item to fully show
      const atBottom = scrollHost.scrollTop >= bottomThreshold;
      if (e.deltaY > 0 && atBottom) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

// Explanation handling functions
function toggleExplanation() {
  console.log("toggleExplanation called");
  const card = document.getElementById("solution-card");
  const overlay = document.getElementById("modal-overlay");
  const button = document.querySelector(".show-explanation-btn");
  const explanationContent = document.getElementById("explanation-content");

  console.log("Elements found:", { card, overlay, button, explanationContent });
  console.log("Current explanation content:", explanationContent ? explanationContent.innerHTML : "Not found");

  if (card.classList.contains("show")) {
    console.log("Hiding explanation");
    hideExplanation(card, overlay, button);
  } else {
    console.log("Showing explanation");
    showExplanation(card, overlay, button);
  }
}

function showExplanation(card, overlay, button) {
  console.log("showExplanation called with:", { card, overlay, button });
  card.style.display = "block";
  overlay.style.display = "block";
  
  // Ensure explanation content is populated
  const explanationContent = document.getElementById("explanation-content");
  const currentMCQ = currentMCQs[currentIndex];
  
  console.log("Explanation content element:", explanationContent);
  console.log("Current MCQ:", currentMCQ);
  
  if (currentMCQ && currentMCQ.explanation) {
    const formattedExplanation = formatExplanation(currentMCQ.explanation);
    explanationContent.innerHTML = formattedExplanation;
    console.log("Explanation content set in modal:", formattedExplanation);
    console.log("Explanation content innerHTML after setting:", explanationContent.innerHTML);
  } else {
    // Set a test message to see if content is being displayed
    explanationContent.innerHTML = '<div style="padding: 20px; color: red; font-weight: bold;">TEST: This is a test message to see if content is being displayed.</div>';
    console.log("Set test content in explanation modal");
  }
  
  setTimeout(() => {
    card.classList.add("show");
    overlay.classList.add("show");
  }, 50);
  if (button) {
    button.textContent = "Hide Explanation";
  }
}

function hideExplanation(card, overlay, button) {
  card.classList.remove("show");
  overlay.classList.remove("show");
  setTimeout(() => {
    card.style.display = "none";
    overlay.style.display = "none";
  }, 300);
  if (button) {
    button.textContent = "Show Explanation";
  }
}

function showExplanationButton() {
  const currentMCQ = currentMCQs[currentIndex];
  console.log("showExplanationButton called for question:", currentIndex, "explanation:", currentMCQ.explanation);
  
  // Always target the visible section's question-box to avoid hidden placeholders
  const activeSection = document.querySelector(".content-section[style*='display: block']");
  const questionBox = activeSection ? activeSection.querySelector("#question-box") : null;
  if (!questionBox) {
    console.log("ERROR: question-box not found!");
    return;
  }
  
  // If this is the Mock Test, do not show the explanation button
  if (isMockTest) {
    const existingContainer = document.querySelector('.explanation-btn-container');
    if (existingContainer) existingContainer.remove();
    console.log('Explanation button suppressed in Mock Test mode');
    return;
  }
  
  if (currentMCQ.explanation) {
    const explanationContent = document.getElementById("explanation-content");
    console.log("explanationContent element:", explanationContent);
    
    const formattedExplanation = formatExplanation(currentMCQ.explanation);
    console.log("formattedExplanation:", formattedExplanation);
    
    if (explanationContent) {
      explanationContent.innerHTML = formattedExplanation;
    }

    // Remove existing button container first
    const existingContainer = questionBox.querySelector(".explanation-btn-container");
    if (existingContainer) {
      existingContainer.remove();
      console.log("Removed existing explanation button container");
    }

    const container = document.createElement("div");
    container.className = "explanation-btn-container";

    const explanationBtn = document.createElement("button");
    explanationBtn.className = "show-explanation-btn";
    explanationBtn.textContent = "Show Explanation";
    explanationBtn.onclick = toggleExplanation;

    container.appendChild(explanationBtn);
    questionBox.appendChild(container);
    console.log("Explanation button added to DOM");
  } else {
    console.log("No explanation available for this question");
    // Still show the button but with a message that no explanation is available
    const explanationContent = document.getElementById("explanation-content");
    if (explanationContent) {
      explanationContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;"><p>No explanation is available for this question.</p></div>';
    }

    // Remove existing button container first
    const existingContainer = questionBox.querySelector(".explanation-btn-container");
    if (existingContainer) {
      existingContainer.remove();
      console.log("Removed existing explanation button container");
    }

    const container = document.createElement("div");
    container.className = "explanation-btn-container";

    const explanationBtn = document.createElement("button");
    explanationBtn.className = "show-explanation-btn";
    explanationBtn.textContent = "Show Explanation";
    explanationBtn.onclick = toggleExplanation;

    container.appendChild(explanationBtn);
    questionBox.appendChild(container);
    console.log("Explanation button added to DOM (no explanation available)");
  }
}

// Deterministic button render that targets the current question's slot
function renderExplanationButton() {
  const activeSection = document.querySelector(".content-section[style*='display: block']");
  const questionBox = activeSection ? activeSection.querySelector("#question-box") : null;
  if (!questionBox) return;
  const slot = questionBox.querySelector('#explanation-btn-slot');
  if (!slot) return;

  // Clear prior content in the slot only
  slot.innerHTML = '';

  // Honor Mock Test rule: no explanation button
  if (isMockTest) return;

  // Only show the explanation button after the user has attempted this question
  if (userAnswers[currentIndex] === null) {
    return;
  }

  const currentMCQ = currentMCQs[currentIndex];
  const hasExplanation = !!(currentMCQ && currentMCQ.explanation);

  // Always render the button so users can open the modal (which may say none available)
  const container = document.createElement('div');
  container.className = 'explanation-btn-container';

  const explanationBtn = document.createElement('button');
  explanationBtn.className = 'show-explanation-btn';
  explanationBtn.textContent = 'Show Explanation';
  explanationBtn.onclick = toggleExplanation;

  container.appendChild(explanationBtn);
  slot.appendChild(container);

  // Preload explanation content if present
  const explanationContent = document.getElementById('explanation-content');
  if (explanationContent) {
    explanationContent.innerHTML = hasExplanation
      ? formatExplanation(currentMCQ.explanation)
      : '<div style="padding: 20px; text-align: center; color: #666;"><p>No explanation is available for this question.</p></div>';
  }
}

function formatExplanation(explanation) {
  if (!explanation || explanation.trim() === "" || explanation === null || explanation === undefined) {
    return '<div style="padding: 20px; text-align: center; color: #666;"><p>No explanation is available for this question.</p></div>';
  }

  try {
    const sections = explanation.split(/\*\*[\d.]+\s+/);
    const result = sections
      .map((section) => {
        if (!section.trim()) return "";

        const [title, ...content] = section.split("**");
        if (!title || !content.length) return "";

        return formatExplanationSection(title, content.join(""));
      })
      .join("");
    
    // If no sections were found, treat the whole explanation as plain text
    if (!result || result.trim() === "") {
      return `<div style="padding: 20px; overflow-wrap: break-word; line-height: 1.6;">${explanation}</div>`;
    }
    
    return result;
  } catch (error) {
    console.error("Error formatting explanation:", error);
    return `<div style="padding: 20px; overflow-wrap: break-word; line-height: 1.6;">${explanation}</div>`;
  }
}

function formatExplanationSection(title, content) {
  return `
        <div class="explanation-section">
            <h3 class="section-header">${title.trim()}</h3>
            <div class="explanation-content">
                ${formatExplanationContent(content.trim())}
            </div>
        </div>
    `;
}

function formatExplanationContent(content) {
  return content
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .split("\n")
    .map((line) => {
      if (line.trim().startsWith("*")) {
        return `<li>${line.trim().substring(1).trim()}</li>`;
      }
      return `<p>${line}</p>`;
    })
    .join("\n")
    .replace(/<li>.*?<\/li>(\n<li>.*?<\/li>)*/g, (match) => `<ul>${match}</ul>`)
    .replace(
      /Key Point:/g,
      '<div class="key-point"><strong>Key Point:</strong>'
    )
    .replace(
      /Warning:/g,
      '<div class="warning-point"><strong>Warning:</strong>'
    )
    .replace(/\n(?=\n|$)/g, "</div>\n")
    .replace(/\n/g, "<br>");
}

// Utility functions
function updateStats() {
  const total = currentMCQs.length;
  const activeSection = document.querySelector(
    ".content-section[style*='display: block']"
  );
  if (activeSection) {
    const progressElement = activeSection.querySelector("#progress");
    const scoreElement = activeSection.querySelector("#score");
    const timerElement = isMockTest ? activeSection.querySelector('#timer') : null;
    if (progressElement)
      progressElement.textContent = `Question ${currentIndex + 1} of ${total}`;
    if (scoreElement) scoreElement.textContent = `Score: ${score}/${total}`;
    if (timerElement && isMockTest) updateTimerUI(timerElement);
    // Update progress bar fill
    const barFill = activeSection.querySelector('.exam-progress-fill');
    if (barFill && total > 0) {
      const pct = ((currentIndex + 1) / total) * 100;
      barFill.style.width = `${pct}%`;
    }
  }
}

function updateActiveButton(className, text) {
  document.querySelectorAll(`.${className}`).forEach((btn) => {
    btn.classList.remove("active");
    if (btn.textContent.includes(text)) {
      btn.classList.add("active");
    }
  });
}

function showErrorMessage(error) {
  const container = document.querySelector(".content-section[style*='block']");
  container.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="warning" style="display: inline-block; margin-bottom: 20px;">
                ${
                  error.message === "Failed to fetch"
                    ? "Unable to connect to the server. Please check your internet connection."
                    : error.message
                }
            </div>
            <br>
            <button onclick="showSection('exam-wise')" class="nav-btn">
                ← Back to Month Selection
            </button>
        </div>
    `;
}

function resetExplanationState() {
  const solutionCard = document.getElementById("solution-card");
  const explanationContent = document.getElementById("explanation-content");
  
  // Don't remove the explanation button container here - let it stay for the current question
  // const existingContainer = document.querySelector(".explanation-btn-container");
  // if (existingContainer) {
  //   existingContainer.remove();
  // }

  solutionCard.classList.remove("show");
  explanationContent.classList.remove("show");
  solutionCard.style.display = "none";
}

// Mock test timer & palette helpers
function startOrResumeMockTimer(totalMinutes) {
  if (!isMockTest) return; // only for Mock Test
  const totalMs = totalMinutes * 60 * 1000;
  try {
    let timer = getSavedTimer();
    if (!timer || !Number.isFinite(timer.remainingMs)) {
      timer = { remainingMs: totalMs, paused: false, lastTick: Date.now(), isMockTest: true };
    }
    // On entering MCQs view, ensure timer is running (unpause)
    const now = Date.now();
    if (!timer.paused) {
      const elapsed = Math.max(0, now - (timer.lastTick || now));
      timer.remainingMs = Math.max(0, timer.remainingMs - elapsed);
    }
    timer.paused = false;
    timer.lastTick = now;
    localStorage.setItem(QUIZ_TIMER_KEY, JSON.stringify(timer));
  } catch {}

  if (mockTimerInterval) clearInterval(mockTimerInterval);
  mockTimerInterval = setInterval(() => tickTimer(), 1000);
  tickTimer();
}

function tickTimer() {
  if (!isMockTest) return; // only for Mock Test
  const activeSection = document.querySelector(".content-section[style*='display: block']");
  const timerElement = activeSection ? activeSection.querySelector('#timer') : null;
  updateTimerUI(timerElement);
}

function updateTimerUI(timerElement) {
  try {
    if (!isMockTest) return; // only for Mock Test
    let timer = getSavedTimer();
    if (!timer) {
      if (timerElement) timerElement.textContent = 'Time Remaining: --:--:--';
      return;
    }
    const now = Date.now();
    if (!timer.paused) {
      const elapsed = Math.max(0, now - (timer.lastTick || now));
      timer.remainingMs = Math.max(0, timer.remainingMs - elapsed);
      timer.lastTick = now;
      localStorage.setItem(QUIZ_TIMER_KEY, JSON.stringify(timer));
    }
    let remainingMs = timer.remainingMs;
    if (remainingMs <= 0) {
      if (timerElement) {
        timerElement.textContent = 'Time Remaining: 00:00:00';
        timerElement.style.color = '#ef4444';
      }
      clearInterval(mockTimerInterval);
      // Auto-submit
      showFinalResults();
      // Clear timer so it doesn't resume after submission
      localStorage.removeItem(QUIZ_TIMER_KEY);
      return;
    }
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    if (timerElement) {
      timerElement.textContent = `Time Remaining: ${hh}:${mm}:${ss}`;
      // Turn red when under 5 minutes
      if (totalSeconds <= 5 * 60) {
        timerElement.style.color = '#ef4444';
      } else {
        timerElement.style.color = '#374151';
      }
    }
  } catch {}
}

function getSavedTimer() {
  try { return JSON.parse(localStorage.getItem(QUIZ_TIMER_KEY) || 'null'); } catch { return null; }
}

// Left question panel removed per request

// Question palette removed per request

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Initialize with no section visible
  showSection(null);

  // Inject toast container and global spinner
  injectUIHelpers();
  
  // Create navigation bar
  createNavigationBar();
  
  // Set initial history state to prevent going to login page
  if (history.state === null) {
    history.replaceState({ page: 'home' }, '', '/');
    // Add a guard state so the first back press stays within the SPA
    try { history.pushState({ page: 'home' }, '', '/'); } catch {}
  }

  // Always start a fresh session on page load (disable cross-reload resume)
  try { sessionStorage.setItem('ALLOW_MOCK_RESUME', '0'); } catch {}
  clearQuizState();
  clearQuizTimer();

  // Try restore saved quiz state (only if not a full reload)
  const saved = null; // disabled restoration on page load to enforce fresh start
  if (saved && saved.currentMCQs.length > 0) {
    try {
      currentMCQs = saved.currentMCQs;
      currentIndex = Math.min(Math.max(0, saved.currentIndex || 0), saved.currentMCQs.length - 1);
      userAnswers = Array.isArray(saved.userAnswers) ? saved.userAnswers : new Array(saved.currentMCQs.length).fill(null);
      score = Number.isFinite(saved.score) ? saved.score : 0;
      attempted = Number.isFinite(saved.attempted) ? saved.attempted : 0;
      isMockTest = !!saved.isMockTest;
      currentNavigationState = saved.navigation || null;

      // Decide which UI to show (subject-wise/exam-wise) based on saved context
      const context = saved.context || '';
      if (context.startsWith('subject:')) {
        setupQuestionInterface('', context.replace('subject:', ''));
        showSection('subject-wise');
      } else if (context.startsWith('month:')) {
        setupQuestionInterface(context.replace('month:', ''), '');
        showSection('exam-wise');
  } else {
        // Fallback to subject-wise container
        setupQuestionInterface('', '');
        showSection('subject-wise');
      }

      createExplanationModal();
      addBackToHomeButton();
      updateStats();
      showQuestion(userAnswers[currentIndex] !== null);
      // If saved timer exists and this was a mock test, do not auto-unpause here; only unpause after entering MCQs intentionally
      if (isMockTest) {
        const timer = getSavedTimer();
        if (timer && timer.paused) {
          // keep paused until user explicitly starts/resumes (e.g., via startMockTest)
          updateTimerUI(document.querySelector('#timer'));
        } else {
          startOrResumeMockTimer(20);
        }
      }
    } catch (e) {
      // On any error, clear saved state
      clearQuizState();
    }
  }
});

// Handle browser back button
window.addEventListener('popstate', (event) => {
  console.log('Browser back button pressed');
  // Immediately push a home state so further back presses stay in-app
  try { history.pushState({ page: 'home' }, '', '/'); } catch {}
  showHomePage(); // pauses timer via showHomePage
});

// Lightweight UI helpers
function injectUIHelpers() {
  if (!document.getElementById("toast-container")) {
    const toast = document.createElement("div");
    toast.id = "toast-container";
    toast.style.cssText = "position:fixed;top:20px;right:20px;z-index:2000;display:flex;flex-direction:column;gap:10px;";
    document.body.appendChild(toast);
  }
  if (!document.getElementById("global-spinner")) {
    const spinner = document.createElement("div");
    spinner.id = "global-spinner";
    spinner.style.cssText = "position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(255,255,255,0.6);z-index:1500;";
    spinner.innerHTML = '<div style="width:56px;height:56px;border:6px solid #e3eaf3;border-top-color:#1565c0;border-radius:50%;animation:spin 0.8s linear infinite"></div>';
    document.body.appendChild(spinner);
    const style = document.createElement("style");
    style.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
    document.head.appendChild(style);
  }
}

function showToast(message, type = "info", timeout = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  const bg = type === "error" ? "#fdecea" : type === "success" ? "#e8f5e9" : "#e3f2fd";
  const border = type === "error" ? "#f5c6cb" : type === "success" ? "#c8e6c9" : "#bbdefb";
  const color = type === "error" ? "#c0392b" : type === "success" ? "#2e7d32" : "#1565c0";
  toast.style.cssText = `background:${bg};border:1px solid ${border};color:${color};padding:10px 14px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);min-width:220px`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), timeout);
}

function setLoading(isLoading) {
  const spinner = document.getElementById("global-spinner");
  if (!spinner) return;
  spinner.style.display = isLoading ? "flex" : "none";
}
