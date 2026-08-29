const mongoose = require('mongoose');

// A snapshot of a single line item in a sale — GST locked at time of sale
const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productId: { type: String },           // snapshot
  productName: { type: String },         // snapshot
  sku: { type: String },                 // snapshot
  barcode: { type: String },             // snapshot
  hsnCode: { type: String },             // GST snapshot
  gstRate: { type: Number },             // GST snapshot
  quantity: { type: Number, required: true },
  unit: { type: String },
  purchasePrice: { type: Number },       // cost at time of sale (for profit calc)
  sellingPrice: { type: Number },        // selling price at time of sale
  mrp: { type: Number },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percent', 'amount'], default: 'percent' },
  taxableAmount: { type: Number },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  isReturn: { type: Boolean, default: false },
});

const saleSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  saleDate: { type: Date, default: Date.now },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerId: { type: String },          // snapshot
  customerName: { type: String },        // snapshot
  customerMobile: { type: String },      // snapshot

  items: [saleItemSchema],

  // Totals
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  totalTaxableAmount: { type: Number, default: 0 },
  totalCGST: { type: Number, default: 0 },
  totalSGST: { type: Number, default: 0 },
  totalIGST: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },

  // Payment
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer', 'credit', 'mixed'], default: 'cash' },
  paymentDetails: [{
    method: String,
    amount: Number,
    reference: String,
  }],
  amountPaid: { type: Number, default: 0 },
  amountDue: { type: Number, default: 0 },
  changeReturned: { type: Number, default: 0 },

  // Status
  status: { type: String, enum: ['completed', 'held', 'cancelled', 'returned', 'partial_return'], default: 'completed' },
  isCredit: { type: Boolean, default: false },

  // Meta
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  fromOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // if created from an order

  // State info (for GST)
  shopState: { type: String, default: 'Tamil Nadu' },
  customerState: { type: String },
  isInterState: { type: Boolean, default: false },
}, { timestamps: true });

saleSchema.index({ customer: 1 });
saleSchema.index({ saleDate: -1 });
saleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
