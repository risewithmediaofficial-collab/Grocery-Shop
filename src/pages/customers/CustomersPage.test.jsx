import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomersPage from './CustomersPage';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('CustomersPage Component & Buttons', () => {
  const dummyCustomers = [
    {
      _id: 'c1',
      customerId: 'CUST-0001',
      name: 'Venkatesh S',
      mobile: '9876500001',
      outstandingBalance: 500,
      totalPurchases: 12500,
      totalBills: 14,
      customerType: 'regular',
      status: 'active',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockResolvedValue({
      data: { data: dummyCustomers, total: 1 },
    });
  });

  it('renders customer list and opens Add Customer modal without error', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <CustomersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByRole('heading', { name: /Customers/i })).toBeInTheDocument();
    expect(screen.getByText('Venkatesh S')).toBeInTheDocument();

    const addCustomerBtn = screen.getByRole('button', { name: /Add Customer/i });
    await act(async () => {
      fireEvent.click(addCustomerBtn);
    });

    expect(screen.getByText('Add New Customer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Ramesh Kumar/i)).toBeInTheDocument();
  });
});
