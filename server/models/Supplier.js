const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  supplierId: { type: String, unique: true },  // AUTO: SUPP-00001
  name: { type: String, required: true, trim: true },
  company: { type: String, trim: true },
  mobile: { type: String, trim: true },
  altMobile: { type: String },
  email: { type: String, lowercase: true, trim: true },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  gstin: { type: String, trim: true },
  openingBalance: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  paymentTerms: { type: String },   // e.g., "Net 30"
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  notes: { type: String },
}, { timestamps: true });

supplierSchema.pre('save', async function () {
  if (this.isNew && !this.supplierId) {
    const count = await mongoose.model('Supplier').countDocuments();
    this.supplierId = `SUPP-${String(count + 1).padStart(5, '0')}`;
  }
});

supplierSchema.index({ mobile: 1 });
supplierSchema.index({ name: 'text', company: 'text' });

module.exports = mongoose.model('Supplier', supplierSchema);
