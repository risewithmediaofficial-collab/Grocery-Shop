const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const Order = require('../models/Order');
const { CustomerLedger, CustomerPayment } = require('../models/Ledger');
const { protect, authorize } = require('../middleware/auth');

// In-memory OTP storage
const otpCache = new Map();

// POST /api/customers/otp/send — generate and send OTP for customer login
router.post('/otp/send', async (req, res) => {
  try {
    const { mobile } = req.body;
    const cleanMobile = String(mobile || '').trim().replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    }

    // Generate 6 digit OTP (e.g. 742189)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
    otpCache.set(cleanMobile, { otp, expiresAt });

    // Check if customer already exists in DB
    const existingCustomer = await Customer.findOne({ mobile: cleanMobile });

    res.json({
      success: true,
      message: `OTP sent successfully to +91 ${cleanMobile}`,
      otp, // provided for convenient testing & demo simulation
      isExisting: !!existingCustomer,
      customerName: existingCustomer?.name || '',
      customerAddress: existingCustomer?.address || '',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers/otp/verify — verify OTP and login/create customer
router.post('/otp/verify', async (req, res) => {
  try {
    const { mobile, otp, name, address } = req.body;
    const cleanMobile = String(mobile || '').trim().replace(/\D/g, '');
    if (!cleanMobile || !otp) {
      return res.status(400).json({ success: false, message: 'Mobile number and OTP are required' });
    }

    const cached = otpCache.get(cleanMobile);
    // Allow demo OTP 123456 or generated cached OTP
    const isValidOtp = (cached && cached.otp === String(otp).trim() && Date.now() <= cached.expiresAt) || String(otp).trim() === '123456';
    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
    }

    otpCache.delete(cleanMobile);

    let customer = await Customer.findOne({ mobile: cleanMobile });
    if (!customer) {
      customer = await Customer.create({
        name: name?.trim() || `Customer ${cleanMobile.slice(-4)}`,
        mobile: cleanMobile,
        address: address?.trim() || '',
        customerType: 'regular',
        city: 'Krishnagiri',
        state: 'Tamil Nadu'
      });
    } else {
      let updated = false;
      if (name?.trim() && name.trim() !== customer.name) {
        customer.name = name.trim();
        updated = true;
      }
      if (address?.trim() && address.trim() !== customer.address) {
        customer.address = address.trim();
        updated = true;
      }
      if (updated) await customer.save();
    }

    const token = jwt.sign(
      { id: customer._id, type: 'customer', mobile: customer.mobile },
      process.env.JWT_SECRET || 'grocery_secret_2026',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      customer
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/orders/my-orders — logged-in customer's order history
router.get('/orders/my-orders', async (req, res) => {
  try {
    const { mobile, customerId } = req.query;
    if (!mobile && !customerId) {
      return res.status(400).json({ success: false, message: 'Mobile or customer ID is required' });
    }

    const cleanMobile = mobile ? String(mobile).trim().replace(/\D/g, '') : null;
    const filter = {};
    if (customerId && cleanMobile) {
      filter.$or = [{ customer: customerId }, { customerMobile: cleanMobile }];
    } else if (customerId) {
      filter.customer = customerId;
    } else if (cleanMobile) {
      filter.customerMobile = cleanMobile;
    }

    const orders = await Order.find(filter)
      .populate('items.product', 'name sellingPrice unit')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers
router.get('/', protect, async (req, res) => {
  try {
    const { search, type, status, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { mobile: { $regex: search, $options: 'i' } },
      { customerId: { $regex: search, $options: 'i' } },
    ];
    if (type) query.customerType = type;
    if (status) query.status = status;
    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query).sort({ name: 1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data: customers, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/customers/search
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json({ success: true, data: [] });
    const queryStr = q.trim();

    // 1. Search registered Customers
    const customers = await Customer.find({
      $or: [
        { name: { $regex: queryStr, $options: 'i' } },
        { mobile: { $regex: queryStr, $options: 'i' } },
        { customerId: { $regex: queryStr, $options: 'i' } },
      ],
      status: 'active'
    }).limit(20);

    // 2. Also search past Sales by invoiceNumber, customerName, or customerMobile
    const matchingSales = await Sale.find({
      $or: [
        { invoiceNumber: { $regex: queryStr, $options: 'i' } },
        { customerName: { $regex: queryStr, $options: 'i' } },
        { customerMobile: { $regex: queryStr, $options: 'i' } },
      ],
      customerName: { $nin: ['', 'Walk-in Customer', null] }
    }).sort({ saleDate: -1 }).limit(10);

    const existingCustIds = new Set(customers.map(c => c._id.toString()));
    const existingCustNames = new Set(customers.map(c => (c.name || '').toLowerCase()));

    for (const sale of matchingSales) {
      if (sale.customer && !existingCustIds.has(sale.customer.toString())) {
        const custDoc = await Customer.findById(sale.customer);
        if (custDoc && !existingCustIds.has(custDoc._id.toString())) {
          const custObj = custDoc.toObject ? custDoc.toObject() : { ...custDoc };
          custObj.fromInvoice = sale.invoiceNumber;
          customers.push(custObj);
          existingCustIds.add(custDoc._id.toString());
          existingCustNames.add((custDoc.name || '').toLowerCase());
          continue;
        }
      }

      const nameLower = (sale.customerName || '').toLowerCase();
      if (nameLower && nameLower !== 'walk-in customer' && !existingCustNames.has(nameLower)) {
        customers.push({
          _id: sale.customer || sale._id,
          name: sale.customerName,
          mobile: sale.customerMobile || '',
          customerId: sale.customerId || '',
          fromInvoice: sale.invoiceNumber,
          lastPurchaseAmount: sale.grandTotal,
          lastPurchaseDate: sale.saleDate,
          isFromSale: true,
        });
        existingCustNames.add(nameLower);
      }
    }

    res.json({ success: true, data: customers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/customers/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/customers/:id/purchases — purchase history
router.get('/:id/purchases', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const sales = await Sale.find({ customer: req.params.id, status: { $ne: 'cancelled' } })
      .sort({ saleDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Sale.countDocuments({ customer: req.params.id, status: { $ne: 'cancelled' } });
    res.json({ success: true, data: sales, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/customers/:id/ledger
router.get('/:id/ledger', protect, async (req, res) => {
  try {
    const ledger = await CustomerLedger.find({ customer: req.params.id }).sort({ createdAt: 1 });
    res.json({ success: true, data: ledger });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/customers/:id/frequent-products — for POS
router.get('/:id/frequent-products', protect, async (req, res) => {
  try {
    const sales = await Sale.find({ customer: req.params.id, status: 'completed' });
    const freq = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.product?.toString();
        if (!key) continue;
        if (!freq[key]) freq[key] = { product: item.product, name: item.productName, count: 0, totalQty: 0 };
        freq[key].count++;
        freq[key].totalQty += item.quantity;
      }
    }
    const sorted = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 10);
    res.json({ success: true, data: sorted });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/customers
router.post('/', protect, async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer, message: 'Customer created successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/customers/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer, message: 'Customer updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/customers/:id/payment — record payment
router.post('/:id/payment', protect, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    const { amount, paymentMethod, reference, notes } = req.body;

    const count = await CustomerPayment.countDocuments();
    const payment = await CustomerPayment.create({
      paymentNumber: `CPAY-${String(count + 1).padStart(5, '0')}`,
      customer: customer._id,
      amount, paymentMethod, reference, notes,
      createdBy: req.user._id,
    });

    const balanceBefore = customer.outstandingBalance;
    const balanceAfter = balanceBefore - amount;
    await CustomerLedger.create({
      customer: customer._id,
      type: 'payment', amount: -amount,
      reference: payment.paymentNumber, referenceId: payment._id,
      balanceBefore, balanceAfter,
      description: `Payment received - ${paymentMethod}`,
      createdBy: req.user._id,
    });
    customer.outstandingBalance = balanceAfter;
    await customer.save();

    res.status(201).json({ success: true, data: payment, message: 'Payment recorded successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
