const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const { SaleReturn } = require('../models/Returns');
const stockService = require('../services/stock.service');
const { protect } = require('../middleware/auth');

// GET /api/invoices/:invoiceNumber — get by invoice number
router.get('/:invoiceNumber', protect, async (req, res) => {
  try {
    const sale = await Sale.findOne({ invoiceNumber: req.params.invoiceNumber })
      .populate('customer', 'name mobile address gstin customerId')
      .populate('createdBy', 'name');
    if (!sale) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: sale });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/invoices/return — process sale return
router.post('/return', protect, async (req, res) => {
  try {
    const { saleId, items, refundMethod, notes } = req.body;
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });

    let totalAmount = 0;
    const returnItems = items.map(item => {
      const saleItem = sale.items.find(si => si.product.toString() === item.product);
      if (!saleItem) throw new Error(`Item not found in original sale`);
      const itemTotal = saleItem.sellingPrice * item.quantity;
      totalAmount += itemTotal;
      return { ...item, productName: saleItem.productName, sellingPrice: saleItem.sellingPrice, gstRate: saleItem.gstRate, totalAmount: itemTotal };
    });

    const saleReturn = await SaleReturn.create({
      sale: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer,
      customerName: sale.customerName,
      returnDate: new Date(),
      items: returnItems,
      totalAmount,
      refundMethod,
      notes,
      createdBy: req.user._id,
    });

    // Add stock back
    await stockService.processSaleReturn(returnItems, saleReturn._id, saleReturn.returnNumber, req.user._id);

    // Update sale status
    sale.status = 'returned';
    await sale.save();

    res.status(201).json({ success: true, data: saleReturn, message: 'Return processed successfully' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

module.exports = router;
