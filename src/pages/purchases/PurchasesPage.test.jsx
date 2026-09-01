import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PurchasesPage from './PurchasesPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('PurchasesPage Component & Buttons', () => {
  const dummyPurchases = [
    {
      _id: 'pur1',
      purchaseNumber: 'PUR-00001',
      supplier: { name: 'Sri Murugan Traders' },
      supplierName: 'Sri Murugan Traders',
      grandTotal: 15000,
      status: 'received',
      purchaseDate: new Date().toISOString(),
      items: [{ quantity: 10, productName: 'Ponni Rice 25kg' }],
    },
  ];

  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url.includes('/purchases')) return Promise.resolve({ data: { data: dummyPurchases, total: 1 } });
      if (url.includes('/suppliers')) return Promise.resolve({ data: { data: [{ _id: 's1', name: 'Sri Murugan Traders' }] } });
      if (url.includes('/products')) return Promise.resolve({ data: { data: [{ _id: 'p1', name: 'Ponni Rice 25kg', purchasePrice: 1250 }] } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders purchases list and opens Inward Purchase modal', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <PurchasesPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByRole('heading', { name: /Purchases/i })).toBeInTheDocument();
    expect(screen.getByText('PUR-00001')).toBeInTheDocument();

    const addPurchaseBtn = screen.getByRole('button', { name: /New Purchase Order \/ Inward/i });
    await act(async () => {
      fireEvent.click(addPurchaseBtn);
    });

    expect(screen.getByText('Receive New Purchase Goods')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Item/i })).toBeInTheDocument();
  });
});
