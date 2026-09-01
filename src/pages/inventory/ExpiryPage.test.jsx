import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExpiryPage from './ExpiryPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ExpiryPage Component & Buckets', () => {
  const dummyExpiryData = {
    expired: [
      {
        _id: 'e1',
        product: { name: 'Organic Milk 500ml', productId: 'PRD-001' },
        batchNumber: 'B-001',
        remainingQty: 5,
        expiryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    within7: [
      {
        _id: 'e2',
        product: { name: 'Fresh Bread 400g', productId: 'PRD-002' },
        batchNumber: 'B-002',
        remainingQty: 12,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    within30: [],
    within60: [],
  };

  beforeEach(() => {
    api.get.mockResolvedValue({
      data: { data: dummyExpiryData },
    });
  });

  it('renders expiry bucket cards and toggles between Expired and Within 7 Days tabs', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <ExpiryPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Product Expiry Dashboard')).toBeInTheDocument();
    // Default active tab is within7
    expect(screen.getByText('Fresh Bread 400g')).toBeInTheDocument();

    // Click "Already Expired" bucket button
    const expiredBtn = screen.getByRole('button', { name: /Already Expired/i });
    await act(async () => {
      fireEvent.click(expiredBtn);
    });

    expect(screen.getByText('Organic Milk 500ml')).toBeInTheDocument();
  });
});
