import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockResolvedValue({
      data: { user: { name: 'Admin', role: 'admin' } },
    });
  });

  it('renders all core links for admin user', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar collapsed={false} onToggle={vi.fn()} mobileOpen={false} onCloseMobile={vi.fn()} />
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /POS Billing/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Sales$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Returns/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Customers/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Purchases$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Suppliers/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Products/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Stock/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Batches/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Expiry/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Expenses/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analytics/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Orders & Cart/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Users/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Audit Logs/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
  });

  it('triggers collapse toggle when collapse button is clicked', async () => {
    const onToggle = vi.fn();
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar collapsed={false} onToggle={onToggle} mobileOpen={false} onCloseMobile={vi.fn()} />
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const collapseBtns = screen.getAllByTitle(/Collapse sidebar/i);
    fireEvent.click(collapseBtns[0]);
    expect(onToggle).toHaveBeenCalled();
  });

  it('renders mobile drawer when mobileOpen is true', async () => {
    const onCloseMobile = vi.fn();
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar collapsed={false} onToggle={vi.fn()} mobileOpen={true} onCloseMobile={onCloseMobile} />
          </AuthProvider>
        </MemoryRouter>
      );
    });

    const closeBtn = screen.getByTitle('Close sidebar');
    fireEvent.click(closeBtn);
    expect(onCloseMobile).toHaveBeenCalled();
  });
});
