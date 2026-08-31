const express = require('express');
const router = express.Router();
const { Notification } = require('../models/System');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const roleQuery = {
      $or: [
        { forRoles: { $in: [req.user.role] } },
        { forRoles: { $size: 0 } },
        { forRoles: { $exists: false } },
        { forRoles: null }
      ]
    };
    const notifications = await Notification.find(roleQuery).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({
      isRead: false,
      ...roleQuery
    });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, $addToSet: { readBy: req.user._id } });
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany({
      $or: [{ forRoles: { $in: [req.user.role] } }, { forRoles: { $size: 0 } }, { forRoles: { $exists: false } }]
    }, { isRead: true });
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
