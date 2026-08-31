const express = require('express');
const router = express.Router();
const HeldBill = require('../models/HeldBill');
const { protect } = require('../middleware/auth');

// GET /api/held-bills — List all active held bills
router.get('/', protect, async (req, res) => {
  try {
    const heldBills = await HeldBill.find({ status: 'held' })
      .populate('customer', 'name mobile customerId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: heldBills });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/held-bills — Create a new held bill in the database
router.post('/', protect, async (req, res) => {
  try {
    const { items, customer, discount, discountType, notes, subtotal, totalTax, grandTotal } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty. Cannot hold an empty bill.' });
    }

    const heldBill = await HeldBill.create({
      items: items.map(item => ({
        product: item._id || item.product,
        _id: item._id,
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        barcode: item.barcode,
        sellingPrice: item.sellingPrice,
        purchasePrice: item.purchasePrice || 0,
        customPrice: item.customPrice || item.sellingPrice,
        gstRate: item.gstRate || 0,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        unit: item.unit?.name || item.unit || '',
        discount: item.discount || 0,
        discountType: item.discountType || 'percent',
        taxType: item.taxType || 'exclusive',
      })),
      customer: customer?._id || customer || null,
      customerName: customer?.name || '',
      customerMobile: customer?.mobile || '',
      discount: Number(discount) || 0,
      discountType: discountType || 'amount',
      notes: notes || '',
      subtotal: Number(subtotal) || 0,
      totalTax: Number(totalTax) || 0,
      grandTotal: Number(grandTotal) || 0,
      status: 'held',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: heldBill,
      message: `Bill ${heldBill.billNumber} held successfully in database.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/held-bills/:id/resume — Resume a held bill
router.post('/:id/resume', protect, async (req, res) => {
  try {
    const bill = await HeldBill.findById(req.params.id).populate('customer');
    if (!bill) return res.status(404).json({ success: false, message: 'Held bill not found' });
    
    // Mark as resumed or delete
    bill.status = 'resumed';
    await bill.save();

    res.json({ success: true, data: bill, message: 'Bill resumed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/held-bills/:id — Delete or discard a held bill
router.delete('/:id', protect, async (req, res) => {
  try {
    const bill = await HeldBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ success: false, message: 'Held bill not found' });
    
    await HeldBill.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Held bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
