from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from backend.config import DATABASE_URL

engine = create_engine(DATABASE_URL) if DATABASE_URL else None
SessionLocal = sessionmaker(bind=engine) if engine else None


class Base(DeclarativeBase):
    pass
