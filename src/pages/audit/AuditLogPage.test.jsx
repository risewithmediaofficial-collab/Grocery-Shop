import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuditLogPage from './AuditLogPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('AuditLogPage Component', () => {
  const dummyLogs = [
    {
      _id: 'a1',
      module: 'sales',
      action: 'sale_created',
      recordRef: 'INV-000101',
      userName: 'Karthik Admin',
      createdAt: new Date().toISOString(),
      description: 'Sale completed for ₹1,450',
    },
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({
      data: { data: dummyLogs, total: 1 },
    });
  });

  it('renders audit logs table and module selector', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuditLogPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('System Audit & Compliance Logs')).toBeInTheDocument();
    expect(screen.getByText('INV-000101')).toBeInTheDocument();
    expect(screen.getByText('Karthik Admin')).toBeInTheDocument();
    expect(screen.getByText('sale_created')).toBeInTheDocument();
  });

  it('renders unbilled stock reduction audit entry with reason and warning badge', async () => {
    const unbilledLog = [
      {
        _id: 'u1',
        module: 'inventory',
        action: 'unbilled_stock_reduction',
        recordRef: 'PROD-0012',
        userName: 'Ramesh Staff',
        createdAt: new Date().toISOString(),
        oldValue: { stock: 25 },
        newValue: {
          stock: 15,
          reducedBy: 10,
          reason: 'Mistakenly Added / Entry Error',
          notes: 'Count mistake during inward',
          financialLoss: 650,
        },
      },
    ];

    api.get.mockResolvedValueOnce({
      data: { data: unbilledLog, total: 1 },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <AuditLogPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText(/UNBILLED REDUCTION/i)).toBeInTheDocument();
    expect(screen.getByText(/Mistakenly Added \/ Entry Error/i)).toBeInTheDocument();
    expect(screen.getByText(/Count mistake during inward/i)).toBeInTheDocument();
    expect(screen.getByText(/25 → 15 \(-10 units\)/i)).toBeInTheDocument();
  });
});
