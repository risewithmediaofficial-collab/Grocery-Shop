import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

function TestCartConsumer() {
  const {
    cartItems,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    subtotal,
    grandTotal,
    discount,
    setDiscount,
  } = useCart();

  const dummyProduct = {
    _id: 'p1',
    name: 'Basmati Rice 5kg',
    sellingPrice: 400,
    gstRate: 5,
    unit: 'bag',
  };

  return (
    <div>
      <p data-testid="cart-count">{cartItems.length}</p>
      <p data-testid="subtotal">{subtotal}</p>
      <p data-testid="grand-total">{grandTotal}</p>
      <p data-testid="discount">{discount}</p>
      <button onClick={() => addItem(dummyProduct, 2)}>Add 2 Bags</button>
      <button onClick={() => updateItem('p1', 'quantity', 3)}>Update to 3 Bags</button>
      <button onClick={() => removeItem('p1')}>Remove Item</button>
      <button onClick={() => setDiscount(50)}>Apply Discount</button>
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('manages adding items, updating quantities, calculating GST subtotal and grandTotal', async () => {
    render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0');

    // Add 2 bags (400 * 2 = 800 subtotal, 5% GST = 40, grand total = 840)
    await act(async () => {
      fireEvent.click(screen.getByText('Add 2 Bags'));
    });

    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    expect(screen.getByTestId('subtotal')).toHaveTextContent('800');
    expect(screen.getByTestId('grand-total')).toHaveTextContent('840');

    // Update quantity to 3 bags (400 * 3 = 1200, 5% GST = 60, grand total = 1260)
    await act(async () => {
      fireEvent.click(screen.getByText('Update to 3 Bags'));
    });

    expect(screen.getByTestId('subtotal')).toHaveTextContent('1200');
    expect(screen.getByTestId('grand-total')).toHaveTextContent('1260');

    // Apply 50 discount (1260 - 50 = 1210)
    await act(async () => {
      fireEvent.click(screen.getByText('Apply Discount'));
    });

    expect(screen.getByTestId('discount')).toHaveTextContent('50');
    expect(screen.getByTestId('grand-total')).toHaveTextContent('1210');

    // Remove item
    await act(async () => {
      fireEvent.click(screen.getByText('Remove Item'));
    });

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    expect(screen.getByTestId('subtotal')).toHaveTextContent('0');
  });

  it('clears cart and removes localStorage item', async () => {
    render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Add 2 Bags'));
      fireEvent.click(screen.getByText('Clear Cart'));
    });

    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    expect(localStorage.getItem('columbu_pos_cart')).toBeNull();
  });
});
