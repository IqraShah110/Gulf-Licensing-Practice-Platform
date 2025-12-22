# Google OAuth Setup Guide

## Error: redirect_uri_mismatch

This error occurs when the redirect URI used in the OAuth request doesn't match what's configured in Google Cloud Console.

## How to Fix

### Step 1: Check Your Current Redirect URI

The application will print the redirect URI it's using. Check your console/logs for:
```
[Google OAuth] Using redirect_uri: http://localhost:5000/auth/google/callback
```

### Step 2: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add the EXACT redirect URI from Step 1

### Step 3: Common Redirect URIs

**For Local Development:**
```
http://localhost:5000/auth/google/callback
```

**For Production (if PUBLIC_BASE_URL is set):**
```
https://yourdomain.com/auth/google/callback
```

### Step 4: Important Notes

- ✅ The redirect URI must match **EXACTLY** (including http vs https, port numbers, trailing slashes)
- ✅ For localhost, use `http://localhost:5000` (not `127.0.0.1`)
- ✅ No trailing slash at the end
- ✅ Case-sensitive
- ✅ Must include the full path: `/auth/google/callback`

### Step 5: Environment Variables

Make sure your `.env` file has:

**For Local Development:**
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
# Don't set PUBLIC_BASE_URL for localhost
```

**For Production:**
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
PUBLIC_BASE_URL=https://yourdomain.com
```

### Step 6: Multiple Redirect URIs

You can add multiple redirect URIs in Google Cloud Console:
- `http://localhost:5000/auth/google/callback` (for development)
- `https://yourdomain.com/auth/google/callback` (for production)

### Troubleshooting

1. **Check the exact redirect URI in logs** - The app prints it when you click "Continue with Google"
2. **Verify in Google Console** - Make sure the URI matches character-for-character
3. **Clear browser cache** - Sometimes cached OAuth state causes issues
4. **Check HTTP vs HTTPS** - Must match exactly
5. **Check port numbers** - Must match exactly (e.g., `:5000`)

### Testing

After adding the redirect URI:
1. Wait a few minutes for Google to update (can take 1-5 minutes)
2. Clear your browser cache
3. Try logging in with Google again

