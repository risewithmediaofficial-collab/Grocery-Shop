const mongoose = require('mongoose');

const heldBillItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  _id: { type: String },
  productId: { type: String },
  name: { type: String, required: true },
  sku: { type: String },
  barcode: { type: String },
  sellingPrice: { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 },
  customPrice: { type: Number },
  gstRate: { type: Number, default: 0 },
  hsnCode: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String },
  discount: { type: Number, default: 0 },
  discountType: { type: String, default: 'percent' },
  taxType: { type: String, default: 'exclusive' },
});

const heldBillSchema = new mongoose.Schema({
  billNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String },
  customerMobile: { type: String },
  items: [heldBillItemSchema],
  discount: { type: Number, default: 0 },
  discountType: { type: String, default: 'amount' },
  notes: { type: String },
  subtotal: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  status: { type: String, enum: ['held', 'resumed', 'cancelled'], default: 'held' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

heldBillSchema.pre('save', async function () {
  if (this.isNew && !this.billNumber) {
    const count = await mongoose.model('HeldBill').countDocuments();
    this.billNumber = `HELD-${String(count + 1).padStart(5, '0')}`;
  }
});

heldBillSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('HeldBill', heldBillSchema);
