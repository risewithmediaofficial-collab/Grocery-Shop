import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import { AuthProvider } from '../../context/AuthContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('SettingsPage Component & Save Forms', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'token');
    localStorage.setItem('user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    api.get.mockImplementation((url) => {
      if (url.includes('/settings')) {
        return Promise.resolve({
          data: {
            data: {
              shop: {
                name: 'New Columbu Stores',
                address: 'Main Road, Krishnagiri',
                mobile: '9876543200',
                gstin: '33AABCK1234A1Z5',
                state: 'Tamil Nadu',
                invoicePrefix: 'INV',
                invoiceNumber: 101,
              },
            },
          },
        });
      }
      if (url.includes('/whatsapp/settings')) {
        return Promise.resolve({
          data: {
            data: {
              autoSendOnOrder: true,
              autoSendOnStatusChange: true,
              autoSendOnSale: true,
            },
          },
        });
      }
      if (url.includes('/whatsapp/logs')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('renders store settings and switches to WhatsApp Automation tab', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );
    });

    expect(screen.getByText('System & Store Settings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New Columbu Stores')).toBeInTheDocument();

    // Switch to WhatsApp tab
    const waTab = screen.getByRole('button', { name: /WhatsApp Automation/i });
    await act(async () => {
      fireEvent.click(waTab);
    });

    expect(screen.getByText('Automated WhatsApp Messaging Engine')).toBeInTheDocument();
    expect(screen.getByText(/Send Test WhatsApp Message/i)).toBeInTheDocument();
  });
});
