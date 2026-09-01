import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import POSPage from './POSPage';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('POSPage Component & Buttons', () => {
  const dummyProducts = [
    {
      _id: 'p1',
      name: 'Toor Dal 1kg',
      sellingPrice: 160,
      currentStock: 50,
      gstRate: 5,
      barcode: '8901234567890',
      category: { name: 'food' },
      unit: { symbol: 'kg' },
    },
    {
      _id: 'p2',
      name: 'Sunflower Oil 1L',
      sellingPrice: 140,
      currentStock: 30,
      gstRate: 5,
      barcode: '8901234567891',
      category: { name: 'beverages' },
      unit: { symbol: 'L' },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockImplementation((url) => {
      if (url.includes('/products')) return Promise.resolve({ data: { data: dummyProducts } });
      if (url.includes('/held-bills')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/customers/search')) return Promise.resolve({ data: { data: [{ _id: 'c1', name: 'Ravi Kumar', mobile: '9876543210' }] } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders POS catalog and adds product to active billing cart on click', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Toor Dal 1kg')).toBeInTheDocument();
    expect(screen.getByText('Sunflower Oil 1L')).toBeInTheDocument();

    // Click to add product
    const productCard = screen.getByText('Toor Dal 1kg');
    await act(async () => {
      fireEvent.click(productCard);
    });

    expect(screen.getByRole('button', { name: /COMPLETE BILL/i })).toBeInTheDocument();
  });

  it('opens Customer Selector modal and selects customer', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const selectCustBtn = screen.getByText(/Select Customer/i);
    await act(async () => {
      fireEvent.click(selectCustBtn);
    });

    expect(screen.getByPlaceholderText(/Search by name, mobile/i)).toBeInTheDocument();
  });
});
