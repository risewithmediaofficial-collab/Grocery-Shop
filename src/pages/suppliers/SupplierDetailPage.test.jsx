import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SupplierDetailPage from './SupplierDetailPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('SupplierDetailPage Component & Buttons', () => {
  const dummySupplier = {
    _id: 's1',
    name: 'Ramesh Kumar',
    company: 'Sri Murugan Traders',
    supplierId: 'SUP-0001',
    mobile: '9876543201',
    outstandingBalance: 6000,
    paymentTerms: 'Net 30',
  };

  beforeEach(() => {
    api.get.mockImplementation((url) => {
      if (url.includes('/suppliers/s1/ledger')) return Promise.resolve({ data: { data: [] } });
      if (url.includes('/suppliers/s1')) return Promise.resolve({ data: { data: dummySupplier } });
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('renders supplier details and opens Record Payment modal', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/suppliers/s1']}>
          <Routes>
            <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
          </Routes>
        </MemoryRouter>
      );
    });

    expect(screen.getByRole('heading', { name: 'Ramesh Kumar' })).toBeInTheDocument();
    expect(screen.getByText('₹6,000')).toBeInTheDocument();

    const payBtn = screen.getByRole('button', { name: /Record Payment to Supplier/i });
    await act(async () => {
      fireEvent.click(payBtn);
    });

    expect(screen.getByText(/Pay Supplier: Ramesh Kumar/i)).toBeInTheDocument();
  });
});
