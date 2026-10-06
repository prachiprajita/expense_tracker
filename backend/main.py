from decimal import Decimal
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Budget, BudgetCategory, Expense
from schemas import (
    BudgetCreate,
    BudgetOut,
    CategoryOut,
    ExpenseCreate,
    ExpenseOut,
    CategoryCreate
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SpendWise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "https://paisakahan.netlify.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def category_summary(category: BudgetCategory, db: Session) -> CategoryOut:
    spent = sum(
        (expense.amount for expense in category.expenses),
        Decimal("0"),
    )
    return CategoryOut(
        id=category.id,
        name=category.name,
        limit=category.limit,
        spent=spent,
        remaining=category.limit - spent,
    )


def budget_summary(budget: Budget, db: Session) -> BudgetOut:
    categories = [
        category_summary(category, db)
        for category in budget.categories
    ]
    total_budget = sum((c.limit for c in categories), Decimal("0"))
    total_spent = sum((c.spent for c in categories), Decimal("0"))

    return BudgetOut(
        id=budget.id,
        month=budget.month,
        total_income=budget.total_income,
        total_budget=total_budget,
        total_spent=total_spent,
        total_remaining=total_budget - total_spent,
        savings=  budget.total_income - total_budget,
        categories=categories,
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/budgets", response_model=BudgetOut)
def create_budget(payload: BudgetCreate, db: Session = Depends(get_db)):
    existing = db.scalar(
        select(Budget).where(Budget.month == payload.month)
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A budget already exists for this month.",
        )

    budget = Budget(
        month=payload.month,
        total_income=payload.total_income,
    )

    for category in payload.categories:
        budget.categories.append(
            BudgetCategory(
                name=category.name,
                limit=category.limit,
            )
        )

    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget_summary(budget, db)


@app.get("/api/budgets/{month}", response_model=BudgetOut)
def get_budget(month: str, db: Session = Depends(get_db)):
    budget = db.scalar(select(Budget).where(Budget.month == month))

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found.")

    return budget_summary(budget, db)


@app.post("/api/expenses", response_model=ExpenseOut)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    category = db.get(BudgetCategory, payload.category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    expense = Expense(
        category_id=payload.category_id,
        amount=payload.amount,
        description=payload.description,
        date=payload.date,
    )

    db.add(expense)
    db.commit()
    db.refresh(expense)

    return expense


@app.get("/api/expenses", response_model=list[ExpenseOut])
def get_expenses(month: str | None = None, db: Session = Depends(get_db)):
    query = select(Expense).order_by(Expense.date.desc(), Expense.id.desc())

    if month:
        query = query.where(
            Expense.date >= f"{month}-01",
            Expense.date < f"{month}-32",
        )

    return list(db.scalars(query).all())


@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    expense = db.get(Expense, expense_id)

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")

    db.delete(expense)
    db.commit()

    return {"message": "Expense deleted."}


@app.delete("/api/budgets/{month}")
def reset_budget(month: str, db: Session = Depends(get_db)):
    budget = db.scalar(
        select(Budget).where(Budget.month == month)
    )

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found."
        )

    # Delete expenses belonging to this budget's categories
    for category in budget.categories:
        for expense in category.expenses:
            db.delete(expense)

    # Delete the budget.
    # Because of cascade="all, delete-orphan",
    # its categories will also be deleted.
    db.delete(budget)
    db.commit()

    return {"message": f"Budget for {month} has been reset."}


@app.post("/api/budgets/{month}/categories", response_model=BudgetOut)
def add_category(
    month: str,
    payload: CategoryCreate,
    db: Session = Depends(get_db)
):
    budget = db.scalar(
        select(Budget).where(Budget.month == month)
    )

    if not budget:
        raise HTTPException(
            status_code=404,
            detail="Budget not found."
        )

    current_total = sum(
        (category.limit for category in budget.categories),
        Decimal("0")
    )

    new_total = current_total + payload.limit

    if new_total > budget.total_income:
        difference = new_total - budget.total_income

        raise HTTPException(
            status_code=400,
            detail=f"Category budgets exceed your income by ₹{difference}."
        )

    category = BudgetCategory(
        name=payload.name,
        limit=payload.limit
    )

    budget.categories.append(category)

    db.commit()
    db.refresh(budget)

    return budget_summary(budget, db)

@app.get("/api/debug/expenses")
def debug_expenses(db: Session = Depends(get_db)):
    expenses = db.query(Expense).all()

    return [
        {
            "id": expense.id,
            "amount": str(expense.amount),
            "description": expense.description
        }
        for expense in expenses
    ]
