const express = require('express');
const router = express.Router();
const WhatsAppLog = require('../models/WhatsAppLog');
const { Setting } = require('../models/System');
const { sendWhatsAppMessage, getWhatsAppSettings } = require('../services/whatsapp.service');
const { protect } = require('../middleware/auth');

// GET /api/whatsapp/logs — get recent automated messages
router.get('/logs', protect, async (req, res) => {
  try {
    const { page = 1, limit = 30, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { recipientMobile: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { messageText: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await WhatsAppLog.countDocuments(query);
    const logs = await WhatsAppLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/whatsapp/settings — get automation settings
router.get('/settings', protect, async (req, res) => {
  try {
    const settings = await getWhatsAppSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/whatsapp/settings — update automation settings
router.put('/settings', protect, async (req, res) => {
  try {
    let doc = await Setting.findOne({ key: 'whatsapp_automation' });
    if (!doc) {
      doc = await Setting.create({
        key: 'whatsapp_automation',
        value: req.body,
        group: 'integrations',
        label: 'WhatsApp Automation Settings',
        updatedBy: req.user._id
      });
    } else {
      doc.value = { ...doc.value, ...req.body };
      doc.updatedBy = req.user._id;
      await doc.save();
    }
    res.json({ success: true, data: doc.value, message: 'WhatsApp automation settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/whatsapp/test — trigger an automated test message
router.post('/test', protect, async (req, res) => {
  try {
    const { mobile, message, customerName } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: 'Mobile number is required' });

    const result = await sendWhatsAppMessage({
      to: mobile,
      customerName: customerName || 'Valued Customer',
      template: 'custom',
      messageText: message || `Hello! This is an automated test message from New Columbu Stores (Krishnagiri). WhatsApp Automation is active and running.`,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message || 'Failed to dispatch WhatsApp message' });
    }

    res.json({ success: true, data: result.log, message: `Automated test message dispatched to +91 ${mobile}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
