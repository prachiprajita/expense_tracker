from datetime import date
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    limit: Decimal = Field(ge=0)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    limit: Decimal
    spent: Decimal
    remaining: Decimal


class BudgetCreate(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    total_income: Decimal = Field(ge=0)
    categories: list[CategoryCreate]


class BudgetOut(BaseModel):
    id: int
    month: str
    total_income: Decimal
    total_budget: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    categories: list[CategoryOut]
    savings : Decimal


class ExpenseCreate(BaseModel):
    category_id: int
    amount: Decimal = Field(gt=0)
    description: str = Field(min_length=1, max_length=255)
    date: date


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    amount: Decimal
    description: str
    date: date
