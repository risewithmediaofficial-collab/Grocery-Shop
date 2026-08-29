const mongoose = require('mongoose');

// Every stock change creates one of these records
const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productId: { type: String },
  productName: { type: String },
  type: {
    type: String,
    enum: ['opening', 'purchase', 'sale', 'sale_return', 'purchase_return', 'adjustment', 'damage', 'expiry', 'transfer_in', 'transfer_out'],
    required: true
  },
  quantity: { type: Number, required: true }, // positive = in, negative = out
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },
  reference: { type: String },               // Invoice/PO/Adjustment number
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  reason: { type: String },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1 });

// Stock Adjustment (admin-authorized)
const stockAdjustmentSchema = new mongoose.Schema({
  adjustmentNumber: { type: String, unique: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  currentStock: { type: Number },
  adjustedQty: { type: Number, required: true },  // can be negative
  newStock: { type: Number },
  reason: { type: String, required: true },
  type: { type: String, enum: ['damage', 'expiry', 'theft', 'correction', 'other'], default: 'correction' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Batch tracking
const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
  purchaseDate: { type: Date },
  manufacturingDate: { type: Date },
  expiryDate: { type: Date },
  purchasePrice: { type: Number },
  quantity: { type: Number, default: 0 },
  remainingQty: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'exhausted', 'expired', 'damaged'], default: 'active' },
}, { timestamps: true });

batchSchema.index({ product: 1, expiryDate: 1 });
batchSchema.index({ expiryDate: 1 });

module.exports = {
  StockMovement: mongoose.model('StockMovement', stockMovementSchema),
  StockAdjustment: mongoose.model('StockAdjustment', stockAdjustmentSchema),
  Batch: mongoose.model('Batch', batchSchema),
};
