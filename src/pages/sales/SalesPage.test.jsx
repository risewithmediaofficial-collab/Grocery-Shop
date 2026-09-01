import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SalesPage from './SalesPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('SalesPage Component', () => {
  const dummySales = [
    {
      _id: 's1',
      invoiceNumber: 'INV-000101',
      customerName: 'Karthik Raja',
      grandTotal: 1450,
      totalTax: 72.5,
      paymentMethod: 'cash',
      status: 'completed',
      saleDate: new Date().toISOString(),
      items: [{ quantity: 1, productName: 'Ponni Rice 25kg' }],
    },
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({
      data: { data: dummySales, total: 1 },
    });
  });

  it('renders sales invoice history table and new sale link', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <SalesPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Sales & Invoices')).toBeInTheDocument();
    expect(screen.getByText('INV-000101')).toBeInTheDocument();
    expect(screen.getByText('Karthik Raja')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New Sale \(POS\)/i })).toBeInTheDocument();
  });
});
