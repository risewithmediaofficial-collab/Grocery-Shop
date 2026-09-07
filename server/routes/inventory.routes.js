const express = require('express');
const router = express.Router();
const { StockMovement, StockAdjustment, Batch } = require('../models/Inventory');
const { Notification } = require('../models/System');
const Product = require('../models/Product');
const stockService = require('../services/stock.service');
const auditService = require('../services/audit.service');
const { protect, authorize } = require('../middleware/auth');

// GET /api/inventory/movements — stock ledger
router.get('/movements', protect, async (req, res) => {
  try {
    const { product, type, dateFrom, dateTo, page = 1, limit = 30 } = req.query;
    const query = {};
    if (product) query.product = product;
    if (type) query.type = type;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
    }
    const total = await StockMovement.countDocuments(query);
    const movements = await StockMovement.find(query)
      .populate('product', 'name productId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, data: movements, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/inventory/adjustments
router.get('/adjustments', protect, async (req, res) => {
  try {
    const adjustments = await StockAdjustment.find()
      .populate('product', 'name productId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: adjustments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/inventory/adjust — stock adjustment
router.post('/adjust', protect, authorize('admin', 'manager', 'cashier', 'packer'), async (req, res) => {
  try {
    const { productId, adjustedQty, reason, type, notes } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const currentStock = product.currentStock;
    const newStock = currentStock + adjustedQty;
    if (newStock < 0) return res.status(400).json({ success: false, message: 'Stock cannot go below 0' });

    const count = await StockAdjustment.countDocuments();
    const fullReason = reason + (notes ? ` - ${notes}` : '');
    const adjustment = await StockAdjustment.create({
      adjustmentNumber: `ADJ-${String(count + 1).padStart(5, '0')}`,
      product: product._id,
      currentStock,
      adjustedQty,
      newStock,
      reason: fullReason,
      type: type || (adjustedQty < 0 ? 'reduction' : 'correction'),
      createdBy: req.user._id,
      approvedBy: req.user._id,
    });

    await stockService.changeStock(product._id, adjustedQty, 'adjustment', {
      reference: adjustment.adjustmentNumber,
      referenceId: adjustment._id,
      reason: fullReason,
      createdBy: req.user._id,
    });

    if (adjustedQty < 0) {
      const unitsReduced = Math.abs(adjustedQty);
      // Log Unbilled Stock Reduction in Audit Trail
      await auditService.log({
        user: req.user,
        action: 'unbilled_stock_reduction',
        module: 'inventory',
        recordId: product._id,
        recordRef: product.productId || product.name,
        oldValue: { stock: currentStock },
        newValue: {
          stock: newStock,
          reducedBy: unitsReduced,
          reason,
          notes: notes || '',
          financialLoss: unitsReduced * (product.purchasePrice || product.sellingPrice || 0)
        },
        description: `Staff ${req.user.name || 'User'} reduced ${product.name} stock by ${unitsReduced} units (${currentStock} → ${newStock}). Reason: ${reason}${notes ? ` - Note: "${notes}"` : ''}`
      });

      // Real-time Notification for Admin
      try {
        await Notification.create({
          type: 'stock_adjustment',
          title: 'Unbilled Stock Reduction',
          message: `${req.user.name || 'Staff'} reduced stock of "${product.name}" from ${currentStock} to ${newStock} (-${unitsReduced} units). Reason: ${reason}${notes ? ` (${notes})` : ''}`,
          severity: 'warning',
          forRoles: ['admin'],
          relatedId: product._id,
          relatedModel: 'Product',
        });
      } catch (notifErr) {
        console.error('Notification error on stock adjustment:', notifErr.message);
      }
    } else {
      await auditService.log({
        user: req.user,
        action: 'stock_adjusted',
        module: 'inventory',
        recordId: product._id,
        recordRef: product.productId,
        oldValue: { stock: currentStock },
        newValue: { stock: newStock, reason: fullReason }
      });
    }

    res.status(201).json({ success: true, data: adjustment, message: 'Stock adjusted successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/inventory/batches
router.get('/batches', protect, async (req, res) => {
  try {
    const { product, status, expiringIn } = req.query;
    const query = {};
    if (product) query.product = product;
    if (status) query.status = status;
    if (expiringIn) {
      const daysAhead = new Date();
      daysAhead.setDate(daysAhead.getDate() + Number(expiringIn));
      query.expiryDate = { $lte: daysAhead, $gte: new Date() };
      query.status = 'active';
    }
    const batches = await Batch.find(query)
      .populate('product', 'name productId')
      .populate('supplier', 'name')
      .sort({ expiryDate: 1 });
    res.json({ success: true, data: batches });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/inventory/expiry-summary
router.get('/expiry-summary', protect, async (req, res) => {
  try {
    const now = new Date();
    const in7 = new Date(); in7.setDate(in7.getDate() + 7);
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const in60 = new Date(); in60.setDate(in60.getDate() + 60);

    const [expired, within7, within30, within60] = await Promise.all([
      Batch.find({ expiryDate: { $lt: now }, status: 'active' }).populate('product', 'name productId'),
      Batch.find({ expiryDate: { $gte: now, $lte: in7 }, status: 'active' }).populate('product', 'name productId'),
      Batch.find({ expiryDate: { $gt: in7, $lte: in30 }, status: 'active' }).populate('product', 'name productId'),
      Batch.find({ expiryDate: { $gt: in30, $lte: in60 }, status: 'active' }).populate('product', 'name productId'),
    ]);

    res.json({ success: true, data: { expired, within7, within30, within60 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
