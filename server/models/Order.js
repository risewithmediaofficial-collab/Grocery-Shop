const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String },
  unitPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  notes: { type: String },
  isPacked: { type: Boolean, default: false },
  packedBy: { type: String },
  packedAt: { type: Date },
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  orderType: { type: String, enum: ['online', 'offline'], default: 'online' },
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
  totalAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially_paid'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'mixed', 'unpaid'],
    default: 'unpaid'
  },
  paidAmount: { type: Number, default: 0 },
  cashAmount: { type: Number, default: 0 },
  upiAmount: { type: Number, default: 0 },
  upiTransactionId: { type: String },
  collectedBy: { type: String },
  paidAt: { type: Date },
  isFullyPacked: { type: Boolean, default: false },
  packingCompletedAt: { type: Date },
  billedAt: { type: Date },
  sentToBilling: { type: Boolean, default: false },
  sentToBillingBy: { type: String },
  billedAs: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedByName: { type: String },
  confirmedByRole: { type: String },
  confirmedAt: { type: Date },
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedByName: { type: String },
  acceptedByRole: { type: String },
  acceptedAt: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedToName: { type: String },
  assignedToRole: { type: String },
  assignedAt: { type: Date },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedByName: { type: String },
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
