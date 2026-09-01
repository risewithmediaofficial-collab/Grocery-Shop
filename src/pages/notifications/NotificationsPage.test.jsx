import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from './NotificationsPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('NotificationsPage Component & Actions', () => {
  const dummyNotifications = [
    {
      _id: 'n1',
      title: 'Low Stock Alert',
      message: 'Toor Dal 1kg stock is low (5 left)',
      type: 'low_stock',
      severity: 'warning',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({
      data: { data: dummyNotifications },
    });
  });

  it('renders notifications and executes mark all read', async () => {
    api.put.mockResolvedValueOnce({ data: { success: true } });

    await act(async () => {
      render(
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    expect(screen.getByText('Low Stock Alert')).toBeInTheDocument();

    const markAllReadBtn = screen.getByRole('button', { name: /Mark all read/i });
    await act(async () => {
      fireEvent.click(markAllReadBtn);
    });

    expect(api.put).toHaveBeenCalledWith('/notifications/mark-all-read');
  });
});
