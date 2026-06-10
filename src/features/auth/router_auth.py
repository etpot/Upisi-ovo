from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from src.features.auth import config, crud_auth, schemas_auth, security
from src.features.auth.deps import get_current_user
from src.features.auth.models_auth import User
from src.features.auth.oauth import oauth
from src.store.database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        key=config.SESSION_COOKIE_NAME,
        value=security.create_session_token(user_id),
        max_age=config.SESSION_MAX_AGE,
        httponly=True,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,
        path="/",
    )


@router.post(
    "/register",
    response_model=schemas_auth.UserRead,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: schemas_auth.UserRegister,
    response: Response,
    db: Session = Depends(get_db),
):
    if crud_auth.get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nalog sa ovom email adresom već postoji.",
        )

    user = crud_auth.create_user(
        db,
        email=payload.email,
        hashed_password=security.hash_password(payload.password),
        full_name=payload.full_name,
        provider="local",
    )
    _set_session_cookie(response, user.id)
    return user


@router.post("/login", response_model=schemas_auth.UserRead)
def login(
    payload: schemas_auth.UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    user = crud_auth.get_user_by_email(db, payload.email)
    if not user or not security.verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pogrešan email ili lozinka.",
        )
    _set_session_cookie(response, user.id)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(config.SESSION_COOKIE_NAME, path="/")


@router.get("/me", response_model=schemas_auth.UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/providers")
def providers():
    """Lets the frontend know which social buttons to show."""
    return {"google": config.google_enabled(), "facebook": config.facebook_enabled()}


# ─── Social login (OAuth) ───────────────────────────────────────────

_SUPPORTED_PROVIDERS = ("google", "facebook")


@router.get("/{provider}/login")
async def oauth_login(provider: str, request: Request):
    if provider not in _SUPPORTED_PROVIDERS or not config.provider_enabled(provider):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prijava preko '{provider}' trenutno nije konfigurisana.",
        )
    client = oauth.create_client(provider)
    redirect_uri = str(request.url_for("oauth_callback", provider=provider))
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/{provider}/callback", name="oauth_callback")
async def oauth_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    if provider not in _SUPPORTED_PROVIDERS or not config.provider_enabled(provider):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    client = oauth.create_client(provider)
    token = await client.authorize_access_token(request)

    email = None
    name = None
    if provider == "google":
        info = token.get("userinfo")
        if not info:
            info = await client.userinfo(token=token)
        email = info.get("email")
        name = info.get("name")
    else:  # facebook
        resp = await client.get("me?fields=id,name,email", token=token)
        info = resp.json()
        email = info.get("email")
        name = info.get("name")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provajder nije vratio email adresu.",
        )

    email = email.strip().lower()
    user = crud_auth.get_user_by_email(db, email)
    if not user:
        user = crud_auth.create_user(
            db, email=email, hashed_password=None, full_name=name, provider=provider
        )

    redirect = RedirectResponse(url=config.FRONTEND_URL)
    _set_session_cookie(redirect, user.id)
    return redirect
