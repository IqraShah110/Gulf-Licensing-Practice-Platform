from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from db_handler import get_connection
import os
from functools import wraps
from email_handler import mail, generate_verification_code, send_verification_email
from authlib.integrations.flask_client import OAuth
import os

auth = Blueprint('auth', __name__)

# OAuth will be initialized from the Flask app context
oauth = OAuth()
google = None

def init_oauth(app):
    global oauth, google
    oauth.init_app(app)
    google = oauth.register(
        name='google',
        client_id=os.getenv('GOOGLE_CLIENT_ID'),
        client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
        # Use OIDC discovery so jwks_uri and endpoints are auto-configured
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        # Base URL for userinfo and other calls
        api_base_url='https://openidconnect.googleapis.com/v1/',
        client_kwargs={'scope': 'openid email profile', 'prompt': 'select_account'},
    )

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not username or not email or not password:
            flash('All fields are required', 'error')
            return redirect(url_for('auth.register'))
        
        try:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    # Check if username or email already exists
                    cur.execute("""
                        SELECT id FROM users 
                        WHERE username = %s OR email = %s
                    """, (username, email))
                    if cur.fetchone():
                        flash('Username or email already exists', 'error')
                        return redirect(url_for('auth.register'))
                    
                    # Generate verification code
                    verification_code = generate_verification_code()
                    
                    # Store registration data in session
                    session['pending_registration'] = {
                        'username': username,
                        'email': email,
                        'password': password,
                        'verification_code': verification_code
                    }
                    
                    # Send verification email
                    if send_verification_email(email, verification_code):
                        flash('Please check your email for verification code to complete registration.', 'info')
                        return redirect(url_for('auth.verify_email'))
                    else:
                        flash('Error sending verification email. Please try again.', 'error')
                        return redirect(url_for('auth.register'))
                    
        except Exception as e:
            flash(f'Error during registration: {str(e)}', 'error')
            return redirect(url_for('auth.register'))
            
    return render_template('register.html')

@auth.route('/verify-email', methods=['GET', 'POST'])
def verify_email():
    # Get registration data from session
    registration_data = session.get('pending_registration')
    if not registration_data:
        flash('Please register first', 'error')
        return redirect(url_for('auth.register'))
        
    if request.method == 'POST':
        verification_code = request.form.get('verification_code')
        
        if verification_code == registration_data['verification_code']:
            try:
                with get_connection() as conn:
                    with conn.cursor() as cur:
                        # Create new user after verification
                        cur.execute("""
                            INSERT INTO users (username, email, password_hash, is_verified)
                            VALUES (%s, %s, %s, TRUE)
                            RETURNING id
                        """, (
                            registration_data['username'],
                            registration_data['email'],
                            generate_password_hash(registration_data['password'])
                        ))
                        user_id = cur.fetchone()[0]
                        conn.commit()
                        
                        # Clear the pending registration data from session
                        session.pop('pending_registration', None)
                        
                        flash('Registration successful! You can now login.', 'success')
                        return redirect(url_for('auth.login'))
                        
            except Exception as e:
                flash(f'Error completing registration: {str(e)}', 'error')
                return redirect(url_for('auth.verify_email'))
        else:
            flash('Invalid verification code', 'error')
            return redirect(url_for('auth.verify_email'))
            
    return render_template('verify_email.html', email=registration_data['email'])

@auth.route('/resend-verification')
def resend_verification():
    registration_data = session.get('pending_registration')
    if not registration_data:
        flash('Please register first', 'error')
        return redirect(url_for('auth.register'))
        
    try:
        # Generate new verification code
        new_verification_code = generate_verification_code()
        
        # Update verification code in session
        registration_data['verification_code'] = new_verification_code
        session['pending_registration'] = registration_data
        
        # Send new verification email
        if send_verification_email(registration_data['email'], new_verification_code):
            flash('New verification code sent! Please check your email.', 'success')
        else:
            flash('Error sending verification email. Please try again.', 'error')
            
    except Exception as e:
        flash(f'Error resending verification: {str(e)}', 'error')
        
    return redirect(url_for('auth.verify_email'))

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        try:
            print('[Login] POST received')
        except Exception:
            pass
        # Allow login by username OR email; trim whitespace
        identifier = (request.form.get('username') or '').strip()
        password = (request.form.get('password') or '').strip()
        
        if not identifier or not password:
            flash('All fields are required', 'error')
            try:
                print('[Login] Missing identifier or password')
            except Exception:
                pass
            return redirect(url_for('auth.login'))
        
        try:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    # Match by exact username OR case-insensitive email
                    cur.execute("""
                        SELECT id, password_hash, is_verified 
                        FROM users 
                        WHERE username = %s OR LOWER(email) = LOWER(%s)
                    """, (identifier, identifier))
                    user = cur.fetchone()
                    try:
                        print(f"[Login] Lookup for '{identifier}' -> {'found' if user else 'not found'}")
                    except Exception:
                        pass
                    
                    if user and check_password_hash(user[1], password):
                        if not user[2]:  # if not verified
                            flash('Please verify your email first', 'error')
                            try:
                                print('[Login] User not verified')
                            except Exception:
                                pass
                            return redirect(url_for('auth.login'))
                        
                        session['user_id'] = user[0]
                        # Preserve what user typed as their handle for greeting
                        session['username'] = identifier
                        flash('Logged in successfully!', 'success')
                        try:
                            print('[Login] Success')
                        except Exception:
                            pass
                        return redirect(url_for('index'))  # Changed from main.index to index
                    else:
                        flash('Invalid username or password', 'error')
                        try:
                            print('[Login] Invalid credentials')
                        except Exception:
                            pass
                        return redirect(url_for('auth.login'))
                        
        except Exception as e:
            flash(f'Error during login: {str(e)}', 'error')
            return redirect(url_for('auth.login'))
            
    return render_template('login.html')

@auth.route('/login/google')
def login_google():
    # Start Google OAuth flow
    # Allow overriding base URL if not running on localhost
    public_base = os.getenv('PUBLIC_BASE_URL')
    if public_base:
        # Force exact redirect uri using PUBLIC_BASE_URL
        redirect_uri = f"{public_base.rstrip('/')}/auth/google/callback"
    else:
        redirect_uri = url_for('auth.google_callback', _external=True)
    # Debug print for troubleshooting redirect_uri_mismatch
    try:
        print(f"[Google OAuth] Using redirect_uri: {redirect_uri}")
    except Exception:
        pass
    return google.authorize_redirect(redirect_uri)

@auth.route('/auth/google/callback')
def google_callback():
    try:
        # Surface Google errors explicitly
        if request.args.get('error'):
            err = request.args.get('error')
            desc = request.args.get('error_description') or 'No description provided'
            flash(f'Google login failed: {err}: {desc}', 'error')
            return redirect(url_for('auth.login'))

        token = google.authorize_access_token()
        # Fetch userinfo using discovered endpoint
        resp = google.get('userinfo')
        if resp.status_code != 200:
            try:
                details = resp.json()
            except Exception:
                details = resp.text
            flash(f'Google login failed: userinfo error {resp.status_code}: {details}', 'error')
            return redirect(url_for('auth.login'))
        userinfo = resp.json()
        # Support both Google APIs (id) and OIDC (sub)
        google_id = userinfo.get('id') or userinfo.get('sub')
        # Email can be in 'email' (OIDC) or nested arrays in old APIs
        email = userinfo.get('email')
        if not email and isinstance(userinfo.get('emails'), list) and userinfo['emails']:
            email = userinfo['emails'][0].get('value')
        # Name fallbacks
        name = userinfo.get('name') or (
            (userinfo.get('given_name') or '') + ' ' + (userinfo.get('family_name') or '')
        ).strip()
        if not name and email:
            name = email.split('@')[0]

        if not google_id or not email:
            flash('Google authentication failed: missing id or email', 'error')
            return redirect(url_for('auth.login'))

        with get_connection() as conn:
            with conn.cursor() as cur:
                # Ensure google_id column exists (safe no-op if already added)
                try:
                    cur.execute("""
                        ALTER TABLE users
                        ADD COLUMN IF NOT EXISTS google_id VARCHAR(64) UNIQUE
                    """)
                    conn.commit()
                except Exception:
                    conn.rollback()

                # Look up by google_id first
                cur.execute("""
                    SELECT id, username FROM users WHERE google_id = %s
                """, (google_id,))
                row = cur.fetchone()

                if not row:
                    # If not found by google_id, try existing email to link account
                    cur.execute("""
                        SELECT id, username FROM users WHERE email = %s
                    """, (email,))
                    row = cur.fetchone()
                    if row:
                        # Link google_id to existing user
                        cur.execute("""
                            UPDATE users SET google_id = %s, is_verified = TRUE WHERE id = %s
                        """, (google_id, row[0]))
                        conn.commit()
                    else:
                        # Create new user
                        username = name
                        # Ensure username is unique
                        cur.execute("SELECT 1 FROM users WHERE username = %s", (username,))
                        if cur.fetchone():
                            base = username
                            suffix = 1
                            while True:
                                candidate = f"{base}{suffix}"
                                cur.execute("SELECT 1 FROM users WHERE username = %s", (candidate,))
                                if not cur.fetchone():
                                    username = candidate
                                    break
                                suffix += 1
                        cur.execute("""
                            INSERT INTO users (username, email, password_hash, is_verified, google_id)
                            VALUES (%s, %s, %s, TRUE, %s)
                            RETURNING id
                        """, (username, email, generate_password_hash(os.urandom(16).hex()), google_id))
                        user_id = cur.fetchone()[0]
                        conn.commit()
                        row = (user_id, username)

                # Log the user in
                session['user_id'] = row[0]
                session['username'] = row[1]
                flash('Logged in with Google!', 'success')
                return redirect(url_for('index'))
    except Exception as e:
        # Print full details to console for debugging
        try:
            import traceback
            print('[Google OAuth] Exception in callback:', e)
            traceback.print_exc()
        except Exception:
            pass
        flash(f'Google login failed: {str(e)}', 'error')
        return redirect(url_for('auth.login'))

@auth.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'success')
    return redirect(url_for('auth.login')) 