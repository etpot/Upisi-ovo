import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,30}$")


class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = value.strip()
        if not USERNAME_RE.match(value):
            raise ValueError(
                "Korisničko ime sme da sadrži samo slova, brojeve, . _ - "
                "(3–30 karaktera)."
            )
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not EMAIL_RE.match(value):
            raise ValueError("Neispravan format email adrese.")
        return value


class UserLogin(BaseModel):
    # Accepts either a username or an email address.
    identifier: str = Field(min_length=1, max_length=320)
    password: str

    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, value: str) -> str:
        return value.strip()


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    provider: str
