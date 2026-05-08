from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.database import get_db
from backend.models.config import UserConfig
from backend.models.envelope import Envelope
from backend.models.user import User
from backend.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter()

DEFAULT_ENVELOPES = [
    ("mandatory", Decimal("50")),
    ("non_mandatory", Decimal("30")),
    ("investments", Decimal("10")),
    ("dreams", Decimal("10")),
]


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(email=body.email, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()

    for name, percentage in DEFAULT_ENVELOPES:
        db.add(Envelope(user_id=user.id, name=name, percentage=percentage))

    db.add(UserConfig(user_id=user.id, base_currency="UAH"))
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": str(current_user.id), "email": current_user.email}
