const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
process.env.JWT_SECRET = process.env.JWT_SECRET || 'kolambu_super_secret_jwt_key_2024_change_in_production';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// Security Middleware
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate Limiting (in non-test environments)
if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: { success: false, message: 'Too many requests, please try again later.' }
  });
  app.use('/api/', limiter);
}

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger (development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth',            require('./routes/auth.routes'));
app.use('/api/products',        require('./routes/product.routes'));
app.use('/api/categories',      require('./routes/category.routes'));
app.use('/api/customers',       require('./routes/customer.routes'));
app.use('/api/suppliers',       require('./routes/supplier.routes'));
app.use('/api/inventory',       require('./routes/inventory.routes'));
app.use('/api/purchases',       require('./routes/purchase.routes'));
app.use('/api/sales',           require('./routes/sale.routes'));
app.use('/api/invoices',        require('./routes/invoice.routes'));
app.use('/api/payments',        require('./routes/payment.routes'));
app.use('/api/expenses',        require('./routes/expense.routes'));
app.use('/api/cash-register',   require('./routes/cashRegister.routes'));
app.use('/api/reports',         require('./routes/report.routes'));
app.use('/api/users',           require('./routes/user.routes'));
app.use('/api/notifications',   require('./routes/notification.routes'));
app.use('/api/audit-logs',      require('./routes/auditLog.routes'));
app.use('/api/settings',        require('./routes/setting.routes'));
app.use('/api/dashboard',       require('./routes/dashboard.routes'));
// ORDER ROUTES — Active & Ready for Ordering System
app.use('/api/orders',          require('./routes/order.routes'));
app.use('/api/held-bills',      require('./routes/heldBill.routes'));
app.use('/api/whatsapp',        require('./routes/whatsapp.routes'));

// Health Check — used by HAProxy + Docker HEALTHCHECK
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState; // 1 = connected
  if (process.env.NODE_ENV !== 'test' && dbState !== 1) {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Database not connected',
      db: dbState,
    });
  }
  res.json({
    success: true,
    status: 'healthy',
    message: 'New Columbu Stores API is running',
    instance: process.env.INSTANCE_ID || 'unknown',
    timestamp: new Date(),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('Global error:', err);
  }
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
