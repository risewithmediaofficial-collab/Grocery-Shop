const express = require('express');
const router = express.Router();
const { Setting } = require('../models/System');
const { protect, authorize } = require('../middleware/auth');

// GET all settings
router.get('/', protect, async (req, res) => {
  try {
    const settings = await Setting.find();
    const result = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/settings/:key
router.put('/:key', protect, authorize('admin'), async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: setting, message: 'Setting saved' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
