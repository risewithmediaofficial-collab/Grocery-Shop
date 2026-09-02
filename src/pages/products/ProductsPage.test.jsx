import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductsPage from './ProductsPage';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ProductsPage Component & Buttons', () => {
  const dummyProducts = [
    {
      _id: 'p1',
      productId: 'PRD-0001',
      name: 'Ponni Rice 25kg',
      category: { _id: 'cat1', name: 'food' },
      sellingPrice: 1450,
      purchasePrice: 1250,
      currentStock: 20,
      reorderLevel: 5,
      unit: { _id: 'u1', symbol: 'bag' },
      status: 'active',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockImplementation((url) => {
      if (url.includes('/products')) {
        return Promise.resolve({ data: { data: dummyProducts, total: 1 } });
      }
      if (url.includes('/categories')) {
        return Promise.resolve({ data: { data: [{ _id: 'cat1', name: 'Food Grains' }] } });
      }
      if (url.includes('/units')) {
        return Promise.resolve({ data: { data: [{ _id: 'u1', name: 'Kilogram', symbol: 'kg' }] } });
      }
      if (url.includes('/brands')) {
        return Promise.resolve({ data: { data: [{ _id: 'b1', name: 'Standard' }] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders products table, search bar and opens Add Product modal', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ProductsPage />
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Products & Inventory Catalog')).toBeInTheDocument();
    expect(screen.getByText('Ponni Rice 25kg')).toBeInTheDocument();

    // Click "Add Product" button
    const addProductBtn = screen.getByRole('button', { name: /Add Product/i });
    await act(async () => {
      fireEvent.click(addProductBtn);
    });

    expect(screen.getByText('Add New Grocery Product')).toBeInTheDocument();
  });

  it('triggers stock reduction reason prompt modal when lowering product stock', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <ProductsPage />
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // Click Edit button for Ponni Rice 25kg
    const editBtn = screen.getByTitle('Edit Product');
    await act(async () => {
      fireEvent.click(editBtn);
    });

    expect(screen.getByText('Edit Product')).toBeInTheDocument();

    // Find current available stock input (currentStock is 20)
    const stockInput = screen.getByDisplayValue('20');
    await act(async () => {
      fireEvent.change(stockInput, { target: { value: '15' } });
    });

    // Submit form (Update Product)
    const updateBtn = screen.getByRole('button', { name: /Update Product/i });
    await act(async () => {
      fireEvent.submit(updateBtn.closest('form'));
    });

    // Verify Stock Reduction Reason Modal is displayed
    expect(screen.getByText('Stock Reduction Reason Required')).toBeInTheDocument();
    expect(screen.getByText(/Why is stock being reduced without a customer bill\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Mistakenly Added \/ Entry Error/i)).toBeInTheDocument();
  });
});
