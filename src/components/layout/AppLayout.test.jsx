import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './AppLayout';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [], unreadCount: 0 } }),
    put: vi.fn(),
  },
}));

describe('AppLayout Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin User', role: 'admin' }));
  });

  it('renders sidebar, header and child outlet route', () => {
    render(
      <MemoryRouter initialEntries={['/test']}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route path="test" element={<div data-testid="child-page">Child Content</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('child-page')).toHaveTextContent('Child Content');
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });
});
