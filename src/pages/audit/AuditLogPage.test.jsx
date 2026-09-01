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
});
