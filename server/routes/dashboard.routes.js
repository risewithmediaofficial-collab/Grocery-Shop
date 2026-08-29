const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');

// GET /api/dashboard/summary
router.get('/summary', protect, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's sales
    const todaySales = await Sale.aggregate([
      { $match: { saleDate: { $gte: startOfDay, $lte: endOfDay }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);

    // Today's purchases
    const todayPurchases = await Purchase.aggregate([
      { $match: { purchaseDate: { $gte: startOfDay, $lte: endOfDay }, status: 'received' } },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
    ]);

    // Today's profit (rough: sales revenue - COGS)
    const todaySalesFull = await Sale.find({ saleDate: { $gte: startOfDay, $lte: endOfDay }, status: 'completed' });
    let todayCOGS = 0;
    for (const sale of todaySalesFull) {
      for (const item of sale.items) {
        todayCOGS += (item.purchasePrice || 0) * item.quantity;
      }
    }
    const todayRevenue = todaySales[0]?.total || 0;
    const todayProfit = todayRevenue - todayCOGS;

    // Totals
    const totalCustomers = await Customer.countDocuments({ status: 'active' });
    const totalProducts = await Product.countDocuments({ status: 'active' });
    
    // Stock value
    const stockValue = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: null, value: { $sum: { $multiply: ['$currentStock', '$purchasePrice'] } } } }
    ]);

    // Outstanding balances
    const pendingCustomer = await Customer.aggregate([
      { $group: { _id: null, total: { $sum: '$outstandingBalance' } } }
    ]);

    // Low stock alerts
    const lowStock = await Product.countDocuments({ $expr: { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$reorderLevel'] }] } });
    const outOfStock = await Product.countDocuments({ currentStock: 0, status: 'active' });

    // Monthly sales chart (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      const daySales = await Sale.aggregate([
        { $match: { saleDate: { $gte: start, $lte: end }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]);
      const dayPurchases = await Purchase.aggregate([
        { $match: { purchaseDate: { $gte: start, $lte: end }, status: 'received' } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]);
      last7Days.push({
        date: start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        sales: daySales[0]?.total || 0,
        purchases: dayPurchases[0]?.total || 0,
      });
    }

    // Recent sales
    const recentSales = await Sale.find({ status: 'completed' }).sort({ saleDate: -1 }).limit(5).populate('customer', 'name');

    // Top selling products
    const topProducts = await Sale.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.productName' }, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.totalAmount' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 5 }
    ]);

    // Low stock products
    const lowStockProducts = await Product.find({ $expr: { $lte: ['$currentStock', '$reorderLevel'] }, status: 'active' })
      .populate('category', 'name')
      .limit(10)
      .sort({ currentStock: 1 });

    res.json({
      success: true,
      data: {
        kpi: {
          todaySales: todayRevenue,
          todaySalesCount: todaySales[0]?.count || 0,
          todayPurchases: todayPurchases[0]?.total || 0,
          todayProfit,
          totalCustomers,
          totalProducts,
          stockValue: stockValue[0]?.value || 0,
          pendingCustomerPayments: pendingCustomer[0]?.total || 0,
        },
        alerts: { lowStock, outOfStock },
        charts: { last7Days },
        recentSales,
        topProducts,
        lowStockProducts,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
