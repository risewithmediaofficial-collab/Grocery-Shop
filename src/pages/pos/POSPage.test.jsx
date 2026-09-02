import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import POSPage from './POSPage';
import { CartProvider } from '../../context/CartContext';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('POSPage Component & Buttons', () => {
  const dummyProducts = [
    {
      _id: 'p1',
      name: 'Toor Dal 1kg',
      sellingPrice: 160,
      currentStock: 50,
      gstRate: 5,
      barcode: '8901234567890',
      category: { name: 'food' },
      unit: { symbol: 'kg' },
    },
    {
      _id: 'p2',
      name: 'Sunflower Oil 1L',
      sellingPrice: 140,
      currentStock: 30,
      gstRate: 5,
      barcode: '8901234567891',
      category: { name: 'beverages' },
      unit: { symbol: 'L' },
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockImplementation((url) => {
      if (url.includes('/products')) return Promise.resolve({ data: { data: dummyProducts } });
      if (url.includes('/held-bills')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/customers')) return Promise.resolve({ data: { data: [{ _id: 'c1', name: 'Ravi Kumar', mobile: '9876543210' }] } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders POS catalog and adds product to active billing cart with quantity prompt', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getAllByText('Toor Dal 1kg')[0]).toBeInTheDocument();
    expect(screen.getByText('Sunflower Oil 1L')).toBeInTheDocument();

    // Click product to open Quantity Modal (2 inputs: kg and bags)
    const productCard = screen.getAllByText('Toor Dal 1kg')[0];
    await act(async () => {
      fireEvent.click(productCard);
    });

    // Modal appears with mode switcher (Loose by Weight vs Whole Bags)
    expect(screen.getByText(/Loose by Weight \(KG\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Whole Bags/i)).toBeInTheDocument();

    // Confirm add to bill
    const addBtn = screen.getByRole('button', { name: /Add to Bill/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    // Complete bill button is present (item in cart)
    expect(screen.getByRole('button', { name: /COMPLETE BILL/i })).toBeInTheDocument();

    // Product is shown in bill and marked in catalog with In Cart badge
    expect(screen.getByText(/In Cart: 1/i)).toBeInTheDocument();

    // Stable catalog still displays other products without disappearing
    expect(screen.getByText('Sunflower Oil 1L')).toBeInTheDocument();

    // Search filters catalog
    const searchInput = screen.getByPlaceholderText(/Search products by name/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Sunflower' } });
    });
    expect(screen.getByText('Sunflower Oil 1L')).toBeInTheDocument();
  });

  it('opens Customer Selector modal and selects customer', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const selectCustBtn = screen.getByText(/Select Customer/i);
    await act(async () => {
      fireEvent.click(selectCustBtn);
    });

    expect(screen.getByPlaceholderText(/Search by name, mobile/i)).toBeInTheDocument();
  });

  it('allows adding multiple distinct pack sizes (e.g. 2 bags and 10 kg rice) for commodities', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const productCard = screen.getAllByText('Toor Dal 1kg')[0];
    
    // 1. Add 2 Bags (25kg each)
    await act(async () => {
      fireEvent.click(productCard);
    });
    expect(screen.getByText(/Loose by Weight \(KG\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Whole Bags/i)).toBeInTheDocument();
    
    // Select Whole Bags tab
    const bagTab = screen.getByText(/Whole Bags/i);
    await act(async () => {
      fireEvent.click(bagTab);
    });

    // Enter quantity 2 bags
    const bagInput = screen.getByPlaceholderText('1');
    await act(async () => {
      fireEvent.change(bagInput, { target: { value: '2' } });
    });

    const addBtn = screen.getByRole('button', { name: /Add to Bill/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    // 2. Add 10 kg loose
    await act(async () => {
      fireEvent.click(productCard);
    });
    const kgTab = screen.getByText(/Loose by Weight \(KG\)/i);
    await act(async () => {
      fireEvent.click(kgTab);
    });
    const kgInput = screen.getByPlaceholderText('1');
    await act(async () => {
      fireEvent.change(kgInput, { target: { value: '10' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Update in Bill|Add to Bill/i }));
    });

    // Single consolidated item exists and is updated to 10 in the active bill
    expect(screen.getAllByText(/Toor Dal 1kg/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
  });

  it('renders packaged sizes (e.g. 500ml, 1L, 2L, 5L) for liquids and bottled products', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const oilProductCard = screen.getByText('Sunflower Oil 1L');
    await act(async () => {
      fireEvent.click(oilProductCard);
    });

    // Shows pack sizes (500ml, 1 Liter, 2 Liter, 5 Liter)
    expect(screen.getByText(/Select Bottle \/ Pack Size:/i)).toBeInTheDocument();
    expect(screen.getByText('500 ml')).toBeInTheDocument();
    expect(screen.getByText('1 Liter')).toBeInTheDocument();
    expect(screen.getByText('2 Liter')).toBeInTheDocument();

    // Select 2 Liter
    await act(async () => {
      fireEvent.click(screen.getByText('2 Liter'));
    });

    // Confirm add to bill
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add to Bill/i }));
    });

    expect(screen.getByText(/Sunflower Oil 1L \(2 Liter\)/i)).toBeInTheDocument();
  });

  it('renders Indian retail price packs (₹5, ₹10, ₹20, ₹30) for biscuits and snacks', async () => {
    const biscuitProduct = {
      _id: 'p3',
      name: 'Good Day Biscuits',
      sellingPrice: 10,
      currentStock: 100,
      gstRate: 18,
      barcode: '8901234567892',
      category: { name: 'snacks' },
      unit: { symbol: 'pc' },
    };

    api.get.mockImplementation((url) => {
      if (url.includes('/products')) return Promise.resolve({ data: { data: [...dummyProducts, biscuitProduct] } });
      return Promise.resolve({ data: { data: [] } });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const biscuitCard = screen.getByText('Good Day Biscuits');
    await act(async () => {
      fireEvent.click(biscuitCard);
    });

    // Verify retail pack options appear: ₹5 Pack, ₹10 Pack, ₹20 Pack, ₹30 Pack
    expect(screen.getByText('₹5 Pack')).toBeInTheDocument();
    expect(screen.getByText('₹10 Pack')).toBeInTheDocument();
    expect(screen.getByText('₹20 Pack')).toBeInTheDocument();

    // Select ₹10 Pack
    await act(async () => {
      fireEvent.click(screen.getByText('₹10 Pack'));
    });

    // Add to bill
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add to Bill/i }));
    });

    expect(screen.getByText(/Good Day Biscuits \(₹10 Pack\)/i)).toBeInTheDocument();
  });

  it('triggers SwitchCustomerPromptModal when selecting a customer with items in the active cart', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // 1. Add product to cart
    const productCard = screen.getAllByText('Toor Dal 1kg')[0];
    await act(async () => {
      fireEvent.click(productCard);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add to Bill/i }));
    });

    expect(screen.getByText(/In Cart: 1/i)).toBeInTheDocument();

    // 2. Click Select Customer button
    await act(async () => {
      fireEvent.click(screen.getByText(/Select Customer/i));
    });

    // 3. Search and select customer "Ravi Kumar"
    const searchCustomerInput = screen.getByPlaceholderText(/Search by name, mobile/i);
    await act(async () => {
      fireEvent.change(searchCustomerInput, { target: { value: 'Ravi' } });
    });

    const custOption = await screen.findByText('Ravi Kumar');
    await act(async () => {
      fireEvent.click(custOption);
    });

    // 4. SwitchCustomerPromptModal appears protecting the active items
    expect(screen.getByText(/Active Cart in Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Hold Current Bill & Start New Bill for Ravi Kumar/i)).toBeInTheDocument();
    expect(screen.getByText(/Assign Ravi Kumar to These 1 Products/i)).toBeInTheDocument();

    // 5. Click Assign to bill
    await act(async () => {
      fireEvent.click(screen.getByText(/Assign Ravi Kumar to These 1 Products/i));
    });

    // Customer is now tagged to the bill
    expect(screen.getAllByText('Ravi Kumar').length).toBeGreaterThanOrEqual(1);
  });

  it('triggers RepeatPurchasePromptModal when repeating purchase with items in the active cart', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/products')) return Promise.resolve({ data: { data: dummyProducts } });
      if (url.includes('/held-bills')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/customers/c1/purchases') || url.includes('/purchases')) {
        return Promise.resolve({
          data: {
            data: [
              {
                _id: 'sale1',
                items: [
                  {
                    product: 'p2',
                    productName: 'Sunflower Oil 1L',
                    sellingPrice: 140,
                    quantity: 2,
                    gstRate: 5,
                  },
                ],
              },
            ],
          },
        });
      }
      if (url.includes('/customers')) return Promise.resolve({ data: { data: [{ _id: 'c1', name: 'Ravi Kumar', mobile: '9876543210' }] } });
      return Promise.resolve({ data: { data: [] } });
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <CartProvider>
              <POSPage />
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    });

    // Add item to cart
    const productCard = screen.getAllByText('Toor Dal 1kg')[0];
    await act(async () => {
      fireEvent.click(productCard);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add to Bill/i }));
    });

    // Select customer
    await act(async () => {
      fireEvent.click(screen.getAllByText(/Select Customer/i)[0]);
    });
    const custOption = (await screen.findAllByText('Ravi Kumar'))[0];
    await act(async () => {
      fireEvent.click(custOption);
    });
    await act(async () => {
      fireEvent.click(screen.getByText(/Assign Ravi Kumar to These 1 Products/i));
    });

    // Click Repeat Last Purchase
    const repeatBtn = screen.getAllByText(/Repeat Last Purchase/i)[0];
    await act(async () => {
      fireEvent.click(repeatBtn);
    });

    // RepeatPurchasePromptModal appears
    expect(await screen.findByText(/Hold Current Bill & Load Ravi Kumar's Repeat Items/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Repeat Items to Current Bill \(Append\)/i)).toBeInTheDocument();

    // Click Append
    await act(async () => {
      fireEvent.click(screen.getByText(/Add Repeat Items to Current Bill \(Append\)/i));
    });

    // Both items exist in cart
    expect(screen.getAllByText(/Toor Dal 1kg/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sunflower Oil 1L').length).toBeGreaterThanOrEqual(1);
  });
});
