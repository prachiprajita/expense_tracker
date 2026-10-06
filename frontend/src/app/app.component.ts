import { CommonModule } from '@angular/common';
import { Component, inject, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BudgetService } from './budget.service';
import { Budget, Expense } from './models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private budgetService = inject(BudgetService);
  private zone = inject(NgZone);

  month = new Date().toISOString().slice(0, 7);
  budget: Budget | null = null;
  expenses: Expense[] = [];
  error = '';
  message = '';

  income :any;

  newCategoryName = '';
  newCategoryLimit = 0;
  draftCategories: { name: string; limit: number }[] = [];

  expenseCategoryId: number | null = null;
  expenseAmount = 0;
  expenseDescription = '';
  expenseDate = new Date().toISOString().slice(0, 10);
  showAddCategory = false;
  isListening = false;
  voiceText = '';

  private recognition: any;

  ngOnInit() {
    this.load();
  }

  load() {
    this.error = '';
    this.message = '';

    this.budgetService.getBudget(this.month).subscribe({
      next: budget => {
        this.budget = budget;
        console.log(budget);
        
        this.draftCategories = [];
        this.income=0;
        this.loadExpenses();
      },
      error: err => {
        if (err.status === 404) {
          this.budget = null;
          this.expenses = [];
          this.draftCategories = [];
          this.income=0;
        } else {
          this.showError('Could not connect to the backend.');
        }
      }
    });
  }

  loadExpenses() {
    this.budgetService.getExpenses(this.month).subscribe({
      next: expenses => this.expenses = expenses,
      error: () => this.showError('Could not load expenses.')
    });
  }

  addDraftCategory() {
    const name = this.newCategoryName.trim();

    if (!name || this.newCategoryLimit < 0) {
      return;
    }

    this.draftCategories.push({
      name,
      limit: Number(this.newCategoryLimit)
    });

    this.newCategoryName = '';
    this.newCategoryLimit = 0;
  }

  removeDraftCategory(index: number) {
    this.draftCategories.splice(index, 1);
  }

  createBudget() {
    this.error = '';

    if (!this.draftCategories.length) {
      this.showError('Add at least one category.');
      return;
    }

    const totalCategoryLimit = this.draftCategories.reduce(
      (total, category) => total + Number(category.limit),
      0
    );
    if (totalCategoryLimit > Number(this.income)) {
      const difference = totalCategoryLimit - Number(this.income);
  
      this.showError(`Category budgets exceed your income by ${this.currency(difference)}.`)
      return;
    }
    this.budgetService.createBudget({
      month: this.month,
      total_income: Number(this.income),
      categories: this.draftCategories
    }).subscribe({
      next: budget => {
        this.budget = budget;
        this.loadExpenses();
        this.message = 'Budget created.';
      },
      error: err => {
        this.showError(err.error?.detail ?? 'Could not create budget.');
      }
    });
  }

  addExpense() {
    this.error = '';

    if (!this.expenseCategoryId || this.expenseAmount <= 0) {
      this.showError('Select a category and enter an amount greater than zero.');
      return;
    }

    this.budgetService.addExpense({
      category_id: this.expenseCategoryId,
      amount: Number(this.expenseAmount),
      description: this.expenseDescription.trim() || 'Expense',
      date: this.expenseDate
    }).subscribe({
      next: () => {
        this.expenseAmount = 0;
        this.expenseDescription = '';
        this.load();
        this.showMessage('Expense added.');
      },
      error: err => {
        this.showError(err.error?.detail ?? 'Could not add expense.');
      }
    });
  }

  deleteExpense(id: number) {
    this.budgetService.deleteExpense(id).subscribe({
      next: () => {
        this.expenses = this.expenses.filter(expense => expense.id !== id);
  
        if (this.budget) {
          this.budget.total_spent = this.expenses.reduce(
            (total, expense) => total + Number(expense.amount),
            0
          );
  
          this.budget.total_remaining =
            this.budget.total_budget - this.budget.total_spent;
  
          this.budget.categories.forEach(category => {
            category.spent = this.expenses
              .filter(expense => expense.category_id === category.id)
              .reduce(
                (total, expense) => total + Number(expense.amount),
                0
              );
  
            category.remaining = category.limit - category.spent;
          });
        }
  
        this.showMessage('Expense deleted.');
      },
  
      error: () => {
        this.showError('Could not delete expense.');
      }
    });
  }

  categoryName(id: number) {
    return this.budget?.categories.find(c => c.id === id)?.name ?? 'Unknown';
  }

  percent(category: { limit: number; spent: number }) {
    if (category.limit <= 0) return 0;
    return Math.min(100, Math.round((category.spent / category.limit) * 100));
  }

  currency(value: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  }

  resetBudget() {
    const confirmed = window.confirm(
      'Are you sure you want to reset this budget? This will delete all categories and expenses for this month.'
    );
  
    if (!confirmed) {
      return;
    }
  
    this.budgetService.resetBudget(this.month).subscribe({
      next: () => {
        this.budget = null;
        this.expenses = [];
        this.draftCategories = [];
        this.income=0;
        this.newCategoryName = '';
        this.newCategoryLimit = 0;
  
        this,this.showMessage('Budget has been reset.');
      },
      error: (error) => {
        this.showError(error.error?.detail || 'Failed to reset budget.');
      }
    });
  }

  addCategoryToExistingBudget() {
    this.error = '';
    this.message = '';
  
    if (!this.budget) {
      this.showError('Create a budget first.');
      return;
    }
  
    const name = this.newCategoryName.trim();
    const limit = Number(this.newCategoryLimit);
  
    if (!name) {
      this.showError('Enter a category name.');
      return;
    }
  
    if (limit < 0) {
      this.showError('Category limit cannot be negative.');
      return;
    }
  
    this.budgetService.addCategory(this.month, {
      name,
      limit
    }).subscribe({
      next: budget => {
        this.budget = budget;        
        this.newCategoryName = '';
        this.newCategoryLimit = 0;
  
        this.showMessage('Category added successfully.');
  
        // Hide form after adding
        this.showAddCategory = false;
      },
      error: err => {
        this.showError(
          err.error?.detail ?? 'Could not add category.');
      }
    });
  }

  showMessage(text: string) {
    this.message = text;
  
    setTimeout(() => {
      this.message = '';
    }, 3000);
  }
  
  showError(text: string) {
    this.error = text;
  
    setTimeout(() => {
      this.error = '';
    }, 3000);
  }

  startVoiceExpense() {
    const browserWindow = window as any;
  
    const SpeechRecognition =
      browserWindow.SpeechRecognition ||
      browserWindow.webkitSpeechRecognition;
  
    if (!SpeechRecognition) {
      this.showError('Voice input is not supported in this browser.');
      return;
    }
  
    this.recognition = new SpeechRecognition();
  
    this.recognition.lang = 'en-IN';
    this.recognition.interimResults = false;
    this.recognition.continuous = false;
    this.recognition.maxAlternatives = 1;
  
    this.zone.run(() => {
      this.isListening = true;
      this.voiceText = '';
      this.error = '';
      this.message = '';
    });
  
    console.log('Starting voice recognition...');
  
    this.recognition.onresult = (event: any) => {
  
      const text = event.results[0][0].transcript;
  
      console.log('VOICE RESULT:', text);
  
      this.zone.run(() => {
  
        this.voiceText = text;
        this.isListening = false;
  
        console.log('Angular voiceText:', this.voiceText);
  
        this.processVoiceExpense(text);
        setTimeout(() => {
          this.zone.run(() => {
            this.voiceText = '';
          });
        }, 3000);
  
      });
    };
  
    this.recognition.onerror = (event: any) => {
  
      console.log('VOICE ERROR:', event.error);
  
      this.zone.run(() => {
  
        this.isListening = false;
  
        if (event.error === 'not-allowed') {
          this.showError('Microphone permission was denied.');
        } else {
          this.showError('Could not understand your voice.');
        }
  
      });
    };
  
    this.recognition.onend = () => {
  
      console.log('VOICE END');
  
      this.zone.run(() => {
        this.isListening = false;
      });
  
    };
  
    this.recognition.start();
  }

  processVoiceExpense(text: string) {

    console.log('Processing:', text);
    const amountMatch = text.match(
      /(?:₹|rs\.?|rupees?)?\s*(\d+(?:\.\d+)?)/i
    );
  
    if (!amountMatch) {
      this.showError(
        'Could not find the amount.'
      );
      return;
    }
  
    const amount = Number(amountMatch[1]);
    let categoryId: number | null = null;
  
    for (const category of this.budget?.categories ?? []) {  
      if (
        text.toLowerCase().includes(
          category.name.toLowerCase()
        )
      ) {
        categoryId = category.id;
        break;
      }
    } 
    const description = text
      .replace(/(?:₹|rs\.?|rupees?)?\s*\d+(?:\.\d+)?/i,'')
      .replace(/\b(i|spent|spend|paid|on|for|rupees|rs)\b/gi,'')
      .trim();
    this.expenseAmount = amount;
    this.expenseDescription = description || 'Voice Expense';  
    this.expenseCategoryId = categoryId;
  
    if (!categoryId) {
      this.showError(
        'Amount found, but category was not recognized. Please select the category.'
      );
      return;
    }
    this.budgetService.addExpense({
      category_id: categoryId,
      amount: amount,
      description: description || 'Voice Expense',
      date: this.expenseDate
    }).subscribe({
      next: (expense) => {

        this.zone.run(() => {
      
          console.log('Expense saved:', expense);
      
          this.expenses = [expense, ...this.expenses];
      
          if (this.budget) {
            this.budget.total_spent += amount;
            this.budget.total_remaining -= amount;
      
            const category = this.budget.categories.find(
              c => c.id === categoryId
            );
      
            if (category) {
              category.spent += amount;
              category.remaining -= amount;
            }
          }
      
          this.expenseAmount = 0;
          this.expenseDescription = '';
          this.expenseCategoryId = null;
      
          this.showMessage(
            `Expense of ${this.currency(amount)} added successfully.`
          );
      
        });
      
      },
      error: err => {
        this.showError(
          err.error?.detail ?? 'Could not add voice expense.'
        );
      }
    });
  
    this.showMessage(
      'Voice expense details filled. Please confirm the expense.'
    );
  }
  
}
