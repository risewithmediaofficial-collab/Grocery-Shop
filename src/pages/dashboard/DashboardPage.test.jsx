import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import api from '../../services/api';
import * as AuthContextModule from '../../context/AuthContext';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders overall store KPI metrics, cashier sub-data, and incoming customer orders for admin', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u_admin', name: 'Admin User', role: 'admin' },
      isAdmin: () => true,
      isCashier: () => false,
    });

    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          data: {
            data: {
              isCashier: false,
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
              incomingOrders: [
                {
                  _id: 'ord1',
                  orderNumber: 'ORD-00042',
                  customerName: 'Ramesh Kumar',
                  customerMobile: '9876543210',
                  itemCount: 3,
                  itemsSummary: 'Bisleri Water 1L × 2, Toor Dal × 1kg',
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                }
              ],
              pendingOrdersCount: 1,
              activeOrdersCount: 1,
              cashierSummaries: [
                {
                  _id: 'c1',
                  name: 'Cashier 1',
                  email: 'cashier1@columbu.com',
                  role: 'cashier',
                  todaySales: 9400,
                  todayBillsCount: 10,
                  todayCash: 6000,
                  todayUpi: 3400,
                  avgBillValue: 940,
                  allTimeSales: 45000,
                },
                {
                  _id: 'c2',
                  name: 'Cashier 2',
                  email: 'cashier2@columbu.com',
                  role: 'cashier',
                  todaySales: 6000,
                  todayBillsCount: 8,
                  todayCash: 4000,
                  todayUpi: 2000,
                  avgBillValue: 750,
                  allTimeSales: 32000,
                },
              ],
              cashierActivities: [
                {
                  _id: 'act1',
                  userName: 'Cashier 1',
                  action: 'sale_created',
                  recordRef: 'INV-000101',
                  description: 'Cashier 1 generated bill INV-000101',
                  createdAt: new Date().toISOString(),
                }
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

    // Incoming order alert on front page
    expect(await screen.findByText('ORD-00042')).toBeInTheDocument();
    expect(screen.getByText('Ramesh Kumar')).toBeInTheDocument();
    expect(screen.getByText(/Bill in POS/i)).toBeInTheDocument();

    // Overall KPI metrics
    expect(screen.getByText('₹15,400')).toBeInTheDocument();
    expect(screen.getByText('INV-000101')).toBeInTheDocument();
    expect(screen.getByText('Murugan')).toBeInTheDocument();
    expect(screen.getByText('Tata Salt 1kg')).toBeInTheDocument();

    // Cashier sub-data (cashier1, cashier2)
    expect(screen.getAllByText('Cashier 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Cashier 2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('₹9,400')).toBeInTheDocument();
    expect(screen.getAllByText('₹6,000').length).toBeGreaterThanOrEqual(1);

    // Cashier activity stream
    expect(screen.getByText(/Cashier Activity & Audit Stream/i)).toBeInTheDocument();
    expect(screen.getByText(/Cashier 1 generated bill INV-000101/i)).toBeInTheDocument();
  });

  it('renders personal counter metrics for cashier without store-wide profit or purchases', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { _id: 'u_cashier', name: 'Ravi Cashier', role: 'cashier' },
      isAdmin: () => false,
      isCashier: () => true,
    });

    api.get.mockImplementation((url) => {
      if (url.includes('/dashboard')) {
        return Promise.resolve({
          data: {
            data: {
              isCashier: true,
              cashierName: 'Ravi Cashier',
              kpi: {
                todaySales: 8200,
                todaySalesCount: 11,
                todayCash: 5200,
                todayUpi: 3000,
                avgBillValue: 745,
                allTimeSales: 54000,
                allTimeBillsCount: 65,
              },
              alerts: { lowStock: 0, outOfStock: 0 },
              charts: { last7Days: [] },
              recentSales: [
                {
                  _id: 's_my1',
                  invoiceNumber: 'INV-000888',
                  customerName: 'Suresh',
                  grandTotal: 720,
                  paymentMethod: 'cash',
                  saleDate: new Date().toISOString(),
                },
              ],
              cashierLogs: [
                {
                  _id: 'log1',
                  action: 'user_login',
                  description: 'Ravi Cashier signed in to system',
                  createdAt: new Date().toISOString(),
                }
              ],
              incomingOrders: [
                {
                  _id: 'ord2',
                  orderNumber: 'ORD-00099',
                  customerName: 'Anitha',
                  customerMobile: '9443218765',
                  itemCount: 1,
                  itemsSummary: 'Sunflower Oil 1L × 1',
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                }
              ],
              pendingOrdersCount: 1,
              activeOrdersCount: 1,
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

    // Cashier view header and personal badge
    expect(await screen.findByText(/Cashier Terminal Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Counter View/i)).toBeInTheDocument();

    // Personal sales & cash collected
    expect(screen.getAllByText('₹8,200').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('₹5,200')).toBeInTheDocument();
    expect(screen.getByText('₹3,000')).toBeInTheDocument();
    expect(screen.getByText('₹745')).toBeInTheDocument();

    // Quick POS action
    expect(screen.getByText(/Resume Billing POS Terminal/i)).toBeInTheDocument();

    // Incoming order is visible on cashier front page
    expect(screen.getByText('ORD-00099')).toBeInTheDocument();
    expect(screen.getByText('Anitha')).toBeInTheDocument();

    // Store-wide overall metrics (purchases, profit, stock value) are NOT shown
    expect(screen.queryByText(/Today's Profit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stock Value/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cashier Performance & Counter Sub-Data/i)).not.toBeInTheDocument();
  });
});
