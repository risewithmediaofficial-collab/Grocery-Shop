import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BatchesPage from './BatchesPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('BatchesPage Component', () => {
  const dummyBatches = [
    {
      _id: 'b1',
      batchNumber: 'B-20260830-1',
      product: { name: 'Aashirvaad Atta 5kg' },
      supplier: { name: 'ITC Direct' },
      purchasePrice: 210,
      quantity: 50,
      remainingQty: 35,
      expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    },
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({
      data: { data: dummyBatches },
    });
  });

  it('renders batches list with FEFO tracking', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <BatchesPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Batch Tracking & FEFO')).toBeInTheDocument();
    expect(screen.getByText('B-20260830-1')).toBeInTheDocument();
    expect(screen.getByText('Aashirvaad Atta 5kg')).toBeInTheDocument();
  });
});
