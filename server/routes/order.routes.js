const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const { Notification } = require('../models/System');
const { protect } = require('../middleware/auth');
const whatsappService = require('../services/whatsapp.service');

/**
 * ORDER SYSTEM ROUTES
 */

// GET catalog (public or authenticated) - shows active products for customer order catalog
router.get('/catalog', async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' })
      .populate('category', 'name')
      .populate('unit', 'name symbol')
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
      .populate('customer', 'name mobile address')
      .populate('items.product', 'name sellingPrice unit')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single order by ID or orderNumber
router.get('/:id', async (req, res) => {
  try {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    const order = isObjectId
      ? await Order.findById(req.params.id).populate('customer', 'name mobile address').populate('items.product', 'name sellingPrice unit')
      : await Order.findOne({ orderNumber: req.params.id }).populate('customer', 'name mobile address').populate('items.product', 'name sellingPrice unit');
    
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST place order (customer submission with customer database linking)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerMobile, deliveryAddress, items, notes, customerId } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add items to your grocery cart' });
    }

    const cleanMobile = String(customerMobile || '').trim().replace(/\D/g, '');
    let customerDoc = null;

    // Find or create customer record in database
    if (customerId) {
      customerDoc = await Customer.findById(customerId);
    } else if (cleanMobile) {
      customerDoc = await Customer.findOne({ mobile: cleanMobile });
      if (!customerDoc) {
        customerDoc = await Customer.create({
          name: customerName?.trim() || `Customer ${cleanMobile.slice(-4)}`,
          mobile: cleanMobile,
          address: deliveryAddress?.trim() || '',
          customerType: 'regular',
          city: 'Krishnagiri',
          state: 'Tamil Nadu'
        });
      } else {
        // Update existing customer address/name if provided
        if (deliveryAddress && deliveryAddress.trim() && !customerDoc.address) {
          customerDoc.address = deliveryAddress.trim();
          await customerDoc.save();
        }
      }
    }

    // Create the Order document
    const order = await Order.create({
      customer: customerDoc?._id || null,
      customerName: customerDoc?.name || customerName?.trim() || 'Valued Customer',
      customerMobile: cleanMobile || customerMobile || '',
      deliveryAddress: deliveryAddress?.trim() || customerDoc?.address || 'Store Pickup',
      items,
      notes,
      status: 'pending',
    });

    // Update customer stats
    if (customerDoc) {
      customerDoc.totalBills = (customerDoc.totalBills || 0) + 1;
      customerDoc.lastPurchaseDate = new Date();
      await customerDoc.save();
    }

    // Notify store cashier & admin
    await Notification.create({
      type: 'new_order',
      title: '📦 New Customer Order Placed',
      message: `Order #${order.orderNumber} received from ${order.customerName} (${items.length} items)`,
      severity: 'info',
      relatedId: order._id,
      relatedModel: 'Order',
      forRoles: ['admin', 'manager', 'cashier'],
    });

    // Automatically send WhatsApp order confirmation in background
    whatsappService.sendOrderPlacedAutoMessage(order).catch(e => console.error('WhatsApp auto-send error:', e));

    res.status(201).json({
      success: true,
      data: order,
      message: 'Your grocery order has been received! Our store staff will pack your order shortly.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/status — update order workflow status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    order.status = status;

    // Only set confirmedBy if the order was not already confirmed
    if (status === 'confirmed' || !order.confirmedByName) {
      order.confirmedBy = req.user._id;
      order.confirmedByName = req.user.name || (req.user.role === 'admin' ? 'Admin User' : 'Cashier');
      order.confirmedByRole = req.user.role || 'staff';
      order.confirmedAt = new Date();
    }

    order.lastUpdatedBy = req.user.name || 'Staff';
    order.lastUpdatedByRole = req.user.role || 'staff';

    if (!order.statusLogs) order.statusLogs = [];
    order.statusLogs.push({
      status,
      changedBy: req.user.name || 'Staff',
      changedByRole: req.user.role || 'staff',
      changedAt: new Date()
    });

    await order.save();

    // Create real-time notification for Cashiers and Team
    try {
      const statusTitle = status === 'confirmed'
        ? `✅ Order #${order.orderNumber} Accepted by ${req.user.name}`
        : `🔄 Order #${order.orderNumber} Marked as "${status.replace(/_/g, ' ')}" by ${req.user.name}`;

      await Notification.create({
        type: 'new_order',
        title: statusTitle,
        message: `${req.user.name} (${req.user.role}) updated Order #${order.orderNumber} for ${order.customerName || 'Customer'} to "${status.replace(/_/g, ' ')}".`,
        severity: status === 'confirmed' ? 'success' : 'info',
        relatedId: order._id,
        relatedModel: 'Order',
      });
    } catch (notifErr) {
      console.error('Order status notification error:', notifErr);
    }

    // Automatically send WhatsApp status update in background
    whatsappService.sendOrderStatusAutoMessage(order, status).catch(e => console.error('WhatsApp auto-send error:', e));

    res.json({ success: true, data: order, message: `Order status updated to ${status}` });
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
    order.sentToBillingBy = req.user.name || 'Staff';
    order.status = 'confirmed';

    if (!order.confirmedByName) {
      order.confirmedBy = req.user._id;
      order.confirmedByName = req.user.name || (req.user.role === 'admin' ? 'Admin User' : 'Cashier');
      order.confirmedByRole = req.user.role || 'staff';
      order.confirmedAt = new Date();
    }

    order.lastUpdatedBy = req.user.name || 'Staff';
    order.lastUpdatedByRole = req.user.role || 'staff';

    if (!order.statusLogs) order.statusLogs = [];
    order.statusLogs.push({
      status: 'confirmed',
      changedBy: req.user.name || 'Staff',
      changedByRole: req.user.role || 'staff',
      changedAt: new Date()
    });

    await order.save();

    // Create prominent notification for Cashier
    try {
      await Notification.create({
        type: 'new_order',
        title: `🚀 Order #${order.orderNumber} Sent to POS by ${req.user.name}`,
        message: `${req.user.name} (${req.user.role}) accepted & sent Order #${order.orderNumber} for ${order.customerName || 'Customer'} to the Billing Counter.`,
        severity: 'info',
        relatedId: order._id,
        relatedModel: 'Order',
      });
    } catch (notifErr) {
      console.error('Send to billing notification error:', notifErr);
    }

    res.json({ success: true, data: order, message: 'Order sent to Billing POS' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
