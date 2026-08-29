const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expenseNumber: { type: String, unique: true },
  category: { type: String, enum: ['rent', 'electricity', 'salary', 'transport', 'packaging', 'maintenance', 'internet', 'other'], required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer'], default: 'cash' },
  expenseDate: { type: Date, default: Date.now },
  description: { type: String },
  reference: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

expenseSchema.pre('save', async function () {
  if (this.isNew && !this.expenseNumber) {
    const count = await mongoose.model('Expense').countDocuments();
    this.expenseNumber = `EXP-${String(count + 1).padStart(5, '0')}`;
  }
});

expenseSchema.index({ expenseDate: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
