const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productId: { type: String },
  productName: { type: String },
  quantity: { type: Number, required: true },
  unit: { type: String },
  purchasePrice: { type: Number, required: true },
  totalAmount: { type: Number },
  gstRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  hsnCode: { type: String },
  batchNumber: { type: String },
  manufacturingDate: { type: Date },
  expiryDate: { type: Date },
  receivedQty: { type: Number, default: 0 },
});

const purchaseSchema = new mongoose.Schema({
  purchaseNumber: { type: String, unique: true },
  purchaseDate: { type: Date, default: Date.now },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierId: { type: String },
  supplierName: { type: String },

  items: [purchaseItemSchema],

  subtotal: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },

  status: { type: String, enum: ['draft', 'ordered', 'partially_received', 'received', 'cancelled'], default: 'received' },

  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  amountPaid: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },

  invoiceNumber: { type: String },      // supplier's invoice number
  expectedDelivery: { type: Date },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseSchema.pre('save', async function () {
  if (this.isNew && !this.purchaseNumber) {
    const count = await mongoose.model('Purchase').countDocuments();
    this.purchaseNumber = `PUR-${String(count + 1).padStart(5, '0')}`;
  }
});

purchaseSchema.index({ supplier: 1 });
purchaseSchema.index({ purchaseDate: -1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
