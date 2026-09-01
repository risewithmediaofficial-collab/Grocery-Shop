import { describe, it, expect, vi } from 'vitest';
import {
  generateOrderConfirmationMessage,
  generateOutForDeliveryMessage,
  generateOrderReadyMessage,
  generateOrderDeliveredMessage,
  openWhatsAppChat,
  STORE_DETAILS,
} from './whatsapp';

describe('WhatsApp Utilities', () => {
  const sampleOrder = {
    orderNumber: 'ORD-1001',
    customerName: 'Karthik Raja',
    deliveryAddress: '12 Gandhi Nagar, Krishnagiri',
    notes: 'Please ring bell',
    items: [
      { productName: 'Ponni Boiled Rice (25kg)', quantity: 1, unit: 'bag', notes: '₹1,450' },
      { productName: 'Sunflower Cooking Oil (1L)', quantity: 2, unit: 'pouch', notes: '₹140' },
    ],
  };

  it('generates accurate order confirmation messages with store branding', () => {
    const msg = generateOrderConfirmationMessage(sampleOrder, STORE_DETAILS);
    expect(msg).toContain('New Columbu Stores');
    expect(msg).toContain('Karthik Raja');
    expect(msg).toContain('ORD-1001');
    expect(msg).toContain('Ponni Boiled Rice (25kg)');
    expect(msg).toContain('Sunflower Cooking Oil (1L)');
    expect(msg).toContain('12 Gandhi Nagar, Krishnagiri');
    expect(msg).toContain('Please ring bell');
  });

  it('generates out for delivery messages', () => {
    const msg = generateOutForDeliveryMessage(sampleOrder, STORE_DETAILS);
    expect(msg).toContain('Order Out for Delivery');
    expect(msg).toContain('Karthik Raja');
    expect(msg).toContain('ORD-1001');
    expect(msg).toContain('12 Gandhi Nagar, Krishnagiri');
  });

  it('generates order ready for pickup messages', () => {
    const msg = generateOrderReadyMessage(sampleOrder, STORE_DETAILS);
    expect(msg).toContain('Order Ready for Pickup');
    expect(msg).toContain('Karthik Raja');
    expect(msg).toContain('ORD-1001');
  });

  it('generates order delivered messages', () => {
    const msg = generateOrderDeliveredMessage(sampleOrder, STORE_DETAILS);
    expect(msg).toContain('Order Completed');
    expect(msg).toContain('Karthik Raja');
    expect(msg).toContain('ORD-1001');
  });

  it('opens WhatsApp chat window with correct international phone URL format', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
    openWhatsAppChat('9876543210', 'Test message content');
    
    expect(openSpy).toHaveBeenCalledWith(
      'https://wa.me/919876543210?text=Test%20message%20content',
      '_blank',
      'noopener,noreferrer'
    );
    openSpy.mockRestore();
  });
});
