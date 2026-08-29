const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const { category, dateFrom, dateTo, page = 1, limit = 30 } = req.query;
    const query = {};
    if (category) query.category = category;
    if (dateFrom || dateTo) {
      query.expenseDate = {};
      if (dateFrom) query.expenseDate.$gte = new Date(dateFrom);
      if (dateTo) query.expenseDate.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
    }
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query).sort({ expenseDate: -1 }).skip((page - 1) * limit).limit(Number(limit));
    const summary = await Expense.aggregate([{ $match: query }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    res.json({ success: true, data: expenses, total, totalAmount: summary[0]?.total || 0, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const expense = await Expense.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: expense, message: 'Expense recorded' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: expense });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
