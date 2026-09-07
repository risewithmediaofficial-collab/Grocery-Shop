import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OrdersPage from './OrdersPage';
import { AuthProvider } from '../../context/AuthContext';
import { CartProvider } from '../../context/CartContext';
import api from '../../services/api';
import { printOrderReceipt } from '../../utils/printReceipt';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('../../utils/printReceipt', () => ({
  printOrderReceipt: vi.fn(),
  printReceipt: vi.fn(),
}));

describe('OrdersPage Component & Workflow Features', () => {
  const dummyOrders = [
    {
      _id: 'ord1',
      orderNumber: 'ORD-1001',
      orderType: 'online',
      customerName: 'Anand Kumar',
      customerMobile: '9876543210',
      deliveryAddress: '24 Anna Nagar, Krishnagiri',
      status: 'pending',
      totalAmount: 1480,
      deliveryCharge: 30,
      paymentStatus: 'pending',
      items: [
        {
          _id: 'it1',
          product: 'p1',
          productName: 'Ponni Rice 25kg',
          quantity: 1,
          unit: 'bag',
          unitPrice: 1450,
          totalPrice: 1450,
          isPacked: false,
        },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'ord2',
      orderNumber: 'ORD-1002',
      orderType: 'offline',
      customerName: 'Deepa Lakshmi',
      customerMobile: '9123456780',
      deliveryAddress: 'Store Pickup',
      status: 'confirmed',
      totalAmount: 280,
      deliveryCharge: 0,
      paymentStatus: 'paid',
      paidAmount: 280,
      paymentMethod: 'cash',
      items: [
        {
          _id: 'it2',
          product: 'p2',
          productName: 'Sunflower Oil 1L',
          quantity: 2,
          unit: 'L',
          unitPrice: 140,
          totalPrice: 280,
          isPacked: true,
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ];

  const dummyCatalog = [
    { _id: 'p1', name: 'Ponni Rice 25kg', sellingPrice: 1450, unit: { symbol: 'bag' } },
    { _id: 'p2', name: 'Sunflower Oil 1L', sellingPrice: 140, unit: { symbol: 'L' } },
    { _id: 'p3', name: 'Toor Dal 1kg', sellingPrice: 160, unit: { symbol: 'kg' } },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Cashier Staff', role: 'cashier' }));
    api.get.mockImplementation((url) => {
      if (url.includes('/orders')) return Promise.resolve({ data: { data: dummyOrders } });
      if (url.includes('/products')) return Promise.resolve({ data: { data: dummyCatalog } });
      return Promise.resolve({ data: { data: [] } });
    });
    api.put.mockResolvedValue({ data: { success: true, data: dummyOrders[0] } });
    vi.clearAllMocks();
  });

  it('renders Orders Queue and switches between Queue and Create Order view tabs', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/Online Customer Orders/i)).toBeInTheDocument();
    expect(screen.getByText('Anand Kumar')).toBeInTheDocument();
    expect(screen.getByText('ORD-1001')).toBeInTheDocument();

    // Click "Create Order" mode button
    const createOrderModeBtn = screen.getByRole('button', { name: /Create Order/i });
    await act(async () => {
      fireEvent.click(createOrderModeBtn);
    });

    expect(screen.getByText(/Customer Name \*/i)).toBeInTheDocument();

    // Click back to Orders Queue
    const queueModeBtn = screen.getByRole('button', { name: /Orders Queue/i });
    await act(async () => {
      fireEvent.click(queueModeBtn);
    });

    expect(screen.getByText('Anand Kumar')).toBeInTheDocument();
  });

  it('filters orders by Online vs. Offline via URL query parameters from sidebar', async () => {
    // 1. Initial render for Online orders
    let unmountFn;
    await act(async () => {
      const res = render(
        <MemoryRouter initialEntries={['/orders?type=online']}>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
      unmountFn = res.unmount;
    });

    expect(screen.getByText(/Online Customer Orders/i)).toBeInTheDocument();
    expect(screen.getByText('Anand Kumar')).toBeInTheDocument();
    expect(screen.queryByText('Deepa Lakshmi')).not.toBeInTheDocument();

    unmountFn();

    // 2. Offline channel via sidebar query param /orders?type=offline
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/orders?type=offline']}>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/Offline Store Orders/i)).toBeInTheDocument();
    expect(screen.getByText('Deepa Lakshmi')).toBeInTheDocument();
    expect(screen.queryByText('Anand Kumar')).not.toBeInTheDocument();
  });

  it('keeps items separated in table and opens dedicated Packing Checklist drawer', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // Compact item badge is shown in table (not dumping line items into the table row)
    const packBadges = screen.getAllByRole('button', { name: /1 Products/i });
    expect(packBadges[0]).toBeInTheDocument();

    // Click the items badge to open dedicated packing checklist
    await act(async () => {
      fireEvent.click(packBadges[0]);
    });

    // Checklist drawer appears with search bar and checklist items
    expect(screen.getByText(/Packing Checklist:/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search in products checklist/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pack All Items/i })).toBeInTheDocument();

    // Mark all items as packed
    api.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...dummyOrders[0],
          items: [{ ...dummyOrders[0].items[0], isPacked: true }],
          isFullyPacked: true,
        },
      },
    });

    const packAllBtn = screen.getByRole('button', { name: /Pack All Items/i });
    await act(async () => {
      fireEvent.click(packAllBtn);
    });

    expect(api.put).toHaveBeenCalledWith('/orders/ord1/pack-all');
  });

  it('allows editing order items, replacing damaged products, and changing orderType even after billed', async () => {
    api.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...dummyOrders[0],
          orderType: 'offline',
          notes: 'Customer changed mind and picked up at shop',
        },
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // Click Edit button on the first order
    const editBtns = screen.getAllByRole('button', { name: /^Edit$/i });
    await act(async () => {
      fireEvent.click(editBtns[0]);
    });

    expect(screen.getByText(/Edit Order:/i)).toBeInTheDocument();

    // Change orderType to offline via channel toggle button
    const offlineChannelBtn = screen.getByRole('button', { name: /🏪 Offline Store Order/i });
    await act(async () => {
      fireEvent.click(offlineChannelBtn);
    });

    // Save changes
    const saveBtn = screen.getByRole('button', { name: /Save & Recalculate Order/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(api.put).toHaveBeenCalledWith(
      '/orders/ord1/items',
      expect.objectContaining({
        orderType: 'offline',
      })
    );
  });

  it('prints bill directly without redirecting to POS counter', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // Click Bill print button
    const billBtns = screen.getAllByRole('button', { name: /^Bill$/i });
    await act(async () => {
      fireEvent.click(billBtns[0]);
    });

    expect(printOrderReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ orderNumber: 'ORD-1001' })
    );
  });

  it('opens Record Payment modal and records Cash or UPI payment with UTR', async () => {
    api.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...dummyOrders[0],
          paymentStatus: 'paid',
          paidAmount: 1480,
          paymentMethod: 'upi',
          upiTransactionId: 'UTR-99887766',
        },
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // Click Payment button in the table row
    const paymentBtn = screen.getByRole('button', { name: /Collect ₹1480/i });
    await act(async () => {
      fireEvent.click(paymentBtn);
    });

    expect(screen.getByText(/Record Payment Collection/i)).toBeInTheDocument();

    // Switch payment mode to Shop Scanner UPI
    const upiBtn = screen.getByRole('button', { name: /Shop Scanner UPI/i });
    await act(async () => {
      fireEvent.click(upiBtn);
    });

    // Enter UTR
    const utrInput = screen.getByPlaceholderText(/483920194829 or last 4 digits/i);
    await act(async () => {
      fireEvent.change(utrInput, { target: { value: 'UTR-99887766' } });
    });

    // Submit payment
    const savePayBtn = screen.getByRole('button', { name: /Save Payment Record/i });
    await act(async () => {
      fireEvent.click(savePayBtn);
    });

    expect(api.put).toHaveBeenCalledWith(
      '/orders/ord1/payment',
      expect.objectContaining({
        paymentMethod: 'upi',
        upiTransactionId: 'UTR-99887766',
      })
    );
  });

  it('allows packers or staff to accept pending orders and opens packing checklist', async () => {
    api.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...dummyOrders[0],
          status: 'confirmed',
          acceptedByName: 'Packer Staff',
          acceptedByRole: 'packer',
          acceptedAt: new Date().toISOString(),
        },
      },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <OrdersPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // The pending order has an "Accept Order" button in the status column
    const acceptBtns = screen.getAllByRole('button', { name: /Accept Order/i });
    expect(acceptBtns.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(acceptBtns[0]);
    });

    // Calls PUT /orders/:id/accept
    expect(api.put).toHaveBeenCalledWith('/orders/ord1/accept');

    // Packing checklist drawer opens automatically after acceptance
    expect(screen.getByText(/Packing Checklist:/i)).toBeInTheDocument();
  });
});
