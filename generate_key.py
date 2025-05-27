import secrets

# Generate a secure random key
secret_key = secrets.token_hex(32)
print(f"SECRET_KEY={secret_key}")
print(f"CSRF_SECRET_KEY={secrets.token_hex(32)}") 