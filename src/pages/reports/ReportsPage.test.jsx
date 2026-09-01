import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReportsPage from './ReportsPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ReportsPage Component & Tabs', () => {
  const dummyProfit = {
    totalRevenue: 50000,
    totalCOGS: 40000,
    grossProfit: 10000,
    totalExpenses: 2500,
    netProfit: 7500,
    salesCount: 45,
  };

  const dummySales = {
    sales: [],
    summary: { totalRevenue: 50000, totalTax: 2500, totalDiscount: 500, count: 45 },
    productWise: [{ name: 'Ponni Rice 25kg', qty: 20, revenue: 29000 }],
  };

  const dummyInventory = {
    products: [],
    stockValue: 120000,
    lowStockCount: 2,
    outOfStockCount: 1,
    lowStock: [],
    outOfStock: [],
  };

  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url.includes('/reports/profit')) return Promise.resolve({ data: { data: dummyProfit } });
      if (url.includes('/reports/sales')) return Promise.resolve({ data: { data: dummySales } });
      if (url.includes('/reports/inventory')) return Promise.resolve({ data: { data: dummyInventory } });
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('renders Profit & Loss overview and switches between report tabs', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ReportsPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Reports & Financial Analytics')).toBeInTheDocument();
    expect(screen.getByText(/Net Final Business Profit/i)).toBeInTheDocument();
    expect(screen.getAllByText('₹7,500').length).toBeGreaterThan(0);

    // Switch to Sales & GST Report tab
    const salesTab = screen.getByRole('button', { name: /Sales & GST Report/i });
    await act(async () => {
      fireEvent.click(salesTab);
    });

    expect(screen.getByText('Product-Wise Sales Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Ponni Rice 25kg')).toBeInTheDocument();

    // Switch to Inventory Valuation tab
    const invTab = screen.getByRole('button', { name: /Inventory Valuation/i });
    await act(async () => {
      fireEvent.click(invTab);
    });

    expect(screen.getByText('Total Store Inventory Valuation')).toBeInTheDocument();
    expect(screen.getByText('₹1,20,000')).toBeInTheDocument();
  });
});
