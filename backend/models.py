from datetime import date
from decimal import Decimal
from sqlalchemy import Date, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    month: Mapped[str] = mapped_column(String(7), index=True)  # YYYY-MM
    total_income: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    categories: Mapped[list["BudgetCategory"]] = relationship(
        back_populates="budget",
        cascade="all, delete-orphan",
    )


class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    budget_id: Mapped[int] = mapped_column(ForeignKey("budgets.id"))
    name: Mapped[str] = mapped_column(String(100))
    limit: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)

    budget: Mapped["Budget"] = relationship(back_populates="categories")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="category")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("budget_categories.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    description: Mapped[str] = mapped_column(String(255))
    date: Mapped[date] = mapped_column(Date)

    category: Mapped["BudgetCategory"] = relationship(back_populates="expenses")
