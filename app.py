# app.py
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from db_handler import (
    get_mcqs_by_subject,
    get_mcqs_by_exam_date,
    get_connection,
    ensure_all_tables_exist,
    get_mcqs_by_exam_table
)
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

app = Flask(__name__, static_folder='static', static_url_path='/static')
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

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
@login_required
def index(path):
    """Main entry point - serves React app"""
    try:
        # Try to serve React build index.html
        react_index = os.path.join('static', 'index.html')
        if os.path.exists(react_index):
            with open(react_index, 'r', encoding='utf-8') as f:
                return f.read()
    except Exception as e:
        print(f"Error serving React app: {e}")
    
    # Fallback to template if React build not available
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

def get_month_table_name(year, month):
    """Get table name for a specific year and month"""
    month_lower = month.lower()
    year_suffix = str(year)[-2:]  # Get last 2 digits of year (e.g., 25 for 2025)
    return f"{month_lower}{year_suffix}_mcqs"

MONTH_TABLES_2025 = {
    'january': 'january25_mcqs',
    'february': 'february25_mcqs',
    'march': 'march25_mcqs',
    'april': 'april25_mcqs',
    'may': 'may25_mcqs',
    'june': 'june25_mcqs',
    'july': 'july25_mcqs',
    'august': 'august25_mcqs',
    'september': 'september25_mcqs',
    'october': 'october25_mcqs',
    'november': 'november25_mcqs',
    'december': 'december25_mcqs'
}

@app.route('/get_mcqs/exam/<int:year>/<month>')
@login_required
def get_exam_mcqs(year, month):
    """Get MCQs for a specific exam year and month"""
    try:
        # For now, only 2025 has MCQs. This structure supports future years
        if year == 2025:
            table_name = MONTH_TABLES_2025.get(month.lower())
        if not table_name:
                return jsonify({'error': f"No MCQ table configured for {month} {year}."}), 404
        elif year == 2023 or year == 2024:
            # Return message for 2023 and 2024 (data not available yet)
            return jsonify({'error': f"Data for {month} {year} will be updated soon"}), 404
        else:
            # For other years, use dynamic table name generation
            # You can add specific tables for other years later
            table_name = get_month_table_name(year, month)
        
        # Only try to get MCQs if we have a table name (for 2025)
        if year == 2025:
            mcqs = get_mcqs_by_exam_table(table_name)
            if not mcqs or len(mcqs) == 0:
                return jsonify({'error': f"This Month's MCQs for {year} will be updated soon"}), 404
            return jsonify(mcqs)
        else:
            return jsonify({'error': f"Data for {month} {year} will be updated soon"}), 404
    except Exception as e:
        import traceback
        print(f"Error in get_exam_mcqs: {e}")
        print(traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500

# Backward compatibility: Old route without year (defaults to 2025)
@app.route('/get_mcqs/exam/<month>')
@login_required
def get_exam_mcqs_old(month):
    """Get MCQs for a specific exam month (backward compatibility - defaults to 2025)"""
    return get_exam_mcqs(2025, month)

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
    """Get 200 random MCQs from all months for mock test:
    Medicine: 70, Pediatrics: 50, Obstetrics & Gynecology: 40, General Surgery: 30
    Total time: 4 hours"""
    try:
        from psycopg2 import sql
        import random
        
        # Subject distribution
        subject_limits = {
            'Medicine': 70,
            'Paeds': 50,
            'Gynae': 40,
            'Surgery': 30
        }
        
        # All month tables for 2025 (check which ones exist)
        month_tables = [
            'january25_mcqs',
            'february25_mcqs',
            'march25_mcqs',
            'april25_mcqs',
            'may25_mcqs',
            'june25_mcqs',
            'july25_mcqs',
            'august25_mcqs',
            'september25_mcqs',
            'october25_mcqs',
            'november25_mcqs',
            'december25_mcqs'
        ]
        
        all_mcqs = []
        with get_connection() as conn:
            # Set autocommit to handle errors per query
            conn.autocommit = False
            with conn.cursor() as cur:
                # First, check which tables exist
                existing_tables = []
                for table in month_tables:
                    try:
                        cur.execute("""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_schema = 'public' 
                                AND table_name = %s
                            );
                        """, (table,))
                        if cur.fetchone()[0]:
                            existing_tables.append(table)
                    except Exception:
                        conn.rollback()
                        continue
                
                if not existing_tables:
                    return jsonify({'error': 'No MCQ tables found'}), 404
                
                # Now query all existing tables at once using UNION ALL for each subject
                for subject, limit in subject_limits.items():
                    subject_mcqs = []
                    
                    # Use savepoint for each subject so errors don't abort the whole transaction
                    savepoint_name = f"sp_{subject.lower()}"
                    try:
                        cur.execute(sql.SQL("SAVEPOINT {}").format(sql.Identifier(savepoint_name)))
                    except:
                        pass
                    
                    try:
                        # Build UNION ALL query for all existing tables
                        # Each UNION part needs the subject parameter, so we'll use a list
                        union_parts = []
                        params = []
                        for table in existing_tables:
                            union_parts.append(sql.SQL("""
                                SELECT 
                                    id, question_number, question_text, 
                                    option_a, option_b, option_c, option_d,
                                    correct_answer, subject, explanation
                                FROM {table}
                                WHERE subject = %s
                            """).format(table=sql.Identifier(table)))
                            params.append(subject)
                        
                        if not union_parts:
                            continue
                        
                        # Combine all queries with UNION ALL and randomize
                        combined_query = sql.SQL(" UNION ALL ").join(union_parts)
                        final_query = sql.SQL("""
                            SELECT * FROM (
                                {combined}
                            ) AS all_mcqs
                            ORDER BY RANDOM()
                            LIMIT %s
                        """).format(combined=combined_query)
                        
                        # Add limit parameter
                        params.append(limit)
                        
                        cur.execute(final_query, params)
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
                            subject_mcqs.append(mcq)
                        
                        # If we got fewer than requested, that's okay
                        all_mcqs.extend(subject_mcqs)
                        
                        # Release savepoint on success
                        try:
                            cur.execute(sql.SQL("RELEASE SAVEPOINT {}").format(sql.Identifier(savepoint_name)))
                        except:
                            pass
                    except Exception as e:
                        # Rollback to savepoint to continue with next subject
                        try:
                            cur.execute(sql.SQL("ROLLBACK TO SAVEPOINT {}").format(sql.Identifier(savepoint_name)))
                        except:
                            conn.rollback()
                        print(f"⚠️ Error querying {subject}: {e}")
                        # Continue with other subjects
                        continue
                
                conn.commit()
        
        # Shuffle all_mcqs so subjects are mixed
        random.shuffle(all_mcqs)
        return jsonify(all_mcqs)
    except Exception as e:
        import traceback
        print(f"Error in get_mock_test_mcqs: {e}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    
    
 

if __name__ == '__main__':
    app.run(debug=True)
