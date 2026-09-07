const mongoose = require('mongoose');

const saleReturnSchema = new mongoose.Schema({
  returnNumber: { type: String, unique: true },
  sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  invoiceNumber: { type: String },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String },
  returnDate: { type: Date, default: Date.now },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    quantity: { type: Number },
    sellingPrice: { type: Number },
    gstRate: { type: Number },
    taxAmount: { type: Number },
    totalAmount: { type: Number },
    reason: { type: String },
  }],
  totalAmount: { type: Number },
  returnType: { type: String, enum: ['return', 'exchange'], default: 'return' },
  exchangeItems: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    quantity: { type: Number },
    sellingPrice: { type: Number },
    gstRate: { type: Number },
    totalAmount: { type: Number },
  }],
  differenceAmount: { type: Number, default: 0 },
  differenceAction: { type: String, enum: ['collected', 'refunded', 'even'], default: 'even' },
  refundMethod: { type: String, enum: ['cash', 'upi', 'credit', 'bank_transfer', 'exchange'], default: 'cash' },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

saleReturnSchema.pre('save', async function () {
  if (this.isNew && !this.returnNumber) {
    const count = await mongoose.model('SaleReturn').countDocuments();
    this.returnNumber = `SR-${String(count + 1).padStart(5, '0')}`;
  }
});

const purchaseReturnSchema = new mongoose.Schema({
  returnNumber: { type: String, unique: true },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String },
  returnDate: { type: Date, default: Date.now },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String },
    quantity: { type: Number },
    purchasePrice: { type: Number },
    totalAmount: { type: Number },
    reason: { type: String },
  }],
  totalAmount: { type: Number },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseReturnSchema.pre('save', async function () {
  if (this.isNew && !this.returnNumber) {
    const count = await mongoose.model('PurchaseReturn').countDocuments();
    this.returnNumber = `PR-${String(count + 1).padStart(5, '0')}`;
  }
});

module.exports = {
  SaleReturn: mongoose.model('SaleReturn', saleReturnSchema),
  PurchaseReturn: mongoose.model('PurchaseReturn', purchaseReturnSchema),
};
