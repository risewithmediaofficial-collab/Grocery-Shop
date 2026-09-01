import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomerOrderPage from './CustomerOrderPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('CustomerOrderPage (Public Customer Grocery Portal)', () => {
  const dummyCatalog = [
    {
      _id: 'p1',
      name: 'Fresh Cow Milk 1L',
      sellingPrice: 42,
      currentStock: 100,
      unit: { symbol: 'packet' },
      category: { name: 'beverages' },
    },
    {
      _id: 'p2',
      name: 'Whole Wheat Atta 5kg',
      sellingPrice: 260,
      currentStock: 40,
      unit: { symbol: 'bag' },
      category: { name: 'food' },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    api.get.mockImplementation((url) => {
      if (url.includes('/orders/catalog') || url.includes('/products')) {
        return Promise.resolve({ data: { data: dummyCatalog } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders customer grocery catalog and adds items to customer cart', async () => {
    render(
      <MemoryRouter>
        <CustomerOrderPage />
      </MemoryRouter>
    );

    const productTitle = await screen.findByText('Fresh Cow Milk 1L');
    expect(productTitle).toBeInTheDocument();
    expect(screen.getByText('Whole Wheat Atta 5kg')).toBeInTheDocument();

    // Click Increase quantity (+) button
    const increaseBtns = screen.getAllByTitle('Increase quantity');
    await act(async () => {
      fireEvent.click(increaseBtns[0]);
    });

    expect(screen.getByText('Your Grocery Cart')).toBeInTheDocument();
    expect(screen.getByText('1 item in basket')).toBeInTheDocument();
  });

  it('opens Customer Login / OTP modal when clicking Customer Login button', async () => {
    render(
      <MemoryRouter>
        <CustomerOrderPage />
      </MemoryRouter>
    );

    const loginBtn = await screen.findByRole('button', { name: /Sign In \(OTP\)/i });
    await act(async () => {
      fireEvent.click(loginBtn);
    });

    expect(screen.getByText('Sign In with Mobile')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('98765 43210')).toBeInTheDocument();
  });
});
