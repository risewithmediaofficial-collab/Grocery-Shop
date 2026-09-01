import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersPage from './UsersPage';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('UsersPage Component & Staff Management', () => {
  const dummyUsers = [
    {
      _id: 'u1',
      name: 'Prakash M',
      email: 'prakash@columbu.com',
      role: 'cashier',
      mobile: '9876543222',
      isActive: true,
    },
  ];

  beforeEach(() => {
    api.get.mockResolvedValue({
      data: { data: dummyUsers },
    });
  });

  it('renders staff user list and opens Add Staff User modal', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <UsersPage />
        </MemoryRouter>
      );
    });

    expect(screen.getByText('User Roles & Staff Management')).toBeInTheDocument();
    expect(screen.getByText('Prakash M')).toBeInTheDocument();

    const addUserBtn = screen.getByRole('button', { name: /Add User/i });
    await act(async () => {
      fireEvent.click(addUserBtn);
    });

    expect(screen.getByRole('heading', { name: /Add Staff User/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Anand Kumar/i)).toBeInTheDocument();
  });
});
