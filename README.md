# Gulf Licensing Exam Preparation Platform

A comprehensive web application for preparing for the Gulf Licensing Exam for General Practitioners. This platform provides MCQ practice with detailed explanations, exam-wise and subject-wise practice modes, and mock tests.

## 🚀 Features

- **Exam-wise Practice**: Practice MCQs from previous Gulf Licensing exams
- **Subject-wise Practice**: Focus on specific subjects (Medicine, Surgery, Gynae, Paeds)
- **Mock Tests**: Random mixed tests for comprehensive practice
- **Detailed Explanations**: AI-powered explanations for each question
- **User Authentication**: Secure login with Google OAuth integration
- **Progress Tracking**: Track your performance and progress
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Technology Stack

- **Backend**: Flask (Python)
- **Database**: PostgreSQL
- **AI Integration**: Google Gemini API
- **PDF Processing**: PyMuPDF
- **Authentication**: Authlib (OAuth)
- **Email**: Flask-Mail
- **Frontend**: HTML5, CSS3, JavaScript
- **Styling**: Bootstrap 5, Font Awesome

## 📋 Prerequisites

- Python 3.8+
- PostgreSQL database
- Google Cloud Console account (for Gemini API)
- Gmail account (for email functionality)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gulf-licensing-prep.git
   cd gulf-licensing-prep
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env_template.txt .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=gulf_licensing
   DB_USER=your_username
   DB_PASSWORD=your_password

   # Flask Configuration
   SECRET_KEY=your-secret-key-here
   CSRF_SECRET_KEY=your-csrf-secret-key-here

   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Google Gemini API
   GEMINI_API_KEY=your-gemini-api-key

   # Email Configuration
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-app-password
   MAIL_DEFAULT_SENDER=your-email@gmail.com

   # Application URL
   PUBLIC_BASE_URL=http://localhost:5000
   ```

5. **Set up the database**
   ```bash
   python setup_database.py
   ```

6. **Run the application**
   ```bash
   python app.py
   ```

   The application will be available at `http://localhost:5000`

## 📁 Project Structure

```
gulf-licensing-prep/
├── app.py                 # Main Flask application
├── auth.py               # Authentication module
├── db_handler.py         # Database operations
├── email_handler.py      # Email functionality
├── extract_mcqs.py       # PDF MCQ extraction
├── classify_mcqs.py      # MCQ classification
├── main.py              # MCQ processing script
├── setup_database.py    # Database setup
├── wsgi.py              # WSGI entry point
├── requirements.txt     # Python dependencies
├── env_template.txt     # Environment variables template
├── static/
│   ├── css/
│   │   └── style.css    # Main stylesheet
│   └── js/
│       └── script.js    # Frontend JavaScript
├── templates/
│   ├── index.html       # Main application page
│   ├── login.html       # Login page
│   ├── register.html    # Registration page
│   └── verify_email.html # Email verification
└── pdf_files/           # PDF files for MCQ extraction
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database username | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `SECRET_KEY` | Flask secret key | Yes |
| `CSRF_SECRET_KEY` | CSRF protection key | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `MAIL_USERNAME` | Email username | Yes |
| `MAIL_PASSWORD` | Email app password | Yes |
| `PUBLIC_BASE_URL` | Application base URL | Yes |

## 🚀 Deployment

### Using Gunicorn (Production)

```bash
gunicorn -w 4 -b 0.0.0.0:8000 wsgi:application
```

### Using Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "wsgi:application"]
```

## 📊 Usage

1. **Registration**: Create an account or sign in with Google
2. **Choose Practice Mode**: Select exam-wise, subject-wise, or mock test
3. **Practice MCQs**: Answer questions and get immediate feedback
4. **Review Answers**: See detailed explanations for each question
5. **Track Progress**: Monitor your performance and improvement

## 🔧 Development

### Adding New MCQs

1. Place PDF files in the `pdf_files/` directory
2. Run the extraction script:
   ```bash
   python main.py "filename.pdf" start_page end_page
   ```

### Database Management

- **Setup**: `python setup_database.py`
- **Cleanup**: Use the cleanup scripts for database maintenance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/gulf-licensing-prep/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🙏 Acknowledgments

- Gulf Licensing Exam Board for providing exam materials
- Google for Gemini AI API
- Flask community for the excellent framework
- All contributors and testers

---

**Note**: This application is designed for educational purposes to help medical professionals prepare for the Gulf Licensing Exam. Please ensure you have the necessary permissions to use any copyrighted materials.
