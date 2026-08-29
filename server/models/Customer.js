const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true }, // Auto-gen: CUST-00001
  name: { type: String, required: true, trim: true }, // NOT unique — multiple customers can share name
  mobile: { type: String, required: true, trim: true },
  altMobile: { type: String, trim: true },
  address: { type: String },
  city: { type: String, default: 'Krishnagiri' },
  state: { type: String, default: 'Tamil Nadu' },
  gstin: { type: String, trim: true },
  customerType: { type: String, enum: ['regular', 'wholesale', 'credit', 'walk-in'], default: 'regular' },
  creditLimit: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  outstandingBalance: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalBills: { type: Number, default: 0 },
  lastPurchaseDate: { type: Date },
  lastPurchaseAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  notes: { type: String },
}, { timestamps: true });

customerSchema.pre('save', async function () {
  if (this.isNew && !this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CUST-${String(count + 1).padStart(5, '0')}`;
  }
});

customerSchema.index({ mobile: 1 });
customerSchema.index({ name: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
