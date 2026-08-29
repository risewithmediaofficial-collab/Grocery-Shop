const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// GET /api/reports/sales
router.get('/sales', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo, groupBy = 'day' } = req.query;
    const match = { status: 'completed' };
    if (dateFrom) match.saleDate = { $gte: new Date(dateFrom) };
    if (dateTo) match.saleDate = { ...match.saleDate, $lte: new Date(new Date(dateTo).setHours(23, 59, 59)) };

    const sales = await Sale.find(match).sort({ saleDate: -1 }).limit(500);
    const summary = await Sale.aggregate([
      { $match: match },
      { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' }, totalTax: { $sum: '$totalTax' }, totalDiscount: { $sum: '$totalDiscount' }, count: { $sum: 1 } } }
    ]);

    // Product-wise sales
    const productWise = await Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.productName' }, qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.totalAmount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 20 }
    ]);

    res.json({ success: true, data: { sales, summary: summary[0] || {}, productWise } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/reports/profit
router.get('/profit', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const match = { status: 'completed' };
    if (dateFrom) match.saleDate = { $gte: new Date(dateFrom) };
    if (dateTo) match.saleDate = { ...match.saleDate, $lte: new Date(new Date(dateTo).setHours(23, 59, 59)) };

    const sales = await Sale.find(match);
    let totalRevenue = 0, totalCOGS = 0;
    for (const sale of sales) {
      totalRevenue += sale.grandTotal;
      for (const item of sale.items) {
        totalCOGS += (item.purchasePrice || 0) * item.quantity;
      }
    }
    const grossProfit = totalRevenue - totalCOGS;

    // Expenses
    const expenseMatch = {};
    if (dateFrom) expenseMatch.expenseDate = { $gte: new Date(dateFrom) };
    if (dateTo) expenseMatch.expenseDate = { ...expenseMatch.expenseDate, $lte: new Date(new Date(dateTo).setHours(23, 59, 59)) };
    const expenseAgg = await Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expenseAgg[0]?.total || 0;
    const netProfit = grossProfit - totalExpenses;

    res.json({ success: true, data: { totalRevenue, totalCOGS, grossProfit, totalExpenses, netProfit, salesCount: sales.length } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/reports/inventory
router.get('/inventory', protect, async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' }).populate('category', 'name').populate('unit', 'symbol');
    const stockValue = products.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);
    const lowStock = products.filter(p => p.currentStock > 0 && p.currentStock <= p.reorderLevel);
    const outOfStock = products.filter(p => p.currentStock === 0);
    res.json({ success: true, data: { products, stockValue, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length, lowStock, outOfStock } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/reports/purchases
router.get('/purchases', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo, supplier } = req.query;
    const match = { status: 'received' };
    if (supplier) match.supplier = new require('mongoose').Types.ObjectId(supplier);
    if (dateFrom) match.purchaseDate = { $gte: new Date(dateFrom) };
    if (dateTo) match.purchaseDate = { ...match.purchaseDate, $lte: new Date(new Date(dateTo).setHours(23, 59, 59)) };
    const purchases = await Purchase.find(match).populate('supplier', 'name').sort({ purchaseDate: -1 });
    const summary = await Purchase.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }]);
    res.json({ success: true, data: { purchases, summary: summary[0] || {} } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
