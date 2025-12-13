# GulfCertify Frontend (React)

This is the React frontend for the GulfCertify application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

The build folder should be copied to Flask's static folder to serve the React app.

## Development

The app uses React Router for navigation and custom hooks for state management. The main components are:

- `Home`: Landing page with practice mode selection
- `ExamWise`: Exam-wise MCQ practice
- `SubjectWise`: Subject-wise MCQ practice  
- `MockTest`: Mock test with timer
- `MCQView`: Shared component for displaying MCQs
- `ResultsView`: Results and review screen

