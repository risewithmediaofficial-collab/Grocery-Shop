import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CustomerDetailPage from './CustomerDetailPage';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('CustomerDetailPage Component & Buttons', () => {
  const dummyCustomer = {
    _id: 'c1',
    customerId: 'CUST-0001',
    name: 'Venkatesh S',
    mobile: '9876500001',
    outstandingBalance: 1200,
    creditLimit: 5000,
    totalPurchases: 15000,
    totalBills: 10,
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockImplementation((url) => {
      if (url.includes('/customers/c1/purchases')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/customers/c1/ledger')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/customers/c1/frequent-products')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/customers/c1')) return Promise.resolve({ data: { data: dummyCustomer } });
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('renders customer KPI overview and opens Record Payment modal', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/customers/c1']}>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/customers/:id" element={<CustomerDetailPage />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByRole('heading', { name: 'Venkatesh S' })).toBeInTheDocument();
    expect(screen.getByText('₹1,200')).toBeInTheDocument();

    const recordPaymentBtn = screen.getByRole('button', { name: /Record Payment/i });
    await act(async () => {
      fireEvent.click(recordPaymentBtn);
    });

    expect(screen.getByText(/Record Payment for Venkatesh S/i)).toBeInTheDocument();
  });
});
