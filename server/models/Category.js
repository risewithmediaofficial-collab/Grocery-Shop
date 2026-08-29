const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., "kg", "litre", "piece"
  symbol: { type: String, required: true },           // e.g., "kg", "L", "pc"
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = {
  Category: mongoose.model('Category', categorySchema),
  SubCategory: mongoose.model('SubCategory', subCategorySchema),
  Brand: mongoose.model('Brand', brandSchema),
  Unit: mongoose.model('Unit', unitSchema),
};
