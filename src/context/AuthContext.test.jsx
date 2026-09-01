import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function TestConsumer() {
  const { user, login, logout, isAdmin, isManager, isCashier } = useAuth();
  return (
    <div>
      <p data-testid="user-name">{user ? user.name : 'No User'}</p>
      <p data-testid="is-admin">{isAdmin() ? 'Yes' : 'No'}</p>
      <p data-testid="is-manager">{isManager() ? 'Yes' : 'No'}</p>
      <p data-testid="is-cashier">{isCashier() ? 'Yes' : 'No'}</p>
      <button onClick={() => login('admin@columbu.com', 'admin123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders with unauthenticated state when no token in localStorage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('No');
  });

  it('handles login and updates state and localStorage', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'fake-jwt-token',
        user: { _id: '123', name: 'Admin User', email: 'admin@columbu.com', role: 'admin' },
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Login'));
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('Admin User');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('Yes');
    expect(screen.getByTestId('is-manager')).toHaveTextContent('Yes');
    expect(screen.getByTestId('is-cashier')).toHaveTextContent('Yes');
    expect(localStorage.getItem('token')).toBe('fake-jwt-token');
  });

  it('handles logout and clears storage', async () => {
    api.get.mockResolvedValueOnce({
      data: { user: { name: 'Admin', role: 'admin' } },
    });
    localStorage.setItem('token', 'fake-jwt-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Logout'));
    });

    expect(screen.getByTestId('user-name')).toHaveTextContent('No User');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
