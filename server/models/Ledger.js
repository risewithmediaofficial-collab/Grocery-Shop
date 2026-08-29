const mongoose = require('mongoose');

// Customer ledger entry
const customerLedgerSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['sale', 'payment', 'return', 'adjustment', 'opening'], required: true },
  amount: { type: Number, required: true },       // positive = debit (customer owes), negative = credit (payment received)
  reference: { type: String },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

customerLedgerSchema.index({ customer: 1, createdAt: -1 });

// Customer payment receipt
const customerPaymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer'], default: 'cash' },
  paymentDate: { type: Date, default: Date.now },
  reference: { type: String },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Supplier ledger entry
const supplierLedgerSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  type: { type: String, enum: ['purchase', 'payment', 'return', 'adjustment', 'opening'], required: true },
  amount: { type: Number, required: true },
  reference: { type: String },
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Supplier payment
const supplierPaymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer'], default: 'cash' },
  paymentDate: { type: Date, default: Date.now },
  reference: { type: String },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = {
  CustomerLedger: mongoose.model('CustomerLedger', customerLedgerSchema),
  CustomerPayment: mongoose.model('CustomerPayment', customerPaymentSchema),
  SupplierLedger: mongoose.model('SupplierLedger', supplierLedgerSchema),
  SupplierPayment: mongoose.model('SupplierPayment', supplierPaymentSchema),
};
