from flask import Blueprint, render_template, request, redirect, url_for, flash, session, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from db_handler import get_connection
import os
from functools import wraps
from email_handler import mail, generate_verification_code, send_verification_email
from authlib.integrations.flask_client import OAuth
from forms import RegistrationForm, LoginForm, VerificationForm

auth = Blueprint('auth', __name__)

# Limiter will be set from app.py after blueprint registration
limiter = None

def apply_rate_limit(limit_str):
    """Helper to apply rate limiting if limiter is available"""
    def decorator(f):
        if limiter:
            return limiter.limit(limit_str)(f)
        return f
    return decorator

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
    
    # Print expected redirect URI for debugging
    try:
        public_base = os.getenv('PUBLIC_BASE_URL', '').strip()
        if public_base:
            expected_redirect = f"{public_base.rstrip('/')}/auth/google/callback"
        else:
            # Default to localhost for development
            expected_redirect = "http://localhost:5000/auth/google/callback"
        print(f"[Google OAuth] Expected redirect URI: {expected_redirect}")
        print(f"[Google OAuth] IMPORTANT: Add this EXACT URL to Google Cloud Console under 'Authorized redirect URIs'")
    except Exception:
        pass

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

@auth.route('/register', methods=['GET', 'POST'])
@apply_rate_limit("5 per minute")
def register():
    form = RegistrationForm()
    
    if request.method == 'POST':
        if form.validate_on_submit():
            username = form.username.data.strip()
            email = form.email.data.strip().lower()
            password = form.password.data
            
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
        else:
            # Form validation failed - show errors
            for field, errors in form.errors.items():
                for error in errors:
                    flash(f'{field}: {error}', 'error')
            
    return render_template('register.html', form=form)

@auth.route('/verify-email', methods=['GET', 'POST'])
@apply_rate_limit("10 per minute")
def verify_email():
    # Get registration data from session
    registration_data = session.get('pending_registration')
    if not registration_data:
        flash('Please register first', 'error')
        return redirect(url_for('auth.register'))
    
    form = VerificationForm()
        
    if request.method == 'POST':
        if form.validate_on_submit():
            verification_code = form.verification_code.data.strip()
            
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
        else:
            # Form validation failed
            for field, errors in form.errors.items():
                for error in errors:
                    flash(f'{error}', 'error')
            
    return render_template('verify_email.html', email=registration_data['email'], form=form)

@auth.route('/resend-verification')
@apply_rate_limit("3 per hour")
def resend_verification():
    # Rate limit: 3 resends per hour per IP
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    limiter = Limiter(
        app=current_app,
        key_func=get_remote_address
    )
    
    @limiter.limit("3 per hour")
    def _resend():
        pass
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
@apply_rate_limit("5 per minute")
def login():
    form = LoginForm()
    
    if request.method == 'POST':
        if form.validate_on_submit():
            # Allow login by username OR email; trim whitespace
            identifier = form.username.data.strip()
            password = form.password.data
            
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
                        
                        if user and check_password_hash(user[1], password):
                            if not user[2]:  # if not verified
                                flash('Please verify your email first', 'error')
                                return redirect(url_for('auth.login'))
                            
                            session['user_id'] = user[0]
                            # Preserve what user typed as their handle for greeting
                            session['username'] = identifier
                            return redirect(url_for('index'))
                        else:
                            flash('Invalid username or password', 'error')
                            return redirect(url_for('auth.login'))
                            
            except Exception as e:
                flash(f'Error during login: {str(e)}', 'error')
                return redirect(url_for('auth.login'))
        else:
            # Form validation failed
            for field, errors in form.errors.items():
                for error in errors:
                    flash(f'{error}', 'error')
            
    return render_template('login.html', form=form)

@auth.route('/login/google')
def login_google():
    # Start Google OAuth flow
    # Construct redirect URI - must match exactly what's in Google Cloud Console
    public_base = os.getenv('PUBLIC_BASE_URL', '').strip()
    
    if public_base:
        # Use PUBLIC_BASE_URL if provided (for production)
        # Remove trailing slash and ensure proper format
        base_url = public_base.rstrip('/')
        redirect_uri = f"{base_url}/auth/google/callback"
    else:
        # For localhost development
        # Use _external=True to get full URL, but ensure it matches Google Console
        redirect_uri = url_for('auth.google_callback', _external=True)
        # Normalize localhost URLs (127.0.0.1 vs localhost)
        if '127.0.0.1' in redirect_uri:
            redirect_uri = redirect_uri.replace('127.0.0.1', 'localhost')
        # Ensure no trailing slash
        redirect_uri = redirect_uri.rstrip('/')
    
    # Debug print for troubleshooting redirect_uri_mismatch
    try:
        print(f"[Google OAuth] Using redirect_uri: {redirect_uri}")
        print(f"[Google OAuth] Make sure this EXACT URL is in Google Cloud Console:")
        print(f"[Google OAuth]   Authorized redirect URIs: {redirect_uri}")
    except Exception:
        pass
    
    try:
        return google.authorize_redirect(redirect_uri)
    except Exception as e:
        flash(f'Error initiating Google login: {str(e)}', 'error')
        print(f"[Google OAuth] Error: {e}")
        return redirect(url_for('auth.login'))

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
                # Successful Google login – no need to show a success banner on the login screen
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