const mongoose = require('mongoose');

const heldBillItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  _id: { type: String },
  productId: { type: String },
  name: { type: String, required: true },
  sku: { type: String, default: '' },
  barcode: { type: String, default: '' },
  sellingPrice: { type: Number, required: true, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  customPrice: { type: Number },
  gstRate: { type: Number, default: 0 },
  hsnCode: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unit: { type: String, default: '' },
  discount: { type: Number, default: 0 },
  discountType: { type: String, default: 'percent' },
  taxType: { type: String, default: 'exclusive' },
}, { _id: false });

const heldBillSchema = new mongoose.Schema({
  billNumber: { type: String },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, default: 'Walk-in Customer' },
  customerMobile: { type: String, default: '' },
  items: [heldBillItemSchema],
  discount: { type: Number, default: 0 },
  discountType: { type: String, default: 'amount' },
  notes: { type: String, default: '' },
  subtotal: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  status: { type: String, enum: ['held', 'resumed', 'cancelled'], default: 'held' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

heldBillSchema.pre('save', async function () {
  if (!this.billNumber) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.billNumber = `HELD-${Date.now().toString().slice(-4)}${randomSuffix}`;
  }
});

heldBillSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('HeldBill', heldBillSchema);

