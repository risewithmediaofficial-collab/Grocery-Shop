const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { CustomerLedger } = require('../models/Ledger');
const { Setting } = require('../models/System');
const stockService = require('../services/stock.service');
const auditService = require('../services/audit.service');
const whatsappService = require('../services/whatsapp.service');
const { protect } = require('../middleware/auth');

/**
 * GST calculation helper
 */
function calculateGST(sellingPrice, quantity, discount, discountType, gstRate, taxType, isInterState) {
  let basePrice = sellingPrice * quantity;
  let discountAmount = 0;
  if (discountType === 'percent') discountAmount = (basePrice * discount) / 100;
  else discountAmount = discount;
  
  const priceAfterDiscount = basePrice - discountAmount;
  
  let taxableAmount, taxAmount, cgst = 0, sgst = 0, igst = 0;
  
  if (taxType === 'inclusive') {
    taxableAmount = priceAfterDiscount / (1 + gstRate / 100);
    taxAmount = priceAfterDiscount - taxableAmount;
  } else {
    taxableAmount = priceAfterDiscount;
    taxAmount = (taxableAmount * gstRate) / 100;
  }
  
  if (isInterState) {
    igst = taxAmount;
  } else {
    cgst = taxAmount / 2;
    sgst = taxAmount / 2;
  }
  
  const totalAmount = taxType === 'inclusive' ? priceAfterDiscount : priceAfterDiscount + taxAmount;
  
  return { discountAmount, taxableAmount, taxAmount, cgst, sgst, igst, totalAmount };
}

// GET /api/sales
router.get('/', protect, async (req, res) => {
  try {
    const { search, customer, dateFrom, dateTo, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) query.$or = [{ invoiceNumber: { $regex: search, $options: 'i' } }, { customerName: { $regex: search, $options: 'i' } }];
    if (customer) query.customer = customer;
    if (status) query.status = status;
    if (dateFrom || dateTo) {
      query.saleDate = {};
      if (dateFrom) query.saleDate.$gte = new Date(dateFrom);
      if (dateTo) query.saleDate.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
    }
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query).populate('customer', 'name mobile customerId').sort({ saleDate: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data: sales, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/sales/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer', 'name mobile address customerId').populate('createdBy', 'name');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    res.json({ success: true, data: sale });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/sales — Complete a sale (THE CORE TRANSACTION)
router.post('/', protect, async (req, res) => {
  try {
    const { customerId, items, discount, paymentMethod, paymentDetails, amountPaid, notes } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'No items in cart' });

    // Get shop settings for invoice number & GST
    const settingDoc = await Setting.findOne({ key: 'shop' });
    const shopSettings = settingDoc?.value || { invoicePrefix: 'INV', invoiceNumber: 1, state: 'Tamil Nadu' };

    // Get customer info
    let customer = null;
    let customerName = 'Walk-in Customer';
    let customerMobile = '';
    let customerState = shopSettings.state;
    if (customerId) {
      customer = await Customer.findById(customerId);
      if (customer) {
        customerName = customer.name;
        customerMobile = customer.mobile;
        customerState = customer.state || shopSettings.state;
      }
    }

    const isInterState = customerState !== (shopSettings.state || 'Tamil Nadu');

    // Build sale items with GST snapshots
    let subtotal = 0, totalDiscount = 0, totalTaxableAmount = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalTax = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product).populate('unit', 'symbol');
      if (!product) throw new Error(`Product not found: ${item.product}`);
      if (product.currentStock < item.quantity) throw new Error(`Insufficient stock for ${product.name}. Available: ${product.currentStock}`);

      const gst = calculateGST(
        item.sellingPrice || product.sellingPrice,
        item.quantity,
        item.discount || 0,
        item.discountType || 'percent',
        product.gstRate,
        product.taxType,
        isInterState
      );

      subtotal += (item.sellingPrice || product.sellingPrice) * item.quantity;
      totalDiscount += gst.discountAmount;
      totalTaxableAmount += gst.taxableAmount;
      totalCGST += gst.cgst;
      totalSGST += gst.sgst;
      totalIGST += gst.igst;
      totalTax += gst.taxAmount;

      saleItems.push({
        product: product._id,
        productId: product.productId,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        hsnCode: product.hsnCode,
        gstRate: product.gstRate,
        quantity: item.quantity,
        unit: product.unit?.symbol || '',
        purchasePrice: product.purchasePrice,
        sellingPrice: item.sellingPrice || product.sellingPrice,
        mrp: item.mrp || product.mrp || (item.sellingPrice || product.sellingPrice),
        discount: item.discount || 0,
        discountType: item.discountType || 'percent',
        taxableAmount: gst.taxableAmount,
        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,
        taxAmount: gst.taxAmount,
        totalAmount: gst.totalAmount,
      });
    }

    const billDiscount = Number(discount || 0);
    totalDiscount += billDiscount;
    const grandTotalRaw = Math.max(0, totalTaxableAmount + totalTax - billDiscount);
    const grandTotal = Math.round(grandTotalRaw);
    const roundOff = grandTotal - (totalTaxableAmount + totalTax - billDiscount);

    const isCredit = paymentMethod === 'credit' || (amountPaid < grandTotal);
    const amountDue = grandTotal - (amountPaid || 0);

    // Generate invoice number
    const invoiceNumber = `${shopSettings.invoicePrefix}-${String(shopSettings.invoiceNumber || 1).padStart(6, '0')}`;
    await Setting.findOneAndUpdate({ key: 'shop' }, { $inc: { 'value.invoiceNumber': 1 } }, { upsert: true });

    const sale = await Sale.create({
      invoiceNumber,
      customer: customer?._id,
      customerId: customer?.customerId,
      customerName,
      customerMobile,
      items: saleItems,
      subtotal,
      totalDiscount,
      totalTaxableAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      roundOff,
      grandTotal,
      paymentMethod,
      paymentDetails: paymentDetails || [{ method: paymentMethod, amount: amountPaid || grandTotal }],
      amountPaid: amountPaid || grandTotal,
      amountDue,
      changeReturned: amountPaid > grandTotal ? amountPaid - grandTotal : 0,
      isCredit,
      status: 'completed',
      createdBy: req.user._id,
      notes,
      shopState: shopSettings.state,
      customerState,
      isInterState,
    });

    // Reduce stock
    await stockService.processSaleStock(saleItems, sale._id, invoiceNumber, req.user._id);

    // Update customer
    if (customer) {
      const wasBalance = customer.outstandingBalance;
      if (isCredit) customer.outstandingBalance = wasBalance + amountDue;
      customer.totalPurchases = (customer.totalPurchases || 0) + grandTotal;
      customer.totalBills = (customer.totalBills || 0) + 1;
      customer.lastPurchaseDate = new Date();
      customer.lastPurchaseAmount = grandTotal;
      await customer.save();

      // Customer ledger
      await CustomerLedger.create({
        customer: customer._id, type: 'sale',
        amount: isCredit ? amountDue : 0,
        reference: invoiceNumber, referenceId: sale._id,
        balanceBefore: wasBalance, balanceAfter: customer.outstandingBalance,
        description: `Sale - ${invoiceNumber}`, createdBy: req.user._id,
      });
    }

    await auditService.log({ user: req.user, action: 'sale_created', module: 'sales', recordId: sale._id, recordRef: invoiceNumber, newValue: { total: grandTotal, items: saleItems.length } });

    // Automatically send digital invoice receipt via WhatsApp
    whatsappService.sendSaleInvoiceAutoMessage(sale).catch(e => console.error('WhatsApp invoice error:', e));

    res.status(201).json({ success: true, data: sale, message: 'Sale completed successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/sales/:id/void — void a sale (admin only)
router.post('/:id/void', protect, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    if (sale.status === 'cancelled') return res.status(400).json({ success: false, message: 'Sale already cancelled' });
    sale.status = 'cancelled';
    await sale.save();
    await auditService.log({ user: req.user, action: 'sale_voided', module: 'sales', recordId: sale._id, recordRef: sale.invoiceNumber, description: req.body.reason });
    res.json({ success: true, message: 'Sale voided successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
