from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from db_handler import get_connection
import os
from functools import wraps
from email_handler import mail, generate_verification_code, send_verification_email

auth = Blueprint('auth', __name__)

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
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('All fields are required', 'error')
            return redirect(url_for('auth.login'))
        
        try:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id, password_hash, is_verified 
                        FROM users 
                        WHERE username = %s
                    """, (username,))
                    user = cur.fetchone()
                    
                    if user and check_password_hash(user[1], password):
                        if not user[2]:  # if not verified
                            flash('Please verify your email first', 'error')
                            return redirect(url_for('auth.login'))
                        
                        session['user_id'] = user[0]
                        session['username'] = username  # Store username in session
                        flash('Logged in successfully!', 'success')
                        return redirect(url_for('index'))  # Changed from main.index to index
                    else:
                        flash('Invalid username or password', 'error')
                        return redirect(url_for('auth.login'))
                        
        except Exception as e:
            flash(f'Error during login: {str(e)}', 'error')
            return redirect(url_for('auth.login'))
            
    return render_template('login.html')

@auth.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out', 'success')
    return redirect(url_for('auth.login')) 