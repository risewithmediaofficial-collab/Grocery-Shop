import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SalesReturnsPage from './SalesReturnsPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('SalesReturnsPage Component & Process Buttons', () => {
  const dummySale = {
    _id: 's1',
    invoiceNumber: 'INV-000101',
    customerName: 'Karthik Raja',
    items: [
      {
        product: 'p1',
        productName: 'Toor Dal 1kg',
        quantity: 2,
        sellingPrice: 160,
        gstRate: 5,
        unit: 'kg',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches for invoice and loads return items for refund processing', async () => {
    api.get.mockResolvedValueOnce({
      data: { data: dummySale },
    });

    render(
      <MemoryRouter>
        <SalesReturnsPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Enter Invoice Number/i);
    fireEvent.change(input, { target: { value: 'INV-000101' } });

    const findBtn = screen.getByRole('button', { name: /Find Invoice/i });
    await act(async () => {
      fireEvent.click(findBtn);
    });

    expect(screen.getByText('Toor Dal 1kg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm & Process Return/i })).toBeInTheDocument();
  });
});
