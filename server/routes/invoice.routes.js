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

// POST /api/invoices/return — process sale return or product exchange
router.post('/return', protect, async (req, res) => {
  try {
    const { saleId, items, returnType = 'return', exchangeItems = [], refundMethod, notes } = req.body;
    const sale = await Sale.findById(saleId);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });

    let totalAmount = 0;
    const returnItems = (items || []).map(item => {
      const saleItem = sale.items.find(si => si.product.toString() === item.product);
      if (!saleItem) throw new Error(`Item not found in original sale`);
      const itemTotal = saleItem.sellingPrice * item.quantity;
      totalAmount += itemTotal;
      return { ...item, productName: saleItem.productName, sellingPrice: saleItem.sellingPrice, gstRate: saleItem.gstRate, totalAmount: itemTotal };
    });

    let formattedExchangeItems = [];
    let exchangeTotal = 0;
    if (returnType === 'exchange' && Array.isArray(exchangeItems) && exchangeItems.length > 0) {
      const Product = require('../models/Product');
      for (const ex of exchangeItems) {
        const pDoc = await Product.findById(ex.product);
        if (!pDoc) throw new Error(`Exchange product not found: ${ex.product}`);
        if (pDoc.currentStock < ex.quantity) {
          throw new Error(`Insufficient stock for exchange item ${pDoc.name}. Available: ${pDoc.currentStock}`);
        }
        const unitPrice = ex.sellingPrice !== undefined ? Number(ex.sellingPrice) : (pDoc.sellingPrice || 0);
        const exTotal = unitPrice * ex.quantity;
        exchangeTotal += exTotal;
        formattedExchangeItems.push({
          product: pDoc._id,
          productName: pDoc.name,
          quantity: ex.quantity,
          sellingPrice: unitPrice,
          gstRate: pDoc.gstRate || 0,
          totalAmount: exTotal
        });
      }
    }

    const diff = exchangeTotal - totalAmount;
    const differenceAmount = Math.abs(diff);
    const differenceAction = diff > 0 ? 'collected' : diff < 0 ? 'refunded' : 'even';

    const saleReturn = await SaleReturn.create({
      sale: sale._id,
      invoiceNumber: sale.invoiceNumber,
      customer: sale.customer,
      customerName: sale.customerName,
      returnDate: new Date(),
      items: returnItems,
      totalAmount,
      returnType,
      exchangeItems: formattedExchangeItems,
      differenceAmount,
      differenceAction,
      refundMethod: returnType === 'exchange' ? 'exchange' : (refundMethod || 'cash'),
      notes,
      createdBy: req.user._id,
    });

    // Add stock back for returned items
    if (returnItems.length > 0) {
      await stockService.processSaleReturn(returnItems, saleReturn._id, saleReturn.returnNumber, req.user._id);
    }

    // Deduct stock for exchange items given out to customer
    if (formattedExchangeItems.length > 0) {
      for (const ex of formattedExchangeItems) {
        await stockService.changeStock(ex.product, -ex.quantity, 'sale', {
          reference: saleReturn.returnNumber,
          referenceId: saleReturn._id,
          reason: `Exchange dispatch against ${sale.invoiceNumber}`,
          createdBy: req.user._id,
        });
      }
    }

    // Update sale status
    sale.status = returnType === 'exchange' ? 'completed' : 'returned';
    await sale.save();

    res.status(201).json({
      success: true,
      data: saleReturn,
      message: returnType === 'exchange'
        ? `Exchange processed! Difference: ${differenceAction === 'collected' ? `Collect ₹${differenceAmount}` : differenceAction === 'refunded' ? `Refund ₹${differenceAmount}` : 'Even swap'}`
        : 'Return processed successfully'
    });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

module.exports = router;
