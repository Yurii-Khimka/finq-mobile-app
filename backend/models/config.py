import uuid

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class UserConfig(Base):
    __tablename__ = "user_config"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="UAH")

    user: Mapped["User"] = relationship(back_populates="config")
