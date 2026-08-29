const Product = require('../models/Product');
const { StockMovement } = require('../models/Inventory');
const { Notification } = require('../models/System');

/**
 * Core stock service — all stock changes go through here.
 * Every change creates a StockMovement record.
 */

/**
 * Add/remove stock for a product
 * @param {ObjectId} productId
 * @param {number} quantity  — positive=in, negative=out
 * @param {string} type      — movement type
 * @param {Object} meta      — { reference, referenceId, reason, createdBy, batchId }
 */
exports.changeStock = async (productId, quantity, type, meta = {}) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error(`Product not found: ${productId}`);

  const balanceBefore = product.currentStock;
  const balanceAfter = balanceBefore + quantity;

  if (balanceAfter < 0) {
    throw new Error(`Insufficient stock for ${product.name}. Available: ${balanceBefore}, Required: ${Math.abs(quantity)}`);
  }

  // Update product stock
  product.currentStock = balanceAfter;
  await product.save();

  // Create movement record
  await StockMovement.create({
    product: product._id,
    productId: product.productId,
    productName: product.name,
    type,
    quantity,
    balanceBefore,
    balanceAfter,
    reference: meta.reference,
    referenceId: meta.referenceId,
    reason: meta.reason,
    batch: meta.batchId,
    createdBy: meta.createdBy,
  });

  // Check for low stock / out of stock notifications
  await checkStockAlerts(product);

  return { product, balanceBefore, balanceAfter };
};

/**
 * Process all items in a sale (reduce stock for each)
 */
exports.processSaleStock = async (items, saleId, invoiceNumber, userId) => {
  for (const item of items) {
    await exports.changeStock(
      item.product,
      -item.quantity,
      'sale',
      { reference: invoiceNumber, referenceId: saleId, createdBy: userId }
    );
  }
};

/**
 * Process all items in a purchase (increase stock for each)
 */
exports.processPurchaseStock = async (items, purchaseId, purchaseNumber, userId) => {
  for (const item of items) {
    await exports.changeStock(
      item.product,
      item.quantity,
      'purchase',
      { reference: purchaseNumber, referenceId: purchaseId, createdBy: userId }
    );
  }
};

/**
 * Process sale return (add stock back)
 */
exports.processSaleReturn = async (items, returnId, returnNumber, userId) => {
  for (const item of items) {
    await exports.changeStock(
      item.product,
      item.quantity,
      'sale_return',
      { reference: returnNumber, referenceId: returnId, createdBy: userId }
    );
  }
};

/**
 * Process purchase return (remove stock)
 */
exports.processPurchaseReturn = async (items, returnId, returnNumber, userId) => {
  for (const item of items) {
    await exports.changeStock(
      item.product,
      -item.quantity,
      'purchase_return',
      { reference: returnNumber, referenceId: returnId, createdBy: userId }
    );
  }
};

async function checkStockAlerts(product) {
  if (product.currentStock === 0) {
    await Notification.create({
      type: 'out_of_stock',
      title: 'Out of Stock',
      message: `${product.name} is now out of stock!`,
      severity: 'error',
      relatedId: product._id,
      relatedModel: 'Product',
      forRoles: ['admin', 'manager', 'stock_manager'],
    });
  } else if (product.reorderLevel > 0 && product.currentStock <= product.reorderLevel) {
    await Notification.create({
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${product.name} stock is low. Current: ${product.currentStock}, Reorder Level: ${product.reorderLevel}`,
      severity: 'warning',
      relatedId: product._id,
      relatedModel: 'Product',
      forRoles: ['admin', 'manager', 'stock_manager'],
    });
  }
}
