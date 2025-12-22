from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, validators
import re

class RegistrationForm(FlaskForm):
    """Form for user registration with validation"""
    username = StringField('Username', [
        validators.DataRequired(message='Username is required'),
        validators.Length(min=3, max=50, message='Username must be between 3 and 50 characters'),
        validators.Regexp(
            r'^[a-zA-Z0-9_]+$',
            message='Username can only contain letters, numbers, and underscores'
        )
    ])
    
    email = StringField('Email', [
        validators.DataRequired(message='Email is required'),
        validators.Email(message='Please enter a valid email address'),
        validators.Length(max=100, message='Email must be less than 100 characters')
    ])
    
    password = PasswordField('Password', [
        validators.DataRequired(message='Password is required'),
        validators.Length(min=8, max=128, message='Password must be between 8 and 128 characters'),
        validators.Regexp(
            r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
            message='Password must contain at least one uppercase letter, one lowercase letter, and one number'
        )
    ])

class LoginForm(FlaskForm):
    """Form for user login with validation"""
    username = StringField('Username or Email', [
        validators.DataRequired(message='Username or email is required'),
        validators.Length(min=1, max=100, message='Input must be between 1 and 100 characters')
    ])
    
    password = PasswordField('Password', [
        validators.DataRequired(message='Password is required'),
        validators.Length(min=1, max=128, message='Password is required')
    ])

class VerificationForm(FlaskForm):
    """Form for email verification code"""
    verification_code = StringField('Verification Code', [
        validators.DataRequired(message='Verification code is required'),
        validators.Length(min=6, max=6, message='Verification code must be 6 digits'),
        validators.Regexp(r'^\d{6}$', message='Verification code must be 6 digits')
    ])

