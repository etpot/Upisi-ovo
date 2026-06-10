"""Authlib OAuth client registry for social login.

Providers register only when their client id/secret are configured, so the
rest of the app works fine with social login simply switched off.
"""

from authlib.integrations.starlette_client import OAuth

from src.features.auth import config

oauth = OAuth()

if config.google_enabled():
    oauth.register(
        name="google",
        client_id=config.GOOGLE_CLIENT_ID,
        client_secret=config.GOOGLE_CLIENT_SECRET,
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

if config.facebook_enabled():
    oauth.register(
        name="facebook",
        client_id=config.FACEBOOK_CLIENT_ID,
        client_secret=config.FACEBOOK_CLIENT_SECRET,
        access_token_url="https://graph.facebook.com/v18.0/oauth/access_token",
        authorize_url="https://www.facebook.com/v18.0/dialog/oauth",
        api_base_url="https://graph.facebook.com/v18.0/",
        client_kwargs={"scope": "email public_profile"},
    )
