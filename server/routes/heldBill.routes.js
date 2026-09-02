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
    const { items, customer, customerName, customerMobile, discount, discountType, notes, subtotal, totalTax, grandTotal } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty. Cannot hold an empty bill.' });
    }

    const isValidObjectId = (id) => id && typeof id === 'string' && id.match(/^[0-9a-fA-F]{24}$/);

    const customerId = isValidObjectId(customer?._id)
      ? customer._id
      : isValidObjectId(customer)
      ? customer
      : null;

    const finalCustomerName = customerName || customer?.name || (typeof customer === 'string' && !isValidObjectId(customer) ? customer : '') || 'Walk-in Customer';
    const finalCustomerMobile = customerMobile || customer?.mobile || '';

    const billItems = items.map(item => {
      const pId = isValidObjectId(item.product) ? item.product : isValidObjectId(item._id) ? item._id : undefined;
      return {
        product: pId,
        _id: String(item._id || item.productId || Date.now()),
        productId: item.productId,
        name: item.name || 'Grocery Item',
        sku: item.sku || '',
        barcode: item.barcode || '',
        sellingPrice: Number(item.sellingPrice) || 0,
        purchasePrice: Number(item.purchasePrice) || 0,
        customPrice: Number(item.customPrice || item.sellingPrice) || 0,
        gstRate: Number(item.gstRate) || 0,
        hsnCode: item.hsnCode || '',
        quantity: Math.max(1, Number(item.quantity) || 1),
        unit: typeof item.unit === 'object' ? item.unit?.symbol || item.unit?.name || '' : String(item.unit || ''),
        discount: Number(item.discount) || 0,
        discountType: item.discountType || 'percent',
        taxType: item.taxType || 'exclusive',
      };
    });

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedBillNumber = `HELD-${Date.now().toString().slice(-4)}${randomSuffix}`;

    const heldBill = await HeldBill.create({
      billNumber: generatedBillNumber,
      items: billItems,
      customer: customerId,
      customerName: finalCustomerName,
      customerMobile: finalCustomerMobile,
      discount: Number(discount) || 0,
      discountType: discountType || 'amount',
      notes: notes || '',
      subtotal: Number(subtotal) || 0,
      totalTax: Number(totalTax) || 0,
      grandTotal: Number(grandTotal) || 0,
      status: 'held',
      createdBy: req.user?._id || null,
    });

    res.status(201).json({
      success: true,
      data: heldBill,
      message: `Bill ${heldBill.billNumber} held successfully in database.`
    });
  } catch (err) {
    console.error('Error holding bill in database:', err);
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
