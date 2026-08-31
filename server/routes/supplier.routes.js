const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { SupplierLedger, SupplierPayment } = require('../models/Ledger');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { company: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }];
    if (status) query.status = status;
    const total = await Supplier.countDocuments(query);
    const suppliers = await Supplier.find(query).sort({ name: 1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data: suppliers, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/:id/ledger', protect, async (req, res) => {
  try {
    const ledger = await SupplierLedger.find({ supplier: req.params.id }).sort({ createdAt: 1 });
    res.json({ success: true, data: ledger });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ success: true, data: supplier, message: 'Supplier created successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', protect, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, data: supplier, message: 'Supplier updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/:id/payment', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    const { amount, paymentMethod, reference, notes } = req.body;
    const count = await SupplierPayment.countDocuments();
    const payment = await SupplierPayment.create({
      paymentNumber: `SPAY-${String(count + 1).padStart(5, '0')}`,
      supplier: supplier._id, amount, paymentMethod, reference, notes, createdBy: req.user._id,
    });
    const balanceBefore = supplier.outstandingBalance;
    const balanceAfter = balanceBefore - amount;
    await SupplierLedger.create({
      supplier: supplier._id, type: 'payment', amount: -amount,
      reference: payment.paymentNumber, referenceId: payment._id,
      balanceBefore, balanceAfter, description: `Payment - ${paymentMethod}`, createdBy: req.user._id,
    });
    supplier.outstandingBalance = balanceAfter;
    await supplier.save();
    res.status(201).json({ success: true, data: payment, message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
