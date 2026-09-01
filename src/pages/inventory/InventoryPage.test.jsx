import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import InventoryPage from './InventoryPage';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('InventoryPage Component & Stock Adjustments', () => {
  const dummyMovements = [
    {
      _id: 'm1',
      product: { _id: 'p1', name: 'Ponni Rice 25kg', productId: 'PRD-0001' },
      productName: 'Ponni Rice 25kg',
      type: 'sale',
      quantity: -1,
      balanceBefore: 20,
      balanceAfter: 19,
      reference: 'INV-000101',
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockImplementation((url) => {
      if (url.includes('/inventory/movements')) return Promise.resolve({ data: { data: dummyMovements, total: 1 } });
      if (url.includes('/products')) return Promise.resolve({ data: { data: [{ _id: 'p1', name: 'Ponni Rice 25kg' }] } });
      if (url.includes('/categories')) return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders stock movements and opens Adjust Stock modal', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <InventoryPage />
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByRole('heading', { name: /Stock Ledger & Inventory Management/i })).toBeInTheDocument();
    expect(screen.getByText('Ponni Rice 25kg')).toBeInTheDocument();

    const adjustBtn = screen.getByRole('button', { name: /Adjust Stock/i });
    await act(async () => {
      fireEvent.click(adjustBtn);
    });

    expect(screen.getByText(/Changes are logged permanently to the audit ledger/i)).toBeInTheDocument();
  });
});
