const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const User = require('../models/User');
const { Notification } = require('../models/System');
const { protect, authorize } = require('../middleware/auth');
const whatsappService = require('../services/whatsapp.service');
const auditService = require('../services/audit.service');

/**
 * ORDER SYSTEM ROUTES
 */

// GET catalog (public or authenticated) - shows active products for customer order catalog
router.get('/catalog', async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' })
      .populate('category subCategory brand unit')
      .sort({ name: 1 });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all orders (for store admin & staff)
router.get('/', protect, async (req, res) => {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (type && type !== 'all') {
      if (type === 'online') {
        filter.orderType = { $ne: 'offline' };
      } else {
        filter.orderType = type;
      }
    }
    if (status && status !== 'all') {
      filter.status = status;
    }
    const orders = await Order.find(filter)
      .populate('customer', 'name mobile address')
      .populate('items.product', 'name sellingPrice unit')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/counts (lightweight order statistics including offline orders count)
router.get('/counts', protect, async (req, res) => {
  try {
    const [total, online, offline, active, completed] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ orderType: { $ne: 'offline' } }),
      Order.countDocuments({ orderType: 'offline' }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'packing', 'ready', 'out_for_delivery'] } }),
      Order.countDocuments({ status: { $in: ['delivered', 'billed'] } })
    ]);
    res.json({
      success: true,
      data: { total, online, offline, active, completed }
    });
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

// POST place order (customer or staff submission with automatic billing calculation)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerMobile, deliveryAddress, items, notes, customerId, deliveryCharge, orderType } = req.body;
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

    // Enrich items with prices and calculate totalAmount automatically
    let itemsTotal = 0;
    const enrichedItems = [];
    for (const item of items) {
      let uPrice = Number(item.unitPrice || item.sellingPrice || 0);
      let pName = item.productName || item.name;
      let pUnit = item.unit;
      if ((!uPrice || !pName) && item.product) {
        const pDoc = await Product.findById(item.product);
        if (pDoc) {
          if (!uPrice) uPrice = pDoc.sellingPrice || 0;
          if (!pName) pName = pDoc.name;
          if (!pUnit) pUnit = pDoc.unit?.symbol || 'unit';
        }
      }
      const qty = Math.max(1, Number(item.quantity) || 1);
      const tPrice = uPrice * qty;
      itemsTotal += tPrice;

      enrichedItems.push({
        product: item.product,
        productName: pName || 'Grocery Item',
        quantity: qty,
        unit: pUnit || 'unit',
        unitPrice: uPrice,
        totalPrice: tPrice,
        notes: item.notes || '',
        isPacked: !!item.isPacked
      });
    }

    const dCharge = Math.max(0, Number(deliveryCharge) || 0);
    const totalAmount = itemsTotal + dCharge;

    // Create the Order document
    const order = await Order.create({
      orderType: orderType || 'online',
      customer: customerDoc?._id || null,
      customerName: customerDoc?.name || customerName?.trim() || 'Valued Customer',
      customerMobile: cleanMobile || customerMobile || '',
      deliveryAddress: deliveryAddress?.trim() || customerDoc?.address || 'Store Pickup',
      items: enrichedItems,
      totalAmount,
      deliveryCharge: dCharge,
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
      title: 'New Customer Order Placed',
      message: `Order #${order.orderNumber} received from ${order.customerName} (${items.length} items)`,
      severity: 'info',
      relatedId: order._id,
      relatedModel: 'Order',
      forRoles: ['admin', 'manager', 'cashier'],
    });

    // Send WhatsApp order confirmation asynchronously
    whatsappService.sendOrderPlacedAutoMessage(order).catch(e => console.error('[WhatsApp] Order confirmation error:', e));

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order placed successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id — update order details (e.g. delivery charge, address, notes)
router.put('/:id', protect, async (req, res) => {
  try {
    const { deliveryCharge, deliveryAddress, notes, customerName, customerMobile } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (deliveryCharge !== undefined) {
      order.deliveryCharge = Math.max(0, Number(deliveryCharge) || 0);
    }
    if (deliveryAddress !== undefined) order.deliveryAddress = deliveryAddress.trim();
    if (notes !== undefined) order.notes = notes;
    if (customerName) order.customerName = customerName.trim();
    if (customerMobile) order.customerMobile = customerMobile.trim();

    order.lastUpdatedBy = req.user.name || 'Staff';
    order.lastUpdatedByRole = req.user.role || 'staff';

    await order.save();
    res.json({ success: true, data: order, message: 'Order details updated successfully' });
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
        ? `Order #${order.orderNumber} Accepted by ${req.user.name}`
        : `Order #${order.orderNumber} Marked as "${status.replace(/_/g, ' ')}" by ${req.user.name}`;

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

    // Send WhatsApp status update asynchronously
    whatsappService.sendOrderStatusAutoMessage(order, status).catch(e => console.error('[WhatsApp] Status update error:', e));

    await auditService.log({
      user: req.user,
      action: 'order_status_updated',
      module: 'orders',
      recordId: order._id,
      recordRef: order.orderNumber,
      description: `${req.user.name} (${req.user.role}) changed Order #${order.orderNumber} status to "${status.replace(/_/g, ' ')}"`
    });

    res.json({ success: true, data: order, message: `Order status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/accept — packer or staff accepts the incoming order
router.put('/:id/accept', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.status !== 'pending' && order.acceptedByName) {
      return res.status(400).json({
        success: false,
        message: `Order #${order.orderNumber} was already accepted by ${order.acceptedByName}`
      });
    }

    order.status = 'confirmed';
    order.acceptedBy = req.user._id;
    order.acceptedByName = req.user.name || 'Packer Staff';
    order.acceptedByRole = req.user.role || 'packer';
    order.acceptedAt = new Date();

    if (!order.confirmedByName) {
      order.confirmedBy = req.user._id;
      order.confirmedByName = req.user.name || 'Packer Staff';
      order.confirmedByRole = req.user.role || 'packer';
      order.confirmedAt = new Date();
    }

    order.lastUpdatedBy = req.user.name || 'Packer Staff';
    order.lastUpdatedByRole = req.user.role || 'packer';

    if (!order.statusLogs) order.statusLogs = [];
    order.statusLogs.push({
      status: 'confirmed',
      changedBy: req.user.name || 'Packer Staff',
      changedByRole: req.user.role || 'packer',
      changedAt: new Date()
    });

    await order.save();

    try {
      await Notification.create({
        type: 'new_order',
        title: `Order #${order.orderNumber} Accepted by ${req.user.name}`,
        message: `${req.user.name} (${req.user.role}) accepted Order #${order.orderNumber} and is preparing it for packing.`,
        severity: 'success',
        relatedId: order._id,
        relatedModel: 'Order',
      });
    } catch (notifErr) {
      console.error('Order accept notification error:', notifErr);
    }

    whatsappService.sendOrderStatusAutoMessage(order, 'confirmed')
      .catch(e => console.error('[WhatsApp] Status update error:', e));

    await auditService.log({
      user: req.user,
      action: 'order_accepted',
      module: 'orders',
      recordId: order._id,
      recordRef: order.orderNumber,
      description: `${req.user.name} (${req.user.role}) accepted Order #${order.orderNumber}`
    });

    res.json({
      success: true,
      data: order,
      message: `Order #${order.orderNumber} accepted successfully by ${req.user.name}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/assign - assign an order to an available packer or staff member (admin, cashier, manager only)
router.put('/:id/assign', protect, authorize('admin', 'cashier', 'manager'), async (req, res) => {
  try {
    const { packerId, packerName } = req.body;
    if (!packerId) return res.status(400).json({ success: false, message: 'Packer ID is required' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const targetUser = await User.findById(packerId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Assigned staff user not found' });

    order.assignedTo = targetUser._id;
    order.assignedToName = targetUser.name || packerName;
    order.assignedToRole = targetUser.role || 'packer';
    order.assignedAt = new Date();
    order.assignedBy = req.user._id;
    order.assignedByName = req.user.name || 'Staff';

    order.lastUpdatedBy = req.user.name || 'Staff';
    order.lastUpdatedByRole = req.user.role || 'staff';

    if (!order.statusLogs) order.statusLogs = [];
    order.statusLogs.push({
      status: order.status,
      changedBy: req.user.name || 'Staff',
      changedByRole: req.user.role || 'staff',
      changedAt: new Date(),
    });

    await order.save();

    // Create Notification for the assigned packer
    try {
      await Notification.create({
        type: 'new_order',
        title: `Order #${order.orderNumber} Assigned to ${targetUser.name}`,
        message: `${req.user.name} assigned Order #${order.orderNumber} (${order.customerName || 'Customer'}) to ${targetUser.name} for packing.`,
        severity: 'info',
        relatedId: order._id,
        relatedModel: 'Order',
      });
    } catch (notifErr) {
      console.error('Order assign notification error:', notifErr);
    }

    res.json({
      success: true,
      data: order,
      message: `Order #${order.orderNumber} assigned to ${targetUser.name} successfully`
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

    await auditService.log({
      user: req.user,
      action: 'order_sent_to_billing',
      module: 'orders',
      recordId: order._id,
      recordRef: order.orderNumber,
      description: `${req.user.name} (${req.user.role}) sent Order #${order.orderNumber} to POS Billing`
    });

    // Create prominent notification for Cashier
    try {
      await Notification.create({
        type: 'new_order',
        title: `Order #${order.orderNumber} Sent to POS by ${req.user.name}`,
        message: `${req.user.name} (${req.user.role}) accepted & sent Order #${order.orderNumber} for ${order.customerName || 'Customer'} to the Billing Counter.`,
        severity: 'info',
        relatedId: order._id,
        relatedModel: 'Order',
      });
    } catch (notifErr) {
      console.error('Send to billing notification error:', notifErr);
    }

    res.json({ success: true, data: order, message: 'Order sent to billing POS' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/items/:itemId/pack — toggle item packed status for packing staff checklist
router.put('/:id/items/:itemId/pack', protect, async (req, res) => {
  try {
    const { isPacked } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found in order' });

    item.isPacked = isPacked !== undefined ? isPacked : !item.isPacked;
    item.packedBy = item.isPacked ? (req.user.name || 'Staff') : undefined;
    item.packedAt = item.isPacked ? new Date() : undefined;

    // Check if all items in order are packed
    const allPacked = order.items.length > 0 && order.items.every(it => it.isPacked);
    order.isFullyPacked = allPacked;
    if (allPacked) {
      order.packingCompletedAt = new Date();
      if (order.status === 'confirmed' || order.status === 'pending') {
        order.status = 'packing';
      }
    }

    order.lastUpdatedBy = req.user.name || 'Staff';
    order.lastUpdatedByRole = req.user.role || 'staff';

    await order.save();
    res.json({ success: true, data: order, message: `Item marked as ${item.isPacked ? 'packed' : 'unpacked'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/pack-all — mark all items in order as packed
router.put('/:id/pack-all', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.items.forEach(it => {
      it.isPacked = true;
      it.packedBy = req.user.name || 'Staff';
      it.packedAt = new Date();
    });
    order.isFullyPacked = true;
    order.packingCompletedAt = new Date();
    if (order.status === 'confirmed' || order.status === 'pending') {
      order.status = 'packing';
    }

    order.lastUpdatedBy = req.user.name || 'Staff';
    order.lastUpdatedByRole = req.user.role || 'staff';

    await order.save();
    res.json({ success: true, data: order, message: 'All items marked as packed!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/items — edit order items, replace damaged products, change orderType (allowed even after billed)
router.put('/:id/items', protect, async (req, res) => {
  try {
    const { items, orderType, deliveryCharge, deliveryAddress, customerName, customerMobile, notes } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (orderType && ['online', 'offline'].includes(orderType)) {
      order.orderType = orderType;
    }
    if (deliveryCharge !== undefined) {
      order.deliveryCharge = Math.max(0, Number(deliveryCharge) || 0);
    }
    if (deliveryAddress !== undefined) order.deliveryAddress = deliveryAddress.trim();
    if (customerName !== undefined) order.customerName = customerName.trim();
    if (customerMobile !== undefined) order.customerMobile = customerMobile.trim();
    if (notes !== undefined) order.notes = notes;

    if (Array.isArray(items) && items.length > 0) {
      let itemsTotal = 0;
      const newItems = [];
      for (const item of items) {
        let uPrice = Number(item.unitPrice || item.sellingPrice || 0);
        let pName = item.productName || item.name;
        let pUnit = item.unit;
        if ((!uPrice || !pName) && item.product) {
          const pDoc = await Product.findById(item.product);
          if (pDoc) {
            if (!uPrice) uPrice = pDoc.sellingPrice || 0;
            if (!pName) pName = pDoc.name;
            if (!pUnit) pUnit = pDoc.unit?.symbol || 'unit';
          }
        }
        const qty = Math.max(1, Number(item.quantity) || 1);
        const tPrice = uPrice * qty;
        itemsTotal += tPrice;

        newItems.push({
          product: item.product,
          productName: pName || 'Grocery Item',
          quantity: qty,
          unit: pUnit || 'unit',
          unitPrice: uPrice,
          totalPrice: tPrice,
          notes: item.notes || '',
          isPacked: !!item.isPacked,
          packedBy: item.isPacked ? (item.packedBy || req.user.name) : undefined,
          packedAt: item.isPacked ? (item.packedAt || new Date()) : undefined
        });
      }
      order.items = newItems;
      order.totalAmount = itemsTotal + (order.deliveryCharge || 0);
      order.isFullyPacked = newItems.every(it => it.isPacked);
    }

    order.lastUpdatedBy = req.user.name || 'Staff';
    order.lastUpdatedByRole = req.user.role || 'staff';

    if (!order.statusLogs) order.statusLogs = [];
    order.statusLogs.push({
      status: order.status,
      changedBy: req.user.name || 'Staff',
      changedByRole: req.user.role || 'staff',
      changedAt: new Date()
    });

    await order.save();

    await auditService.log({
      user: req.user,
      action: 'order_items_updated',
      module: 'orders',
      recordId: order._id,
      recordRef: order.orderNumber,
      description: `${req.user.name} (${req.user.role}) updated items and details for Order #${order.orderNumber}`
    });

    const updated = await Order.findById(order._id)
      .populate('customer', 'name mobile address')
      .populate('items.product', 'name sellingPrice unit');

    res.json({ success: true, data: updated, message: 'Order details and items updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/payment — record payment collected by delivery boy (Cash/UPI) or shop scanner
router.put('/:id/payment', protect, async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paidAmount, cashAmount, upiAmount, upiTransactionId, collectedBy } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (paymentStatus) order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (paidAmount !== undefined) order.paidAmount = Number(paidAmount) || 0;
    if (cashAmount !== undefined) order.cashAmount = Number(cashAmount) || 0;
    if (upiAmount !== undefined) order.upiAmount = Number(upiAmount) || 0;
    if (upiTransactionId !== undefined) order.upiTransactionId = String(upiTransactionId).trim();
    if (collectedBy) order.collectedBy = collectedBy;
    order.paidAt = new Date();

    order.lastUpdatedBy = req.user.name || 'Staff';
    order.lastUpdatedByRole = req.user.role || 'staff';

    await order.save();

    await auditService.log({
      user: req.user,
      action: 'order_payment_recorded',
      module: 'orders',
      recordId: order._id,
      recordRef: order.orderNumber,
      description: `${req.user.name} recorded ${order.paymentMethod.toUpperCase()} payment of ₹${order.paidAmount} for Order #${order.orderNumber} (Collected by: ${order.collectedBy || 'Staff'})`
    });

    res.json({ success: true, data: order, message: 'Payment details recorded successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
