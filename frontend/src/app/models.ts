export interface Category {
  id: number;
  name: string;
  limit: number;
  spent: number;
  remaining: number;
}

export interface Budget {
  id: number;
  month: string;
  total_income: number;
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  categories: Category[];
  savings:number
}

export interface Expense {
  id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string;
}
