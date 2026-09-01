import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders KPI metrics and recent sales data', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          data: {
            data: {
              kpi: {
                todaySales: 15400,
                todaySalesCount: 18,
                todayPurchases: 5000,
                todayProfit: 3400,
                totalCustomers: 45,
                totalProducts: 120,
                stockValue: 85000,
                pendingCustomerPayments: 2400,
              },
              alerts: { lowStock: 3, outOfStock: 1 },
              charts: { last7Days: [] },
              recentSales: [
                {
                  _id: 's1',
                  invoiceNumber: 'INV-000101',
                  customerName: 'Murugan',
                  grandTotal: 1250,
                  paymentMethod: 'cash',
                  saleDate: new Date().toISOString(),
                },
              ],
              topProducts: [
                { _id: 'p1', name: 'Atta 5kg', totalQty: 25, totalRevenue: 6250 },
              ],
              lowStockProducts: [
                { _id: 'p2', name: 'Tata Salt 1kg', currentStock: 3, reorderLevel: 10 },
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    const kpiTitle = await screen.findByText(/Today's Sales/i);
    expect(kpiTitle).toBeInTheDocument();
    expect(screen.getByText('₹15,400')).toBeInTheDocument();
    expect(screen.getByText('INV-000101')).toBeInTheDocument();
    expect(screen.getByText('Murugan')).toBeInTheDocument();
    expect(screen.getByText('Tata Salt 1kg')).toBeInTheDocument();
  });
});
