const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { StockMovement } = require('../models/Inventory');
const { protect, authorize } = require('../middleware/auth');
const auditService = require('../services/audit.service');

// GET /api/products — list with search, filter, pagination
router.get('/', protect, async (req, res) => {
  try {
    const { search, category, status, lowStock, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
      { productId: { $regex: search, $options: 'i' } },
    ];
    if (category) query.category = category;
    if (status) query.status = status;
    if (lowStock === 'true') query.$expr = { $lte: ['$currentStock', '$reorderLevel'] };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('brand', 'name')
      .populate('unit', 'name symbol')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/products/barcode/:barcode — POS barcode lookup
router.get('/barcode/:barcode', protect, async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode, status: 'active' })
      .populate('unit', 'name symbol');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found for this barcode' });
    res.json({ success: true, data: product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/products/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category subCategory brand unit');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/products
router.post('/', protect, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const product = await Product.create(req.body);
    // Create opening stock movement
    if (product.openingStock > 0) {
      product.currentStock = product.openingStock;
      await product.save();
      await StockMovement.create({
        product: product._id, productId: product.productId, productName: product.name,
        type: 'opening', quantity: product.openingStock,
        balanceBefore: 0, balanceAfter: product.openingStock,
        reason: 'Opening stock', createdBy: req.user._id,
      });
    }
    await auditService.log({ user: req.user, action: 'product_created', module: 'products', recordId: product._id, recordRef: product.productId, newValue: { name: product.name } });
    res.status(201).json({ success: true, data: product, message: 'Product created successfully' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'SKU or Barcode already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', protect, authorize('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    const oldValues = { sellingPrice: existing.sellingPrice, purchasePrice: existing.purchasePrice, gstRate: existing.gstRate };
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    await auditService.log({ user: req.user, action: 'product_updated', module: 'products', recordId: product._id, recordRef: product.productId, oldValue: oldValues, newValue: { sellingPrice: product.sellingPrice, purchasePrice: product.purchasePrice, gstRate: product.gstRate } });
    res.json({ success: true, data: product, message: 'Product updated successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/products/:id (soft delete — admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { status: 'discontinued' }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await auditService.log({ user: req.user, action: 'product_deleted', module: 'products', recordId: product._id, recordRef: product.productId });
    res.json({ success: true, message: 'Product discontinued successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
