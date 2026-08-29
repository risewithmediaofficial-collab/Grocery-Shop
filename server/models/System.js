const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['low_stock', 'out_of_stock', 'expiry_soon', 'expired', 'new_order', 'payment_due', 'supplier_payment_due', 'purchase_received', 'stock_adjustment', 'general'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedModel: { type: String },
  severity: { type: String, enum: ['info', 'warning', 'error', 'success'], default: 'info' },
  forRoles: [{ type: String }],  // which roles see this
}, { timestamps: true });

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ isRead: 1 });

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String },
  action: { type: String, required: true },  // e.g., 'price_changed', 'stock_adjusted'
  module: { type: String, required: true },  // e.g., 'products', 'sales'
  recordId: { type: mongoose.Schema.Types.ObjectId },
  recordRef: { type: String },               // human-readable reference
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  description: { type: String },
}, { timestamps: true });

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ module: 1 });
auditLogSchema.index({ createdAt: -1 });

const settingSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  group: { type: String },
  label: { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const savedBasketSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  name: { type: String, required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    defaultQty: { type: Number, default: 1 },
  }],
}, { timestamps: true });

module.exports = {
  Notification: mongoose.model('Notification', notificationSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  Setting: mongoose.model('Setting', settingSchema),
  SavedBasket: mongoose.model('SavedBasket', savedBasketSchema),
};
