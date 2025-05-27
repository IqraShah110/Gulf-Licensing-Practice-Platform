from flask_mail import Mail, Message
from flask import current_app
import random
import string

# Initialize Flask-Mail
mail = Mail()

def generate_verification_code():
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

def send_verification_email(email, verification_code):
    """Send verification email to user"""
    try:
        msg = Message(
            'Verify Your Email - Gulf Licensing Prep',
            sender=current_app.config['MAIL_DEFAULT_SENDER'],
            recipients=[email]
        )
        
        msg.body = f"""
        Welcome to Gulf Licensing Prep!
        
        Your verification code is: {verification_code}
        
        Please enter this code to verify your email address.
        
        If you didn't request this verification, please ignore this email.
        
        Best regards,
        Gulf Licensing Prep Team
        """
        
        msg.html = f"""
        <h2>Welcome to Gulf Licensing Prep!</h2>
        <p>Your verification code is: <strong>{verification_code}</strong></p>
        <p>Please enter this code to verify your email address.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <br>
        <p>Best regards,<br>Gulf Licensing Prep Team</p>
        """
        
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending verification email: {str(e)}")
        return False 