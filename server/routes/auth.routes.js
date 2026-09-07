const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const auditService = require('../services/audit.service');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    email = String(email).trim().toLowerCase();
    const altEmail = email.includes('kolambu.com')
      ? email.replace('kolambu.com', 'columbu.com')
      : email.replace('columbu.com', 'kolambu.com');

    let user = await User.findOne({
      $or: [{ email }, { email: altEmail }]
    });

    // Auto-create demo packer staff if logging in with default credentials
    if (!user && (email === 'packer@columbu.com' || altEmail === 'packer@columbu.com') && password === 'packer123') {
      user = await User.create({
        name: 'Packer Staff',
        email: 'packer@columbu.com',
        password: 'packer123',
        role: 'packer',
        mobile: '9000000003',
        isActive: true
      });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid email or password. Use admin@columbu.com / admin123' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password. Use admin@columbu.com / admin123' });
    }

    // Update lastLogin without triggering full document validation
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } }).catch(() => {});

    await auditService.log({
      user,
      action: 'user_login',
      module: 'auth',
      description: `${user.name} (${user.role}) signed in to system`
    });

    res.json({ success: true, token: generateToken(user._id), user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
