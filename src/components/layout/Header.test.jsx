import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('Header Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'valid-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Karthik Admin', role: 'admin' }));
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            _id: 'n1',
            title: 'New Customer Order',
            message: 'Order #ORD-1001 placed',
            type: 'new_order',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
      },
    });
  });

  it('renders menu toggle, user avatar, and notification trigger', async () => {
    const onMenuToggle = vi.fn();
    render(
      <MemoryRouter>
        <AuthProvider>
          <Header onMenuToggle={onMenuToggle} sidebarCollapsed={false} />
        </AuthProvider>
      </MemoryRouter>
    );

    // Menu toggle button
    const menuBtn = screen.getByTitle('Collapse Sidebar');
    fireEvent.click(menuBtn);
    expect(onMenuToggle).toHaveBeenCalled();

    // User name
    expect(screen.getByText('Karthik Admin')).toBeInTheDocument();
  });

  it('opens and closes notification dropdown and marks notifications as read', async () => {
    api.put.mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <AuthProvider>
          <Header onMenuToggle={vi.fn()} sidebarCollapsed={false} />
        </AuthProvider>
      </MemoryRouter>
    );

    // Open notifications
    const notifBtn = screen.getByTitle('Notifications');
    await act(async () => {
      fireEvent.click(notifBtn);
    });

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('New Customer Order')).toBeInTheDocument();

    // Clear all button
    const clearAllBtn = screen.getByTitle('Clear all unread');
    await act(async () => {
      fireEvent.click(clearAllBtn);
    });

    expect(screen.getByText('No new notifications')).toBeInTheDocument();
  });

  it('opens user profile menu and provides settings and sign out buttons', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <Header onMenuToggle={vi.fn()} sidebarCollapsed={false} />
        </AuthProvider>
      </MemoryRouter>
    );

    const userProfileBtn = screen.getByText('Karthik Admin');
    fireEvent.click(userProfileBtn);

    expect(screen.getByText('Store Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });
});
