const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { Notification } = require('../models/System');
const { protect } = require('../middleware/auth');

/**
 * ORDER SYSTEM ROUTES (HELD - Customer Ordering Logic)
 * 
 * Flow:
 * 1. GET /api/orders/catalog -> Returns active in-stock products (Name, category, unit, in-stock status)
 * 2. POST /api/orders -> Customer places order -> Creates notification for admin
 * 3. GET /api/orders -> Admin views all pending/confirmed orders
 * 4. PUT /api/orders/:id/status -> Admin updates status (confirmed, packing, ready, etc.)
 * 5. POST /api/orders/:id/send-to-billing -> Marks as sent to billing so POS can load items
 */

// GET catalog (public or authenticated) - shows names & availability without requiring price changes
router.get('/catalog', async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' })
      .select('name category unit currentStock')
      .populate('category', 'name')
      .sort({ name: 1 });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all orders (for store admin)
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name mobile')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST place order (customer submission)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerMobile, deliveryAddress, items, notes } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add items to your grocery cart' });
    }

    const order = await Order.create({
      customerName: customerName || 'Valued Customer',
      customerMobile: customerMobile || '',
      deliveryAddress,
      items,
      notes,
      status: 'pending',
    });

    // Notify store cashier & admin
    await Notification.create({
      type: 'new_order',
      title: '📦 New Customer Order Placed',
      message: `Order #${order.orderNumber} received from ${customerName || 'Customer'} (${items.length} items)`,
      severity: 'info',
      relatedId: order._id,
      relatedModel: 'Order',
      forRoles: ['admin', 'manager', 'cashier'],
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Your grocery order has been received! Our store staff will pack your order shortly.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST send order to billing POS
router.post('/:id/send-to-billing', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    order.sentToBilling = true;
    order.status = 'confirmed';
    await order.save();
    res.json({ success: true, data: order, message: 'Order sent to Billing POS' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
