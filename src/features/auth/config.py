"""Auth configuration, read from the environment with safe local-dev defaults.

For production set at minimum UPISIOVO_SECRET_KEY and UPISIOVO_COOKIE_SECURE=1.
Social login activates automatically once the matching client id/secret are set.
"""

import os

# Secret used to sign session JWTs and the OAuth state session. MUST be stable
# across restarts (otherwise everyone is logged out) and secret in production.
SECRET_KEY = os.environ.get(
    "UPISIOVO_SECRET_KEY", "dev-insecure-change-me-3f9a17c0b8e24d6f"
)

JWT_ALGORITHM = "HS256"

SESSION_COOKIE_NAME = "upisiovo_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 7  # 7 days, in seconds

# Secure cookies require HTTPS, so they are off for http://127.0.0.1 dev.
# Set UPISIOVO_COOKIE_SECURE=1 when serving over HTTPS in production.
COOKIE_SECURE = os.environ.get("UPISIOVO_COOKIE_SECURE", "0") == "1"
COOKIE_SAMESITE = os.environ.get("UPISIOVO_COOKIE_SAMESITE", "lax")

# Where to send the browser after a social-login round trip.
FRONTEND_URL = os.environ.get(
    "UPISIOVO_FRONTEND_URL", "http://127.0.0.1:5500/src/pages/index.html"
)
LOGIN_URL = os.environ.get(
    "UPISIOVO_LOGIN_URL", "http://127.0.0.1:5500/src/pages/login.html"
)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
FACEBOOK_CLIENT_ID = os.environ.get("FACEBOOK_CLIENT_ID", "")
FACEBOOK_CLIENT_SECRET = os.environ.get("FACEBOOK_CLIENT_SECRET", "")


def google_enabled() -> bool:
    return bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)


def facebook_enabled() -> bool:
    return bool(FACEBOOK_CLIENT_ID and FACEBOOK_CLIENT_SECRET)


def provider_enabled(provider: str) -> bool:
    return {"google": google_enabled(), "facebook": facebook_enabled()}.get(
        provider, False
    )
