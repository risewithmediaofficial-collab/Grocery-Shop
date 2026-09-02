import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SaleDetailPage from './SaleDetailPage';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('SaleDetailPage Print & Action Buttons', () => {
  const dummySale = {
    _id: 's1',
    invoiceNumber: 'INV-000101',
    customerName: 'Karthik Raja',
    customerMobile: '9876543210',
    grandTotal: 1450,
    subtotal: 1380,
    totalTax: 70,
    totalCGST: 35,
    totalSGST: 35,
    paymentMethod: 'cash',
    amountPaid: 1500,
    changeReturned: 50,
    status: 'completed',
    saleDate: new Date().toISOString(),
    items: [
      {
        product: 'p1',
        productName: 'Ponni Rice 25kg',
        quantity: 1,
        sellingPrice: 1450,
        gstRate: 5,
        totalAmount: 1450,
        unit: 'bag',
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockResolvedValue({
      data: { data: dummySale },
    });
  });

  it('renders invoice details, Print A4, Print Thermal, and Repeat Sale buttons', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/sales/s1']}>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/sales/:id" element={<SaleDetailPage />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getAllByText('INV-000101')[0]).toBeInTheDocument();
    expect(screen.getByText('Ponni Rice 25kg')).toBeInTheDocument();
    expect(screen.getAllByText(/1 bag/i)[0]).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print A4 Tax Invoice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print Thermal Slip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Repeat & Edit \(POS\)/i })).toBeInTheDocument();

    // Toggle to thermal slip mode
    const thermalTab = screen.getByRole('button', { name: /🧾 Thermal Slip/i });
    await act(async () => {
      fireEvent.click(thermalTab);
    });
    expect(screen.getByText('Ponni Rice 25kg')).toBeInTheDocument();
  });
});
