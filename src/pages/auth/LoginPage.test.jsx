import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders sign in form with inputs and buttons', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@columbu.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('populates demo credentials on clicking demo account shortcuts', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const cashierShortcut = screen.getByText('Cashier →');
    fireEvent.click(cashierShortcut);

    const emailInput = screen.getByPlaceholderText('admin@columbu.com');
    expect(emailInput.value).toBe('cashier@columbu.com');
  });

  it('submits login form and calls auth endpoint', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'test-token',
        user: { _id: '1', name: 'Admin', email: 'admin@columbu.com', role: 'admin' },
      },
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Sign In/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@columbu.com',
      password: 'admin123',
    });
  });
});
