# Environment Variables Required for Production

## Required Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Flask Configuration
SECRET_KEY=your-strong-random-secret-key-here
CSRF_SECRET_KEY=your-strong-random-csrf-secret-key-here
FLASK_DEBUG=False
FLASK_ENV=production

# Database Configuration
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-strong-database-password
DB_SSLMODE=require
# OR use DATABASE_URL instead:
# DATABASE_URL=postgresql://user:password@host:port/dbname

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Email Configuration (Gmail)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password
MAIL_DEFAULT_SENDER=your-email@gmail.com

# Application URL (Production)
PUBLIC_BASE_URL=https://yourdomain.com

# Server Configuration (Optional)
PORT=5000
```

## Generating Secure Keys

### Generate SECRET_KEY and CSRF_SECRET_KEY:
```python
import secrets
print(secrets.token_hex(32))
```

Or using command line:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Important Notes

1. **Never commit `.env` file to version control** - It's already in `.gitignore`
2. **Use different keys for development and production**
3. **Rotate keys periodically** (especially if compromised)
4. **Use strong passwords** for database (minimum 16 characters, mix of letters, numbers, symbols)
5. **For Gmail**, use an "App Password" instead of your regular password:
   - Go to Google Account > Security > 2-Step Verification > App passwords
   - Generate a password for "Mail"

## Production Checklist

- [ ] All environment variables set
- [ ] SECRET_KEY is strong and random
- [ ] CSRF_SECRET_KEY is strong and random
- [ ] Database password is strong
- [ ] FLASK_DEBUG=False
- [ ] FLASK_ENV=production
- [ ] PUBLIC_BASE_URL set to production domain
- [ ] Google OAuth redirect URI matches production URL
- [ ] Email credentials configured
- [ ] GEMINI_API_KEY configured

