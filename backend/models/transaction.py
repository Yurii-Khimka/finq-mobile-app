import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(8), primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    amount_uah: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    original_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    original_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    envelope: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False, default="OK")

    user: Mapped["User"] = relationship(back_populates="transactions")
