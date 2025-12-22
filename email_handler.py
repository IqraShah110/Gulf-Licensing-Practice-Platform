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
            'Verify Your Email - GulfCertify',
            sender=current_app.config['MAIL_DEFAULT_SENDER'],
            recipients=[email]
        )
        
        msg.body = f"""
        Welcome to GulfCertify!
        
        Your verification code is: {verification_code}
        
        Please enter this code to verify your email address.
        
        If you didn't request this verification, please ignore this email.
        
        Best Regards,
        GulfCertify
        """
        
        msg.html = f"""
        <h2>Welcome to GulfCertify!</h2>
        <p>Your verification code is: <strong>{verification_code}</strong></p>
        <p>Please enter this code to verify your email address.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <br>
        <p>Best Regards,<br>GulfCertify</p>
        """
        
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending verification email: {str(e)}")
        return False 