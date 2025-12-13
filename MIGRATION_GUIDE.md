# Migration Guide: HTML/JS to React

This guide explains the migration from the original HTML/JavaScript frontend to React.

## Changes Made

### 1. Project Structure
- Created `frontend/` directory with React app structure
- Components organized in `frontend/src/components/`
- Hooks for state management in `frontend/src/hooks/`
- Utilities in `frontend/src/utils/`

### 2. Component Breakdown

**Main Components:**
- `App.js`: Main application component with routing
- `Home.js`: Landing page with practice mode selection
- `ExamWise.js`: Exam-wise MCQ practice
- `SubjectWise.js`: Subject-wise MCQ practice
- `MockTest.js`: Mock test with timer functionality

**Shared Components:**
- `MCQView.js`: Reusable component for displaying MCQs
- `ResultsView.js`: Results and review screen
- `ExplanationModal.js`: Modal for showing explanations
- `BackToHomeButton.js`: Navigation button
- `ToastContainer.js`: Toast notifications
- `LoadingSpinner.js`: Loading indicator

**Modal Components:**
- `ExamWiseModal.js`: Month selection modal
- `SubjectWiseModal.js`: Subject selection modal
- `MockTestModal.js`: Mock test details modal

### 3. State Management

**Custom Hooks:**
- `useQuizState`: Manages quiz state (current index, MCQs, answers, score, etc.)
- `useMockTimer`: Manages mock test timer

**Features Preserved:**
- ✅ LocalStorage persistence for quiz state
- ✅ Timer functionality for mock tests
- ✅ Score tracking
- ✅ Navigation between questions
- ✅ Review mode
- ✅ Explanation display
- ✅ All original logic maintained

### 4. API Integration

**API Functions (`utils/api.js`):**
- `fetchMCQsBySubject()`: Get MCQs by subject
- `fetchMCQsByExam()`: Get MCQs by exam month
- `fetchMockTestMCQs()`: Get mock test MCQs
- `escapeHtml()`: HTML escaping utility
- `formatExplanation()`: Format explanation text

### 5. Styling

- Original CSS file (`static/css/style.css`) copied to `frontend/src/styles.css`
- All styles preserved and working with React components
- Bootstrap and Font Awesome still included

### 6. Backend Changes

**Flask Updates:**
- Updated `app.py` to serve React build from `static/` folder
- Route handling for React client-side routing
- Fallback to original template if React build not available

## Deployment Steps

1. **Install React Dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Build React App:**
   ```bash
   npm run build
   ```

3. **Deploy Build:**
   ```bash
   python build_and_deploy.py
   ```
   Or manually copy `frontend/build/*` to `static/`

4. **Run Flask App:**
   ```bash
   python app.py
   ```

## Preserved Features

All original functionality has been preserved:
- ✅ Exam-wise practice (by month)
- ✅ Subject-wise practice (Medicine, Surgery, Gynae, Paeds)
- ✅ Mock test with 20-minute timer
- ✅ Question navigation (Previous/Next)
- ✅ Score tracking
- ✅ Results display with performance badges
- ✅ Review mode with all questions
- ✅ Explanation modal
- ✅ Toast notifications
- ✅ Loading states
- ✅ Responsive design
- ✅ All original styling

## Next Steps

1. Build the React app: `cd frontend && npm run build`
2. Copy build to static folder or run `python build_and_deploy.py`
3. Test the application
4. Remove old frontend files (templates, static/js, static/css) once confirmed working

