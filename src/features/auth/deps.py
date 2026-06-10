from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.features.auth import config, crud_auth, security
from src.features.auth.models_auth import User
from src.store.database import get_db


def get_current_user(
    session_token: str | None = Cookie(
        default=None, alias=config.SESSION_COOKIE_NAME
    ),
    db: Session = Depends(get_db),
) -> User:
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Niste prijavljeni."
        )

    user_id = security.decode_session_token(session_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesija je istekla ili nije validna.",
        )

    user = crud_auth.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Korisnik ne postoji."
        )
    return user
