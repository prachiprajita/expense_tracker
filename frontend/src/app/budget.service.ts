import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Budget, Expense } from './models';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000/api';

  getBudget(month: string) {
    return this.http.get<Budget>(`${this.baseUrl}/budgets/${month}`);
  }

  createBudget(payload: {
    month: string;
    total_income: number;
    categories: { name: string; limit: number }[];
  }) {
    return this.http.post<Budget>(`${this.baseUrl}/budgets`, payload);
  }

  getExpenses(month: string) {
    return this.http.get<Expense[]>(
      `${this.baseUrl}/expenses?month=${month}`
    );
  }

  addExpense(payload: {
    category_id: number;
    amount: number;
    description: string;
    date: string;
  }) {
    return this.http.post<Expense>(
      `${this.baseUrl}/expenses`,
      payload
    );
  }

  deleteExpense(id: number) {
    return this.http.delete(`${this.baseUrl}/expenses/${id}`);
  }

  resetBudget(month: string) {
    console.log(month);
    return this.http.delete(
      `${this.baseUrl}/budgets/${month}`
    );
  }
  addCategory(month: string,category: { name: string; limit: number }) {
    return this.http.post<Budget>(
      `${this.baseUrl}/budgets/${month}/categories`,
      category
    );
  }
}
