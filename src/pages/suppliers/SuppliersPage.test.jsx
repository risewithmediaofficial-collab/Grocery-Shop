import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SuppliersPage from './SuppliersPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('SuppliersPage Component & Buttons', () => {
  const dummySuppliers = [
    {
      _id: 's1',
      supplierId: 'SUP-0001',
      name: 'Ramesh Kumar',
      company: 'Sri Murugan Traders',
      mobile: '9876543201',
      outstandingBalance: 4500,
      paymentTerms: 'Net 30',
      status: 'active',
    },
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({
      data: { data: dummySuppliers, total: 1 },
    });
  });

  it('renders supplier list and opens Add Supplier modal without error', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <SuppliersPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByRole('heading', { name: /Suppliers & Vendors/i })).toBeInTheDocument();
    expect(screen.getByText('Sri Murugan Traders')).toBeInTheDocument();

    const addSupplierBtn = screen.getByRole('button', { name: /Add Supplier/i });
    await act(async () => {
      fireEvent.click(addSupplierBtn);
    });

    expect(screen.getAllByText(/Add Supplier/i).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/e\.g\. Ramesh Kumar/i)).toBeInTheDocument();
  });
});
