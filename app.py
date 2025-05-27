# app.py
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from db_handler import get_mcqs_by_subject, get_mcqs_by_exam_date, get_connection, initialize_database
from dotenv import load_dotenv
import os
import google.generativeai as genai
from datetime import datetime
from auth import auth, login_required
from flask_wtf.csrf import CSRFProtect
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

# Configure Flask-Mail
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

# Initialize Flask-Mail
mail.init_app(app)

# Initialize database
initialize_database()

# Register the auth blueprint
app.register_blueprint(auth)

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
                            ORDER BY subject, question_number::int
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

@app.route('/save_progress', methods=['POST'])
@login_required
def save_progress():
    """Save user's MCQ progress"""
    try:
        data = request.get_json()
        mcq_id = data.get('mcq_id')
        user_answer = data.get('user_answer')
        is_correct = data.get('is_correct')
        
        if not all([mcq_id, user_answer, is_correct is not None]):
            return jsonify({'error': 'Missing required fields'}), 400
            
        user_id = session.get('user_id')
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    INSERT INTO user_progress_{user_id} (mcq_id, user_answer, is_correct)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (mcq_id) DO UPDATE
                    SET user_answer = EXCLUDED.user_answer,
                        is_correct = EXCLUDED.is_correct,
                        attempted_at = CURRENT_TIMESTAMP
                """, (mcq_id, user_answer, is_correct))
                conn.commit()
                
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_user_stats')
@login_required
def get_user_stats():
    """Get user's MCQ practice statistics"""
    try:
        user_id = session.get('user_id')
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(f"""
                    SELECT 
                        COUNT(*) as total_attempted,
                        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
                        COUNT(DISTINCT mcq_id) as unique_questions
                    FROM user_progress_{user_id}
                """)
                stats = cur.fetchone()
                
                return jsonify({
                    'total_attempted': stats[0] or 0,
                    'correct_answers': stats[1] or 0,
                    'unique_questions': stats[2] or 0,
                    'accuracy': round((stats[1] or 0) / (stats[0] or 1) * 100, 2)
                })
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

@app.route('/login')
def login_page():
    return redirect(url_for('auth.login'))

if __name__ == '__main__':
    app.run(debug=True)
