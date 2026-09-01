import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from './OrdersPage';
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

describe('OrdersPage Component & Buttons', () => {
  const dummyOrders = [
    {
      _id: 'ord1',
      orderNumber: 'ORD-1001',
      customerName: 'Anand Kumar',
      customerMobile: '9876543210',
      deliveryAddress: '24 Anna Nagar, Krishnagiri',
      status: 'pending',
      items: [{ product: 'p1', productName: 'Ponni Rice 25kg', quantity: 1, unit: 'bag' }],
      createdAt: new Date().toISOString(),
    },
  ];

  const dummyCatalog = [
    { _id: 'p1', name: 'Ponni Rice 25kg', sellingPrice: 1450, unit: { symbol: 'bag' } },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Cashier Staff', role: 'cashier' }));
    api.get.mockImplementation((url) => {
      if (url.includes('/orders')) return Promise.resolve({ data: { data: dummyOrders } });
      if (url.includes('/products')) return Promise.resolve({ data: { data: dummyCatalog } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders Orders Queue and switches between Queue and Create Order view tabs', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Grocery Ordering System')).toBeInTheDocument();
    expect(screen.getByText('Anand Kumar')).toBeInTheDocument();
    expect(screen.getByText('ORD-1001')).toBeInTheDocument();

    // Click "Create Order" mode button
    const createOrderModeBtn = screen.getByRole('button', { name: /Create Order/i });
    await act(async () => {
      fireEvent.click(createOrderModeBtn);
    });

    expect(screen.getByText(/Customer Name \*/i)).toBeInTheDocument();

    // Click back to Orders Queue
    const queueModeBtn = screen.getByRole('button', { name: /Orders Queue/i });
    await act(async () => {
      fireEvent.click(queueModeBtn);
    });

    expect(screen.getByText('Anand Kumar')).toBeInTheDocument();
  });

  it('allows changing status via dropdown select in table', async () => {
    api.put.mockResolvedValueOnce({ data: { success: true, data: { ...dummyOrders[0], status: 'confirmed' } } });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const selects = screen.getAllByRole('combobox');
    const tableRowStatusSelect = selects[selects.length - 1];
    await act(async () => {
      fireEvent.change(tableRowStatusSelect, { target: { value: 'confirmed' } });
    });

    expect(api.put).toHaveBeenCalledWith(
      '/orders/ord1/status',
      expect.objectContaining({ status: 'confirmed' })
    );
  });
});
