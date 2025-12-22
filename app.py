# app.py
from flask import Flask, request, jsonify, session, redirect, url_for
# Note: render_template removed - app is fully React-based
# Only auth routes (login/register) use templates, which is fine
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
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from email_handler import mail

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)

# Initialize Gemini model
model = genai.GenerativeModel("models/gemini-1.5-pro-latest")

app = Flask(__name__, static_folder='static', static_url_path='/static')
# Require SECRET_KEY - no default fallback for security
app.secret_key = os.getenv('SECRET_KEY')
if not app.secret_key:
    raise ValueError("SECRET_KEY environment variable is required for session management")

# Initialize CSRF Protection
csrf = CSRFProtect(app)
app.config['WTF_CSRF_SECRET_KEY'] = os.getenv('CSRF_SECRET_KEY')
if not app.config['WTF_CSRF_SECRET_KEY']:
    raise ValueError("CSRF_SECRET_KEY environment variable is required for CSRF protection")

# Initialize Rate Limiting
# Use Redis if available, otherwise use memory (acceptable for single-worker deployments)
redis_url = os.getenv('REDIS_URL')
import warnings
# Suppress Flask-Limiter warning about in-memory storage if Redis is not configured
warnings.filterwarnings('ignore', message='.*in-memory storage.*', category=UserWarning)

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=redis_url if redis_url else None,  # Use Redis if available
    default_limits_per_method=True,
    headers_enabled=True
)

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

# Export limiter for use in auth blueprint
import auth
auth.limiter = limiter

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
    """Main entry point - serves React app only (fully React-based)"""
    react_index = os.path.join('static', 'index.html')
    if not os.path.exists(react_index):
        return "React app not found. Please build the frontend first.", 500
    
    try:
        with open(react_index, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error serving React app: {e}")
        return f"Error loading React app: {str(e)}", 500

# Removed /prep route - all functionality is now in React app
# The React app handles routing internally via App.js

@app.route('/get_mcqs/<subject>')
@login_required
@limiter.limit("100 per hour")
def get_mcqs(subject):
    """Get MCQs for a specific subject - STRICTLY filtered by subject"""
    try:
        # Validate subject name - ensure it matches database enum values exactly
        valid_subjects = ['Surgery', 'Medicine', 'Gynae', 'Paeds']
        if subject not in valid_subjects:
            return jsonify({'error': f'Invalid subject. Must be one of: {", ".join(valid_subjects)}'}), 400
        
        # Get MCQs filtered strictly by subject
        mcqs = get_mcqs_by_subject(subject)
        
        # Double-check: Verify all returned MCQs are for the requested subject
        if mcqs:
            for mcq in mcqs:
                # If MCQ has a subject field, verify it matches
                if hasattr(mcq, 'get') and mcq.get('subject'):
                    if mcq.get('subject') != subject:
                        print(f"⚠️ WARNING: MCQ {mcq.get('id')} has subject '{mcq.get('subject')}' but was requested for '{subject}'")
        
        if not mcqs:
            return jsonify({'error': f'No MCQs found for subject: {subject}'}), 404
        
        print(f"✅ Returning {len(mcqs)} MCQs for subject: {subject}")
        return jsonify(mcqs)
    except Exception as e:
        import traceback
        print(f"❌ Error in get_mcqs for subject '{subject}': {e}")
        print(traceback.format_exc())
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
@limiter.limit("100 per hour")
def get_exam_mcqs(year, month):
    """Get MCQs for a specific exam year and month"""
    try:
        # For now, only 2025 has MCQs. This structure supports future years
        if year == 2025:
            table_name = MONTH_TABLES_2025.get(month.lower())
            if not table_name:
                return jsonify({'error': f"No MCQ table configured for {month} {year}."}), 404

            mcqs = get_mcqs_by_exam_table(table_name)
            if not mcqs or len(mcqs) == 0:
                return jsonify({'error': f"This Month's MCQs for {year} will be updated soon"}), 404
            return jsonify(mcqs)

        # Years without data yet
        if year == 2023 or year == 2024:
            return jsonify({'error': f"Data for {month} {year} will be updated soon"}), 404

        # Future extensibility: other years can map to dynamic table names
        table_name = get_month_table_name(year, month)
        if not table_name:
            return jsonify({'error': f"No MCQ table configured for {month} {year}."}), 404

        mcqs = get_mcqs_by_exam_table(table_name)
        if not mcqs or len(mcqs) == 0:
            return jsonify({'error': f"This Month's MCQs for {year} will be updated soon"}), 404
        return jsonify(mcqs)
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
@limiter.limit("50 per hour")
def gemini_explanation():
    data = request.get_json()
    question = data.get('question')
    correct_option = data.get('correct_option')

    explanation = generate_explanation(question, correct_option)
    return jsonify({'explanation': explanation})

@app.route('/get_mcqs/mock_test')
@login_required
@limiter.limit("10 per hour")
def get_mock_test_mcqs():
    """Get 210 random MCQs from all months for mock test:
    Medicine: 63, Obstetrics & Gynecology: 53, Pediatrics: 52, General Surgery: 42
    Total time: 4 hours"""
    try:
        from psycopg2 import sql
        import random
        
        # Subject distribution
        subject_limits = {
            'Medicine': 63,
            'Gynae': 53,
            'Paeds': 52,
            'Surgery': 42
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
                # Optimized: Check all tables at once instead of one by one
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = ANY(%s)
                """, (month_tables,))
                existing_tables = [row[0] for row in cur.fetchall()]
                
                if not existing_tables:
                    return jsonify({'error': 'No MCQ tables found'}), 404
                
                # Optimized: Query each subject separately with LIMIT to reduce data transfer
                # This is much faster than fetching all rows and filtering in Python
                for subject, limit in subject_limits.items():
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
                        params.append(subject)  # Add subject parameter for each UNION part
                    
                    if not union_parts:
                        continue
                    
                    # Combine all tables for this subject
                    combined_query = sql.SQL(" UNION ALL ").join(union_parts)
                    
                    # Use ORDER BY RANDOM() with LIMIT
                    # Fetch 2x the limit to ensure we have enough after deduplication
                    final_query = sql.SQL("""
                        SELECT * FROM (
                            {combined}
                        ) AS all_mcqs
                        ORDER BY RANDOM()
                        LIMIT %s
                    """).format(combined=combined_query)
                    
                    # Add LIMIT parameter
                    params.append(limit * 2)
                    
                    try:
                        cur.execute(final_query, params)
                        rows = cur.fetchall()
                        
                        # Convert to MCQ format
                        subject_mcqs = []
                        seen_ids = set()  # Deduplicate by ID
                        for row in rows:
                            if len(subject_mcqs) >= limit:
                                break
                            if row[0] in seen_ids:
                                continue
                            seen_ids.add(row[0])
                            
                            mcq = {
                                'id': row[0],
                                'question_number': row[1],
                                'question_text': row[2],
                                'options': {},
                                'correct_answer': row[7],
                                'subject': row[8],
                                'explanation': row[9]
                            }
                            if row[3]:
                                mcq['options']['A'] = row[3]
                            if row[4]:
                                mcq['options']['B'] = row[4]
                            if row[5]:
                                mcq['options']['C'] = row[5]
                            if row[6]:
                                mcq['options']['D'] = row[6]
                            subject_mcqs.append(mcq)
                        
                        # If we got fewer than needed, take what we have
                        all_mcqs.extend(subject_mcqs[:limit])
                    except Exception as e:
                        print(f"⚠️ Error querying {subject}: {e}")
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
    # Only enable debug mode if explicitly set in environment
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=int(os.getenv('PORT', 5000)))
