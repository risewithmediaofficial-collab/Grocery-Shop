const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: { type: String, unique: true },   // Auto-generated: PROD-00001
  name: { type: String, required: true, trim: true },
  sku: { type: String, sparse: true, trim: true },
  barcode: { type: String, sparse: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  description: { type: String },
  image: { type: String },

  // Pricing
  purchasePrice: { type: Number, required: true, default: 0 },
  sellingPrice: { type: Number, required: true, default: 0 },
  mrp: { type: Number, default: 0 },
  wholesalePrice: { type: Number, default: 0 },

  // GST / Tax
  hsnCode: { type: String, trim: true },
  gstRate: { type: Number, enum: [0, 5, 12, 18, 28], default: 0 },
  taxType: { type: String, enum: ['inclusive', 'exclusive'], default: 'exclusive' },

  // Stock
  openingStock: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  minimumStock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 },
  maximumStock: { type: Number, default: 0 },

  // Tracking
  batchTracking: { type: Boolean, default: false },
  expiryTracking: { type: Boolean, default: false },

  status: { type: String, enum: ['active', 'inactive', 'discontinued'], default: 'active' },
}, { timestamps: true });

// Auto-generate productId
productSchema.pre('save', async function () {
  if (this.isNew && !this.productId) {
    const count = await mongoose.model('Product').countDocuments();
    this.productId = `PROD-${String(count + 1).padStart(5, '0')}`;
  }
});

productSchema.index({ name: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ currentStock: 1 });

module.exports = mongoose.model('Product', productSchema);
