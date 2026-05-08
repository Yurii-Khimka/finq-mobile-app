import uuid
from decimal import Decimal

from sqlalchemy import String, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Envelope(Base):
    __tablename__ = "envelopes"
    __table_args__ = (UniqueConstraint("user_id", "name"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))

    user: Mapped["User"] = relationship(back_populates="envelopes")
