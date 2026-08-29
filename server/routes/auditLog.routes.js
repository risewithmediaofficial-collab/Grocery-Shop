const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models/System');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { module, user, dateFrom, dateTo, page = 1, limit = 30 } = req.query;
    const query = {};
    if (module) query.module = module;
    if (user) query.user = user;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
    }
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query).populate('user', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
    res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
