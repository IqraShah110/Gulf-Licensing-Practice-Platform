// Global variables
let currentIndex = 0;
let currentMCQs = [];
let score = 0;
let attempted = 0;
let validQuestions = 0;
let userAnswers = [];

// Add event listener for Enter key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        // Only trigger next question if the Next Question button is displayed
        const nextButton = document.querySelector('.next-btn');
        if (nextButton && nextButton.style.display === 'block') {
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
    // Show or hide the home link based on section
    const homeLink = document.querySelector('.home-link');
    if (homeLink) {
        if (sectionId === 'exam-wise' || sectionId === 'subject-wise') {
            homeLink.style.display = 'block';
        } else {
            homeLink.style.display = 'none';
        }
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
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    document.getElementById("exam-wise").innerHTML = `
        <h2>Select Exam Month</h2>
        <div class="month-grid">
            ${months.map(month => `
                <button class="month-btn ${month === 'March' ? 'has-mcqs' : ''}"
                    onclick="loadExamDate('${month}')">
                    ${month}
                    ${month === 'March' ? '<span class="mcq-badge">Available</span>' : ''}
                </button>
            `).join('')}
        </div>
    `;
}

// Selection Modal Functions
function showSelectionModal(type) {
    const modalId = `${type}-modal`;
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    
    // Show modal and overlay
    modal.style.display = 'block';
    overlay.style.display = 'block';
    
    // Add show class after a small delay for animation
    setTimeout(() => {
        modal.classList.add('show');
        overlay.classList.add('show');
    }, 50);

    // Add click handler to close modal when clicking overlay
    overlay.onclick = () => hideSelectionModal(modalId);
}

function hideSelectionModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    
    // Remove show class
    modal.classList.remove('show');
    overlay.classList.remove('show');
    
    // Hide modal and overlay after animation
    setTimeout(() => {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }, 300);
}

// MCQ Loading functions
async function loadExamDate(month) {
    hideSelectionModal('exam-wise-modal');
    updateActiveButton("month-btn", month);
    resetState();

    try {
        const response = await fetch(`/get_mcqs/exam/${month}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data || data.error || data.length === 0) {
            throw new Error(data?.error || 'No MCQs available for this exam month yet.');
        }

        handleMCQData(data, month);
        showSection('exam-wise');
    } catch (error) {
        console.error("Error loading exam MCQs:", error);
        showErrorMessage(error);
    }
}

async function loadSubject(subject) {
    hideSelectionModal('subject-wise-modal');
    updateActiveButton("subject-btn", subject);
    resetState();

    try {
        const response = await fetch(`/get_mcqs/${subject}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        handleMCQData(data, '', subject);
        showSection('subject-wise');
    } catch (error) {
        showErrorMessage(error);
    }
}

function handleMCQData(data, month = '', subject = '') {
    console.log("Received MCQ data:", data);
    currentMCQs = data;
    validQuestions = currentMCQs.filter((q) => q.correct_answer).length;
    currentIndex = 0;
    userAnswers = new Array(currentMCQs.length).fill(null);
    
    setupQuestionInterface(month, subject);
    updateStats();
    showQuestion();
}

function setupQuestionInterface(month = '', subject = '') {
    const examWiseSection = document.getElementById('exam-wise');
    const subjectWiseSection = document.getElementById('subject-wise');
    
    if (month) {
        // Setup exam-wise interface
        examWiseSection.innerHTML = `
            <div class="main-content-container">
                <div class="header-container">
                    <h2 class="section-title">Exam: ${month} 2025</h2>
                    <div class="navigation-buttons">
                        <button onclick="showSelectionModal('subject-wise')" class="nav-btn">
                            Switch to Subject-wise MCQs
                        </button>
                    </div>
                </div>
                <div class="stats-bar">
                    <span id="progress">Question 0/${currentMCQs.length}</span>
                    <span id="score">Score: 0/0</span>
                </div>
                <div id="question-box" class="mcq-container">
                    <p>Loading question...</p>
                </div>
                <div id="solution-card" class="solution-card">
                    <div class="solution-header">
                        <h3>Detailed Explanation</h3>
                        <button class="close-explanation-btn" onclick="toggleExplanation()">&times;</button>
                    </div>
                    <div id="explanation-content" class="solution-content">
                        <!-- Explanation will be inserted here -->
                    </div>
                </div>
            </div>
        `;
        
        examWiseSection.style.display = 'block';
        subjectWiseSection.style.display = 'none';
    } else {
        // Setup subject-wise interface
        subjectWiseSection.innerHTML = `
            <div class="main-content-container">
                <div class="header-container">
                    <h2 class="section-title"><span class="highlight">${subject}</span> <span class="highlight">MCQs</span></h2>
                    <div class="navigation-buttons">
                        <button onclick="showSelectionModal('exam-wise')" class="nav-btn">
                            Switch to Exam-wise MCQs
                        </button>
                    </div>
                </div>
                <div class="stats-bar">
                    <span id="progress">Question 0/${currentMCQs.length}</span>
                    <span id="score">Score: 0/0</span>
                </div>
                <div id="question-box" class="mcq-container">
                    <p>Loading question...</p>
                </div>
                <div id="solution-card" class="solution-card">
                    <div class="solution-header">
                        <h3>Detailed Explanation</h3>
                        <button class="close-explanation-btn" onclick="toggleExplanation()">&times;</button>
                    </div>
                    <div id="explanation-content" class="solution-content">
                        <!-- Explanation will be inserted here -->
                    </div>
                </div>
            </div>
        `;
        
        examWiseSection.style.display = 'none';
        subjectWiseSection.style.display = 'block';
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

    const activeSection = document.querySelector(".content-section[style*='display: block']");
    const container = activeSection.querySelector("#question-box");
    container.style.display = "block";

    // Handle both old and new data structures
    const questionText = q.question_text || q.question || '';
    const options = q.options || {
        'A': q.option_a,
        'B': q.option_b,
        'C': q.option_c,
        'D': q.option_d
    };

    const hasCorrectAnswer = q.correct_answer && q.correct_answer.trim() !== "";
    const userAnswer = userAnswers[currentIndex];

    const reviewHTML = isReview && userAnswer ? 
        `<div class="review-mode">Review Mode - Your previous answer: ${userAnswer}</div>` : '';

    container.innerHTML = `
        ${reviewHTML}
        <h3 class="question-title">Question ${currentIndex + 1}: ${questionText}</h3>
        <div class="options-container">
            ${Object.entries(options).map(([key, value]) => {
                if (!value) return '';
                let optionClass = 'option';
                if (userAnswer) {
                    if (key === userAnswer) {
                        optionClass += userAnswer === q.correct_answer ? ' correct' : ' incorrect';
                    }
                    if (key === q.correct_answer) {
                        optionClass += ' correct';
                    }
                }
                if (!hasCorrectAnswer) {
                    optionClass += ' disabled';
                }
                return `<div class="${optionClass}" 
                    onclick="${hasCorrectAnswer ? `selectOption(this, '${key}', '${q.correct_answer}')` : ''}" 
                    ${!hasCorrectAnswer ? 'style="pointer-events: none; opacity: 0.7;"' : ''}>
                    ${key}) ${value}
                </div>`;
            }).join('')}
        </div>
        ${!hasCorrectAnswer ? `
            <div class="warning">
                Note: This question's correct answer is not available in the database.
                Please proceed to the next question.
            </div>
        ` : ''}
        ${getNavigationHTML()}
    `;

    // If no correct answer, show next button immediately
    if (!hasCorrectAnswer) {
        const nextButton = container.querySelector('.next-btn');
        if (nextButton) {
            nextButton.style.display = 'block';
        }
    }

    activeSection.querySelector(".stats-bar").style.display = "block";
    resetExplanationState();
    
    if (isReview && userAnswer && q.explanation) {
        showExplanationButton();
    }

    updateStats();
}

function getOptionsHTML(q, isReview, userAnswer, hasCorrectAnswer) {
    return Object.entries(q.options)
        .map(([key, value]) => {
            if (!value) return '';
            
            let buttonClass = 'option-btn';
            if (isReview && userAnswer) {
                if (key === userAnswer) {
                    buttonClass += userAnswer === q.correct_answer ? ' correct' : ' incorrect';
                } else if (key === q.correct_answer) {
                    buttonClass += ' correct';
                }
                buttonClass += ' disabled';
            }
            
            return `<button class="${buttonClass}" 
                    onclick="${!isReview && hasCorrectAnswer ? `selectOption(this, '${key}', '${q.correct_answer}')` : ''}"
                    ${isReview || !hasCorrectAnswer ? 'disabled' : ''}>
                    ${key}) ${value}
                </button>`;
        })
        .join("");
}

function getWarningHTML(hasCorrectAnswer) {
    return !hasCorrectAnswer ? `
        <div class="warning">
            Note: This question's correct answer is not available in the database.
            Please skip to the next question.
        </div>
    ` : "";
}

function getNavigationHTML() {
    return `
        <div class="nav-buttons">
            <button class="prev-btn" onclick="previousQuestion()" 
                ${currentIndex === 0 ? 'disabled' : ''}>
                ← Previous Question
            </button>
            <button class="next-btn" onclick="nextQuestion()" style="display: ${userAnswers[currentIndex] !== null ? 'block' : 'none'}">
                ${currentIndex === currentMCQs.length - 1 ? 'Show Results' : 'Next Question'} →
            </button>
        </div>
    `;
}

function selectOption(element, selected, correct) {
    const container = element.closest('.options-container');
    const options = container.querySelectorAll('.option');
    
    // Disable all options
    options.forEach(option => {
        option.style.pointerEvents = 'none';
    });

    // Mark user's selection
    element.classList.add(selected === correct ? 'correct' : 'incorrect');
    
    // If answer is incorrect, highlight the correct answer
    if (selected !== correct) {
        options.forEach(option => {
            const optionKey = option.textContent.split(')')[0].trim();
            if (optionKey === correct) {
                option.classList.add('correct');
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
    const nextButton = container.closest('#question-box').querySelector('.next-btn');
    if (nextButton) {
        nextButton.style.display = 'block';
    }

    updateStats();
    
    // Show explanation button if explanation exists
    const currentMCQ = currentMCQs[currentIndex];
    if (currentMCQ.explanation) {
        showExplanationButton();
    }
}

// Navigation and Review functions
function previousQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        showQuestion(true);
    }
}

function nextQuestion() {
    if (currentIndex < currentMCQs.length - 1) {
        currentIndex++;
        showQuestion(userAnswers[currentIndex] !== null);
    } else {
        showFinalResults();
    }
}

function showFinalResults() {
    const totalAnswered = userAnswers.filter(answer => answer !== null).length;
    const correctAnswers = userAnswers.reduce((count, answer, index) => {
        return count + (answer === currentMCQs[index].correct_answer ? 1 : 0);
    }, 0);
    
    const container = document.querySelector(".content-section[style*='display: block']");
    const questionBox = container.querySelector("#question-box");
    
    questionBox.innerHTML = `
        <div class="main-content-container" style="text-align: center; padding: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 30px;">Practice Complete!</h2>
            
            <div style="background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 15px rgba(0,0,0,0.1); margin-bottom: 30px;">
                <div style="font-size: 1.2em; margin-bottom: 20px;">
                    <strong style="color: #3498db;">Final Score:</strong> ${correctAnswers}/${totalAnswered}
                </div>
                
                <div style="font-size: 1.2em; margin-bottom: 20px;">
                    <strong style="color: #3498db;">Percentage:</strong> 
                    ${totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0}%
                </div>
                
                <div style="font-size: 1.2em;">
                    <strong style="color: #3498db;">Questions Attempted:</strong> 
                    ${totalAnswered}/${currentMCQs.length}
                </div>
            </div>

            <div class="nav-buttons" style="justify-content: center; gap: 20px;">
                <button class="prev-btn" onclick="showAllMCQsReview()" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    Review Answers
                </button>
                <button onclick="location.reload()" class="nav-btn" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    Start New Practice
                </button>
            </div>
        </div>
    `;
}

function generateReviewQuestionHTML(q, index, userAnswer) {
    const isCorrect = userAnswer === q.correct_answer;
    const statusClass = userAnswer ? (isCorrect ? 'correct' : 'incorrect') : '';
    const statusText = userAnswer ? (isCorrect ? '✓ Correct' : '✗ Incorrect') : 'Not Attempted';
    
    return `
        <div class="mcq-container" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0;">Question ${index + 1}</h3>
                <span class="${statusClass}">${statusText}</span>
            </div>
            <p>${q.question_text}</p>
            <div class="options">
                ${Object.entries(q.options).map(([key, value]) => {
                    let optionClass = 'option-btn disabled';
                    if (userAnswer) {
                        if (key === userAnswer) {
                            optionClass += userAnswer === q.correct_answer ? ' correct' : ' incorrect';
                        } else if (key === q.correct_answer) {
                            optionClass += ' correct';
                        }
                    }
                    return `
                        <button class="${optionClass}">
                            ${key}) ${value}
                        </button>
                    `;
                }).join('')}
            </div>
            ${q.explanation ? `
                <div class="review-explanation-section">
                    <button class="show-explanation-btn" onclick="toggleReviewExplanation(${index})">
                        Show Explanation
                    </button>
                    <div id="explanation-${index}" class="explanation-content" style="display: none;">
                        ${formatExplanation(q.explanation)}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function toggleReviewExplanation(index) {
    const explanationDiv = document.getElementById(`explanation-${index}`);
    const button = explanationDiv.previousElementSibling;
    
    if (explanationDiv.style.display === 'none') {
        explanationDiv.style.display = 'block';
        button.textContent = 'Hide Explanation';
        button.classList.add('active');
    } else {
        explanationDiv.style.display = 'none';
        button.textContent = 'Show Explanation';
        button.classList.remove('active');
    }
}

function showAllMCQsReview() {
    const container = document.getElementById("question-box");
    const reviewHTML = currentMCQs.map((q, index) => {
        const userAnswer = userAnswers[index];
        return generateReviewQuestionHTML(q, index, userAnswer);
    }).join('');

    container.innerHTML = `
        <div class="main-content-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <h2 style="color: #2c3e50; margin: 0;">Review All Questions</h2>
                <button class="nav-btn" onclick="showFinalResults()" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    ← Back to Results
                </button>
            </div>
            <div style="max-width: 100%; overflow-x: hidden;">
                ${reviewHTML}
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <button class="nav-btn" onclick="location.reload()" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; padding: 12px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
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
}

// Explanation handling functions
function toggleExplanation() {
    const card = document.getElementById('solution-card');
    const overlay = document.getElementById('modal-overlay');
    const button = document.querySelector('.show-explanation-btn');
    
    if (card.classList.contains('show')) {
        hideExplanation(card, overlay, button);
    } else {
        showExplanation(card, overlay, button);
    }
}

function showExplanation(card, overlay, button) {
    card.style.display = 'block';
    overlay.style.display = 'block';
    setTimeout(() => {
        card.classList.add('show');
        overlay.classList.add('show');
    }, 50);
    if (button) {
        button.textContent = 'Hide Explanation';
    }
}

function hideExplanation(card, overlay, button) {
    card.classList.remove('show');
    overlay.classList.remove('show');
    setTimeout(() => {
        card.style.display = 'none';
        overlay.style.display = 'none';
    }, 300);
    if (button) {
        button.textContent = 'Show Explanation';
    }
}

function showExplanationButton() {
    const currentMCQ = currentMCQs[currentIndex];
    if (currentMCQ.explanation) {
        const explanationContent = document.getElementById('explanation-content');
        const formattedExplanation = formatExplanation(currentMCQ.explanation);
        explanationContent.innerHTML = formattedExplanation;
        
        if (!document.querySelector('.explanation-btn-container')) {
            const container = document.createElement('div');
            container.className = 'explanation-btn-container';
            
            const explanationBtn = document.createElement('button');
            explanationBtn.className = 'show-explanation-btn';
            explanationBtn.textContent = 'Show Explanation';
            explanationBtn.onclick = toggleExplanation;
            
            container.appendChild(explanationBtn);
            document.getElementById('question-box').appendChild(container);
        }
    }
}

function formatExplanation(explanation) {
    if (!explanation) return '';

    try {
        const sections = explanation.split(/\*\*[\d.]+\s+/);
        return sections.map(section => {
            if (!section.trim()) return '';

            const [title, ...content] = section.split('**');
            if (!title || !content.length) return '';

            return formatExplanationSection(title, content.join(''));
        }).join('') || `<div style="overflow-wrap: break-word;">${explanation}</div>`;
    } catch (error) {
        console.error("Error formatting explanation:", error);
        return `<div style="overflow-wrap: break-word;">${explanation}</div>`;
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
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .split('\n').map(line => {
            if (line.trim().startsWith('*')) {
                return `<li>${line.trim().substring(1).trim()}</li>`;
            }
            return `<p>${line}</p>`;
        }).join('\n')
        .replace(/<li>.*?<\/li>(\n<li>.*?<\/li>)*/g, match => `<ul>${match}</ul>`)
        .replace(/Key Point:/g, '<div class="key-point"><strong>Key Point:</strong>')
        .replace(/Warning:/g, '<div class="warning-point"><strong>Warning:</strong>')
        .replace(/\n(?=\n|$)/g, '</div>\n')
        .replace(/\n/g, '<br>');
}

// Utility functions
function updateStats() {
    const total = currentMCQs.length;
    const activeSection = document.querySelector(".content-section[style*='display: block']");
    if (activeSection) {
        const progressElement = activeSection.querySelector("#progress");
        const scoreElement = activeSection.querySelector("#score");
        if (progressElement) progressElement.textContent = `Question ${currentIndex + 1}/${total}`;
        if (scoreElement) scoreElement.textContent = `Score: ${score}/${attempted}`;
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
                ${error.message === 'Failed to fetch' ? 
                    'Unable to connect to the server. Please check your internet connection.' :
                    error.message}
            </div>
            <br>
            <button onclick="showSection('exam-wise')" class="nav-btn">
                ← Back to Month Selection
            </button>
        </div>
    `;
}

function resetExplanationState() {
    const solutionCard = document.getElementById('solution-card');
    const explanationContent = document.getElementById('explanation-content');
    const existingContainer = document.querySelector('.explanation-btn-container');
    
    if (existingContainer) {
        existingContainer.remove();
    }
    
    solutionCard.classList.remove('show');
    explanationContent.classList.remove('show');
    solutionCard.style.display = 'none';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with no section visible
    showSection(null);

    // Add click handler to close modal when clicking overlay
    document.getElementById('modal-overlay').addEventListener('click', toggleExplanation);
}); 
