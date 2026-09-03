const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Supplier = require('../models/Supplier');
const { SupplierLedger } = require('../models/Ledger');
const { Batch } = require('../models/Inventory');
const stockService = require('../services/stock.service');
const auditService = require('../services/audit.service');
const { protect, authorize } = require('../middleware/auth');

// GET /api/purchases
router.get('/', protect, async (req, res) => {
  try {
    const { search, supplier, status, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.purchaseNumber = { $regex: search, $options: 'i' };
    if (supplier) query.supplier = supplier;
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.purchaseDate = {};
      if (dateFrom) query.purchaseDate.$gte = new Date(dateFrom);
      if (dateTo) query.purchaseDate.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
    }
    const total = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query).populate('supplier', 'name company mobile').sort({ purchaseDate: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data: purchases, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/purchases/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id).populate('supplier').populate('createdBy', 'name');
    if (!purchase) return res.status(404).json({ success: false, message: 'Purchase not found' });
    res.json({ success: true, data: purchase });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/purchases — Receive a purchase
router.post('/', protect, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { supplierId, items, grandTotal, invoiceNumber, notes, paymentStatus, amountPaid } = req.body;

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    // Calculate totals
    let subtotal = 0, totalTax = 0;
    for (const item of items) {
      item.totalAmount = item.purchasePrice * item.quantity;
      subtotal += item.totalAmount;
      if (item.gstRate) totalTax += (item.totalAmount * item.gstRate) / 100;
      // Store product name at time of record
      const { Product } = require('../models/Product');
    }
    const Product = require('../models/Product');

    const purchase = await Purchase.create({
      supplier: supplier._id,
      supplierId: supplier.supplierId,
      supplierName: supplier.name,
      items,
      subtotal,
      totalTax,
      grandTotal: grandTotal || subtotal + totalTax,
      status: 'received',
      paymentStatus: paymentStatus || 'unpaid',
      amountPaid: amountPaid || 0,
      dueAmount: (grandTotal || subtotal + totalTax) - (amountPaid || 0),
      invoiceNumber,
      notes,
      createdBy: req.user._id,
    });

    // Increase stock & create batches
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      
      item.productName = product.name;
      
      // Update stock
      await stockService.changeStock(
        item.product, item.quantity, 'purchase',
        { reference: purchase.purchaseNumber, referenceId: purchase._id, createdBy: req.user._id }
      );

      // Create batch if tracking enabled or expiry date provided
      if (product.batchTracking || product.expiryTracking || item.expiryDate) {
        await Batch.create({
          batchNumber: item.batchNumber || `B-${Date.now()}`,
          product: item.product,
          supplier: supplier._id,
          purchase: purchase._id,
          purchaseDate: new Date(),
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          purchasePrice: item.purchasePrice,
          quantity: item.quantity,
          remainingQty: item.quantity,
        });
      }
    }

    // Update supplier ledger
    const balanceBefore = supplier.outstandingBalance || 0;
    const balanceAfter = balanceBefore + (purchase.grandTotal - (amountPaid || 0));
    await SupplierLedger.create({
      supplier: supplier._id,
      type: 'purchase', amount: purchase.grandTotal,
      reference: purchase.purchaseNumber, referenceId: purchase._id,
      balanceBefore, balanceAfter,
      description: `Purchase - ${purchase.purchaseNumber}`,
      createdBy: req.user._id,
    });
    supplier.outstandingBalance = balanceAfter;
    await supplier.save();

    await auditService.log({ user: req.user, action: 'purchase_received', module: 'purchases', recordId: purchase._id, recordRef: purchase.purchaseNumber });

    res.status(201).json({ success: true, data: purchase, message: 'Purchase recorded successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
