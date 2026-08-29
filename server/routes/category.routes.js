const express = require('express');
const router = express.Router();
const { Category, SubCategory, Brand, Unit } = require('../models/Category');
const { protect, authorize } = require('../middleware/auth');

// Categories
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/categories', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const cat = await Category.create({ name, slug, description });
    res.status(201).json({ success: true, data: cat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.put('/categories/:id', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: cat });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.delete('/categories/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Category deactivated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// SubCategories
router.get('/subcategories', protect, async (req, res) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };
    if (category) query.category = category;
    const subs = await SubCategory.find(query).populate('category', 'name').sort({ name: 1 });
    res.json({ success: true, data: subs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/subcategories', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const sub = await SubCategory.create(req.body);
    res.status(201).json({ success: true, data: sub });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Brands
router.get('/brands', protect, async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: brands });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/brands', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json({ success: true, data: brand });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Units
router.get('/units', protect, async (req, res) => {
  try {
    const units = await Unit.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: units });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.post('/units', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json({ success: true, data: unit });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
