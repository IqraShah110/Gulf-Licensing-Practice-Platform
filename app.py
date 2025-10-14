# app.py
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from db_handler import get_mcqs_by_subject, get_mcqs_by_exam_date, get_connection, ensure_all_tables_exist
from dotenv import load_dotenv
import os
import google.generativeai as genai
from datetime import datetime
from auth import auth, login_required, init_oauth
from flask_wtf.csrf import CSRFProtect, CSRFError
from email_handler import mail

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)

# Initialize Gemini model
model = genai.GenerativeModel("models/gemini-1.5-pro-latest")

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-here')  # Required for session management

# Initialize CSRF Protection
csrf = CSRFProtect(app)
app.config['WTF_CSRF_SECRET_KEY'] = os.getenv('CSRF_SECRET_KEY', 'your-csrf-secret-key-here')

# Stabilize session cookies to prevent OAuth state mismatches
PUBLIC_BASE_URL = os.getenv('PUBLIC_BASE_URL', '')
is_https = PUBLIC_BASE_URL.startswith('https://')
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = bool(is_https)
try:
    from urllib.parse import urlparse
    host = urlparse(PUBLIC_BASE_URL).hostname if PUBLIC_BASE_URL else None
    if host:
        app.config['SESSION_COOKIE_DOMAIN'] = host
except Exception:
    pass

# Configure Flask-Mail
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

# Initialize Flask-Mail
mail.init_app(app)

# Prefer HTTPS externally if PUBLIC_BASE_URL is https
PUBLIC_BASE_URL = os.getenv('PUBLIC_BASE_URL', '')
if PUBLIC_BASE_URL.startswith('https://'):
    app.config['PREFERRED_URL_SCHEME'] = 'https'

# Initialize database and ensure all tables exist
ensure_all_tables_exist()

# Register the auth blueprint
app.register_blueprint(auth)

# Initialize OAuth (Google)
init_oauth(app)

# Friendly CSRF error handling so users see a clear message on form failures
@app.errorhandler(CSRFError)
def handle_csrf_error(e):
    from flask import flash
    flash('Your session expired or the form is invalid. Please try again.', 'error')
    return redirect(url_for('auth.login'))

def generate_explanation(question, correct_option):
    try:
        prompt = f"Explain why the correct answer to the following MCQ is option {correct_option}:\n\n{question}"
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error generating explanation: {str(e)}"

@app.route('/')
@login_required
def index():
    """Main entry point - shows the main index page"""
    return render_template('index.html')

@app.route('/prep')
@login_required
def prep():
    """MCQ practice interface"""
    subject = request.args.get('subject')
    return render_template('index.html', username=session.get('username'), subject=subject)

@app.route('/get_mcqs/<subject>')
@login_required
def get_mcqs(subject):
    """Get MCQs for a specific subject"""
    try:
        mcqs = get_mcqs_by_subject(subject)
        if not mcqs:
            return jsonify({'error': 'No MCQs found for this subject'}), 404
        return jsonify(mcqs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_mcqs/exam/<month>')
@login_required
def get_exam_mcqs(month):
    """Get MCQs for a specific exam month"""
    try:
        if month.lower() == 'march':
            try:
                with get_connection() as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            SELECT 
                                id, question_number, question_text, 
                                option_a, option_b, option_c, option_d,
                                correct_answer, subject, explanation
                            FROM march25_mcqs
                            ORDER BY 
                                subject,
                                CASE 
                                    WHEN question_number ~ '^[0-9]+' THEN CAST(regexp_replace(question_number, '[^0-9].*$', '') AS INTEGER)
                                    ELSE 999999
                                END,
                                question_number
                        """)
                        rows = cur.fetchall()
                        
                        # Convert rows to list of MCQs
                        mcqs = []
                        for row in rows:
                            mcq = {
                                'id': row[0],
                                'question_number': row[1],
                                'question_text': row[2],
                                'options': {},
                                'correct_answer': row[7],
                                'subject': row[8],
                                'explanation': row[9]
                            }
                            # Add non-null options
                            if row[3]: mcq['options']['A'] = row[3]
                            if row[4]: mcq['options']['B'] = row[4]
                            if row[5]: mcq['options']['C'] = row[5]
                            if row[6]: mcq['options']['D'] = row[6]
                            
                            mcqs.append(mcq)
                        
                        return jsonify(mcqs)
            except Exception as e:
                print(f"Database error: {e}")
                return jsonify({'error': f"Error accessing MCQs: {str(e)}"}), 500
        else:
            return jsonify({
                'error': f"No MCQs available for {month} 2025. Currently, only March MCQs are available."
            }), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/gemini_explanation', methods=['POST'])
@login_required
def gemini_explanation():
    data = request.get_json()
    question = data.get('question')
    correct_option = data.get('correct_option')

    explanation = generate_explanation(question, correct_option)
    return jsonify({'explanation': explanation})

@app.route('/get_mcqs/mock_test')
@login_required
def get_mock_test_mcqs():
    """Get 10 random MCQs from each major subject for mock test"""
    try:
        subjects = ['Medicine', 'Gynae', 'Surgery', 'Paeds']
        all_mcqs = []
        with get_connection() as conn:
            with conn.cursor() as cur:
                for subject in subjects:
                    cur.execute("""
                        SELECT 
                            id, question_number, question_text, 
                            option_a, option_b, option_c, option_d,
                            correct_answer, subject, explanation
                        FROM march25_mcqs
                        WHERE subject = %s
                        ORDER BY RANDOM()
                        LIMIT 10
                    """, (subject,))
                    rows = cur.fetchall()
                    for row in rows:
                        mcq = {
                            'id': row[0],
                            'question_number': row[1],
                            'question_text': row[2],
                            'options': {},
                            'correct_answer': row[7],
                            'subject': row[8],
                            'explanation': row[9]
                        }
                        if row[3]: mcq['options']['A'] = row[3]
                        if row[4]: mcq['options']['B'] = row[4]
                        if row[5]: mcq['options']['C'] = row[5]
                        if row[6]: mcq['options']['D'] = row[6]
                        all_mcqs.append(mcq)
        # Shuffle all_mcqs so subjects are mixed
        import random
        random.shuffle(all_mcqs)
        return jsonify(all_mcqs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
    
 

if __name__ == '__main__':
    app.run(debug=True)
