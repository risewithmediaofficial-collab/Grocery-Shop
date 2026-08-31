const mongoose = require('mongoose');

const whatsAppLogSchema = new mongoose.Schema({
  recipientMobile: { type: String, required: true, trim: true },
  customerName: { type: String, default: 'Valued Customer' },
  template: {
    type: String,
    enum: [
      'order_confirmation',
      'order_ready',
      'out_for_delivery',
      'order_delivered',
      'sale_invoice',
      'payment_reminder',
      'custom'
    ],
    default: 'order_confirmation'
  },
  messageText: { type: String, required: true },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'pending', 'failed'],
    default: 'delivered'
  },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

whatsAppLogSchema.index({ createdAt: -1 });
whatsAppLogSchema.index({ recipientMobile: 1 });

module.exports = mongoose.model('WhatsAppLog', whatsAppLogSchema);
