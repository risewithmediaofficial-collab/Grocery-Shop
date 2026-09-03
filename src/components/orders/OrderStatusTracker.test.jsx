import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import OrderStatusTracker from './OrderStatusTracker';

describe('OrderStatusTracker Component', () => {
  it('renders out_for_delivery animation with two points and traveling vehicle to customer address', () => {
    const order = {
      _id: 'ord-1',
      orderNumber: 'ORD-00006',
      status: 'out_for_delivery',
      deliveryAddress: 'hosur',
    };

    render(<OrderStatusTracker order={order} />);

    // Check store hub point and customer destination point
    expect(screen.getByText(/Store Hub/i)).toBeInTheDocument();
    expect(screen.getAllByText(/hosur/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Dispatched/i)).toBeInTheDocument();
    expect(screen.getByText(/Destination/i)).toBeInTheDocument();

    // Check vehicle and live tracking active
    expect(screen.getByText(/Live Delivery Tracking Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Out for delivery!/i)).toBeInTheDocument();
    expect(screen.getByText(/Driver en route/i)).toBeInTheDocument();
  });

  it('renders packing animation with grocery box and packing in progress', () => {
    const order = {
      _id: 'ord-2',
      orderNumber: 'ORD-00005',
      status: 'packing',
      deliveryAddress: 'Gandhi Nagar',
    };

    render(<OrderStatusTracker order={order} />);

    expect(screen.getByText(/Staff Packing Order/i)).toBeInTheDocument();
    expect(screen.getByText(/Packing in progress!/i)).toBeInTheDocument();
    expect(screen.getByText(/Quality Checking/i)).toBeInTheDocument();
  });

  it('renders confirmed animation with verified order number and ringing bell', () => {
    const order = {
      _id: 'ord-3',
      orderNumber: 'ORD-00003',
      status: 'confirmed',
      deliveryAddress: 'MG Road',
    };

    render(<OrderStatusTracker order={order} />);

    expect(screen.getByText(/Order Received & Confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/Order #ORD-00003 Verified/i)).toBeInTheDocument();
  });

  it('renders delivered celebration with doorstep badge', () => {
    const order = {
      _id: 'ord-4',
      orderNumber: 'ORD-00001',
      status: 'delivered',
      deliveryAddress: 'Indiranagar',
    };

    render(<OrderStatusTracker order={order} />);

    expect(screen.getByText(/Delivered Successfully/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Indiranagar/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Arrived at destination/i)).toBeInTheDocument();
  });
});
