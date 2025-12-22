# Rate Limiting and Input Validation Implementation

## ✅ Rate Limiting

### Implementation
- **Flask-Limiter** added to `requirements.txt`
- Rate limiter initialized in `app.py` with default limits:
  - **200 requests per day** per IP
  - **50 requests per hour** per IP

### Rate Limits Applied

#### Authentication Endpoints:
- **Registration**: `5 per minute`
- **Login**: `5 per minute`
- **Email Verification**: `10 per minute`
- **Resend Verification**: `3 per hour`

#### API Endpoints:
- **Get MCQs by Subject**: `100 per hour`
- **Get MCQs by Exam**: `100 per hour`
- **Mock Test MCQs**: `10 per hour` (more restrictive due to resource intensity)
- **Gemini Explanation**: `50 per hour`

### Configuration
- Uses IP address for rate limiting (`get_remote_address`)
- Optional Redis support via `REDIS_URL` environment variable for distributed rate limiting
- Rate limit headers enabled for client awareness

## ✅ Input Validation

### Implementation
- **WTForms** used for form validation (already installed via Flask-WTF)
- Created `forms.py` with three form classes:
  1. `RegistrationForm`
  2. `LoginForm`
  3. `VerificationForm`

### Validation Rules

#### Registration Form:
- **Username**:
  - Required
  - 3-50 characters
  - Only letters, numbers, and underscores
- **Email**:
  - Required
  - Valid email format
  - Max 100 characters
- **Password**:
  - Required
  - 8-128 characters
  - Must contain:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number

#### Login Form:
- **Username/Email**:
  - Required
  - 1-100 characters
- **Password**:
  - Required
  - 1-128 characters

#### Verification Form:
- **Verification Code**:
  - Required
  - Exactly 6 digits
  - Numeric only

### Template Updates
- All authentication templates updated to use WTForms:
  - `templates/register.html`
  - `templates/login.html`
  - `templates/verify_email.html`
- Error messages displayed inline below form fields
- CSS styling added for error messages (`.error-message`)

## 🔒 Security Benefits

1. **Rate Limiting**:
   - Prevents brute force attacks on login/registration
   - Protects API endpoints from abuse
   - Reduces server load from excessive requests

2. **Input Validation**:
   - Prevents invalid data from entering the system
   - Enforces password strength requirements
   - Validates email format
   - Prevents SQL injection (in combination with parameterized queries)
   - Prevents XSS attacks (in combination with HTML escaping)

## 📝 Usage

### Rate Limiting
Rate limiting is automatic. When a user exceeds the limit, they will receive a `429 Too Many Requests` response.

### Input Validation
Validation happens automatically when forms are submitted. Errors are displayed to users with helpful messages.

## 🚀 Production Notes

1. **Redis (Optional)**: For distributed rate limiting across multiple servers, set `REDIS_URL` environment variable
2. **Rate Limit Headers**: Clients can check rate limit status via response headers:
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`
3. **Error Handling**: Rate limit errors return HTTP 429 with a JSON error message

## 📋 Testing

To test rate limiting:
```bash
# Try logging in more than 5 times per minute
# You should receive a 429 error after the 5th attempt
```

To test validation:
- Try registering with invalid username (special characters)
- Try registering with weak password (no uppercase/number)
- Try registering with invalid email format
- All should show validation errors

