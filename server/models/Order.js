const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String },
  notes: { type: String },
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String },
  customerMobile: { type: String },
  items: [orderItemSchema],
  deliveryAddress: { type: String },
  notes: { type: String },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'packing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  sentToBilling: { type: Boolean, default: false },
  sentToBillingBy: { type: String },
  billedAs: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedByName: { type: String },
  confirmedByRole: { type: String },
  confirmedAt: { type: Date },
  lastUpdatedBy: { type: String },
  lastUpdatedByRole: { type: String },
  statusLogs: [{
    status: { type: String },
    changedBy: { type: String },
    changedByRole: { type: String },
    changedAt: { type: Date, default: Date.now }
  }],
  deliveryCharge: { type: Number, default: 0 },
}, { timestamps: true });

orderSchema.pre('save', async function () {
  if (this.isNew && !this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(5, '0')}`;
  }
});

orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
