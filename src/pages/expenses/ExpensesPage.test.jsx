import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExpensesPage from './ExpensesPage';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ExpensesPage Component & Buttons', () => {
  const dummyExpenses = [
    {
      _id: 'exp1',
      category: 'electricity',
      amount: 4500,
      paymentMethod: 'bank_transfer',
      description: 'Electricity Bill TNEB Aug 2026',
      expenseDate: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockResolvedValue({
      data: { data: dummyExpenses, totalAmount: 4500, total: 1 },
    });
  });

  it('renders expense list, totals and opens Record Expense modal', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ExpensesPage />
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByRole('heading', { name: /Expense Management/i })).toBeInTheDocument();
    expect(screen.getByText('Electricity Bill TNEB Aug 2026')).toBeInTheDocument();

    const addExpenseBtn = screen.getByRole('button', { name: /Add Expense/i });
    await act(async () => {
      fireEvent.click(addExpenseBtn);
    });

    expect(screen.getByText('Record Shop Expense')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/0\.00/i)).toBeInTheDocument();
  });
});
