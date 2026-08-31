require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const { Category, SubCategory, Brand, Unit } = require('../models/Category');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const { Setting } = require('../models/System');
const { StockMovement } = require('../models/Inventory');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/columbu_stores';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}), Category.deleteMany({}), SubCategory.deleteMany({}),
    Brand.deleteMany({}), Unit.deleteMany({}), Product.deleteMany({}),
    Customer.deleteMany({}), Supplier.deleteMany({}), Sale.deleteMany({}),
    Purchase.deleteMany({}), Setting.deleteMany({}), StockMovement.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // Units
  const units = await Unit.insertMany([
    { name: 'Kilogram', symbol: 'kg' }, { name: 'Gram', symbol: 'g' },
    { name: 'Litre', symbol: 'L' }, { name: 'Millilitre', symbol: 'mL' },
    { name: 'Piece', symbol: 'pc' }, { name: 'Pack', symbol: 'pk' },
    { name: 'Dozen', symbol: 'dz' }, { name: 'Bottle', symbol: 'btl' },
  ]);
  const [KG, G, L, ML, PC, PK, DZ, BTL] = units;

  // Brands
  const brands = await Brand.insertMany([
    { name: 'Aashirvaad' }, { name: 'Tata' }, { name: 'Fortune' },
    { name: 'Sundrop' }, { name: 'Britannia' }, { name: 'Parle' },
    { name: 'Haldiram' }, { name: 'Dabur' }, { name: 'Lifebuoy' },
    { name: 'Surf Excel' }, { name: 'Local' },
  ]);
  const [AASH, TATA, FORT, SUND, BRIT, PARL, HALD, DABR, LIFB, SURF, LOCAL] = brands;

  // Categories & Subcategories (Structured Categories)
  const catFood = await Category.create({ name: 'Food', slug: 'food', description: 'Grains, Dal, Flour, Oil, Spices, Sugar, Salt' });
  const catBev = await Category.create({ name: 'Beverages', slug: 'beverages', description: 'Juices, Water, Cold Drinks, Beverages' });
  const catSnacks = await Category.create({ name: 'Snacks', slug: 'snacks', description: 'Biscuits, Chips, Cookies, Namkeen' });
  const catHH = await Category.create({ name: 'Household', slug: 'household', description: 'Soaps, Detergents, Cleaners, Personal Essentials' });

  const subRice = await SubCategory.create({ name: 'Rice & Grains', category: catFood._id });
  const subDal = await SubCategory.create({ name: 'Dal & Pulses', category: catFood._id });
  const subFlour = await SubCategory.create({ name: 'Flour & Atta', category: catFood._id });
  const subOil = await SubCategory.create({ name: 'Cooking Oil & Ghee', category: catFood._id });
  const subSpice = await SubCategory.create({ name: 'Spices & Masala', category: catFood._id });
  const subSugar = await SubCategory.create({ name: 'Sugar & Salt', category: catFood._id });
  const subBisc = await SubCategory.create({ name: 'Biscuits', category: catSnacks._id });
  const subChips = await SubCategory.create({ name: 'Chips & Namkeen', category: catSnacks._id });
  const subJuice = await SubCategory.create({ name: 'Juice', category: catBev._id });
  const subWater = await SubCategory.create({ name: 'Water', category: catBev._id });
  const subSoap = await SubCategory.create({ name: 'Soap & Detergent', category: catHH._id });

  // Products
  const productData = [
    { name: 'Sona Masoori Rice', sku: 'RICE-001', barcode: '8901234000001', category: catFood._id, subCategory: subRice._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 55, sellingPrice: 65, mrp: 70, gstRate: 5, hsnCode: '1006', openingStock: 100, minimumStock: 20, reorderLevel: 30, maximumStock: 200 },
    { name: 'Basmati Rice', sku: 'RICE-002', barcode: '8901234000002', category: catFood._id, subCategory: subRice._id, brand: TATA._id, unit: KG._id, purchasePrice: 90, sellingPrice: 110, mrp: 120, gstRate: 5, hsnCode: '1006', openingStock: 50, minimumStock: 10, reorderLevel: 15, maximumStock: 100 },
    { name: 'Toor Dal', sku: 'DAL-001', barcode: '8901234000003', category: catFood._id, subCategory: subDal._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 95, sellingPrice: 115, mrp: 125, gstRate: 0, hsnCode: '0713', openingStock: 60, minimumStock: 10, reorderLevel: 15, maximumStock: 100 },
    { name: 'Moong Dal', sku: 'DAL-002', barcode: '8901234000004', category: catFood._id, subCategory: subDal._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 105, sellingPrice: 125, mrp: 135, gstRate: 0, hsnCode: '0713', openingStock: 40, minimumStock: 10, reorderLevel: 15, maximumStock: 80 },
    { name: 'Wheat Flour (Atta)', sku: 'ATTA-001', barcode: '8901234000005', category: catFood._id, subCategory: subFlour._id, brand: AASH._id, unit: KG._id, purchasePrice: 38, sellingPrice: 48, mrp: 55, gstRate: 0, hsnCode: '1101', openingStock: 80, minimumStock: 20, reorderLevel: 30, maximumStock: 150 },
    { name: 'Cooking Oil (Sunflower)', sku: 'OIL-001', barcode: '8901234000006', category: catFood._id, subCategory: subOil._id, brand: SUND._id, unit: L._id, purchasePrice: 140, sellingPrice: 165, mrp: 180, gstRate: 5, hsnCode: '1512', openingStock: 40, minimumStock: 10, reorderLevel: 15, maximumStock: 80 },
    { name: 'Palm Oil', sku: 'OIL-002', barcode: '8901234000007', category: catFood._id, subCategory: subOil._id, brand: FORT._id, unit: L._id, purchasePrice: 110, sellingPrice: 130, mrp: 145, gstRate: 5, hsnCode: '1511', openingStock: 30, minimumStock: 5, reorderLevel: 10, maximumStock: 60 },
    { name: 'Sugar', sku: 'SGR-001', barcode: '8901234000008', category: catFood._id, subCategory: subSugar._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 42, sellingPrice: 50, mrp: 55, gstRate: 5, hsnCode: '1701', openingStock: 70, minimumStock: 20, reorderLevel: 30, maximumStock: 150 },
    { name: 'Iodized Salt', sku: 'SLT-001', barcode: '8901234000009', category: catFood._id, subCategory: subSugar._id, brand: TATA._id, unit: KG._id, purchasePrice: 18, sellingPrice: 25, mrp: 28, gstRate: 0, hsnCode: '2501', openingStock: 50, minimumStock: 10, reorderLevel: 15, maximumStock: 100 },
    { name: 'Red Chilli Powder', sku: 'SPC-001', barcode: '8901234000010', category: catFood._id, subCategory: subSpice._id, brand: LOCAL._id, unit: G._id, purchasePrice: 12, sellingPrice: 18, mrp: 22, gstRate: 5, hsnCode: '0904', openingStock: 30, minimumStock: 5, reorderLevel: 10, maximumStock: 60 },
    { name: 'Turmeric Powder', sku: 'SPC-002', barcode: '8901234000011', category: catFood._id, subCategory: subSpice._id, brand: LOCAL._id, unit: G._id, purchasePrice: 15, sellingPrice: 22, mrp: 28, gstRate: 5, hsnCode: '0910', openingStock: 25, minimumStock: 5, reorderLevel: 8, maximumStock: 50 },
    { name: 'Coriander Powder', sku: 'SPC-003', barcode: '8901234000012', category: catFood._id, subCategory: subSpice._id, brand: LOCAL._id, unit: G._id, purchasePrice: 10, sellingPrice: 15, mrp: 18, gstRate: 5, hsnCode: '0909', openingStock: 20, minimumStock: 5, reorderLevel: 8, maximumStock: 40 },
    { name: 'Good Day Biscuits', sku: 'BSC-001', barcode: '8901234000013', category: catSnacks._id, subCategory: subBisc._id, brand: BRIT._id, unit: PC._id, purchasePrice: 20, sellingPrice: 25, mrp: 30, gstRate: 12, hsnCode: '1905', openingStock: 60, minimumStock: 10, reorderLevel: 20, maximumStock: 100 },
    { name: 'Parle-G Biscuits', sku: 'BSC-002', barcode: '8901234000014', category: catSnacks._id, subCategory: subBisc._id, brand: PARL._id, unit: PC._id, purchasePrice: 12, sellingPrice: 15, mrp: 18, gstRate: 12, hsnCode: '1905', openingStock: 80, minimumStock: 20, reorderLevel: 30, maximumStock: 150 },
    { name: 'Lays Chips Classic Salted', sku: 'CHP-001', barcode: '8901234000015', category: catSnacks._id, subCategory: subChips._id, brand: LOCAL._id, unit: PC._id, purchasePrice: 18, sellingPrice: 25, mrp: 30, gstRate: 12, hsnCode: '2008', openingStock: 50, minimumStock: 10, reorderLevel: 15, maximumStock: 100 },
    { name: 'Minute Maid Orange Juice', sku: 'JUS-001', barcode: '8901234000016', category: catBev._id, subCategory: subJuice._id, brand: LOCAL._id, unit: BTL._id, purchasePrice: 55, sellingPrice: 70, mrp: 80, gstRate: 12, hsnCode: '2009', openingStock: 24, minimumStock: 5, reorderLevel: 10, maximumStock: 60, expiryTracking: true },
    { name: 'Bisleri Water 1L', sku: 'WTR-001', barcode: '8901234000017', category: catBev._id, subCategory: subWater._id, brand: LOCAL._id, unit: BTL._id, purchasePrice: 12, sellingPrice: 20, mrp: 20, gstRate: 12, hsnCode: '2201', openingStock: 48, minimumStock: 12, reorderLevel: 20, maximumStock: 100, expiryTracking: true },
    { name: 'Lifebuoy Soap', sku: 'SOAP-001', barcode: '8901234000018', category: catHH._id, subCategory: subSoap._id, brand: LIFB._id, unit: PC._id, purchasePrice: 28, sellingPrice: 38, mrp: 45, gstRate: 12, hsnCode: '3401', openingStock: 40, minimumStock: 10, reorderLevel: 15, maximumStock: 80 },
    { name: 'Surf Excel Detergent 1kg', sku: 'DET-001', barcode: '8901234000019', category: catHH._id, subCategory: subSoap._id, brand: SURF._id, unit: KG._id, purchasePrice: 95, sellingPrice: 120, mrp: 135, gstRate: 18, hsnCode: '3402', openingStock: 25, minimumStock: 5, reorderLevel: 8, maximumStock: 50 },
    { name: 'Tata Tea Gold 250g', sku: 'TEA-001', barcode: '8901234000020', category: catFood._id, subCategory: subSpice._id, brand: TATA._id, unit: G._id, purchasePrice: 65, sellingPrice: 85, mrp: 95, gstRate: 5, hsnCode: '0902', openingStock: 35, minimumStock: 8, reorderLevel: 12, maximumStock: 70 },
  ];

  const createdProducts = [];
  for (let i = 0; i < productData.length; i++) {
    const p = await Product.create({ ...productData[i], productId: `PROD-${String(i + 1).padStart(5, '0')}`, currentStock: productData[i].openingStock });
    createdProducts.push(p);
    await StockMovement.create({
      product: p._id, productId: p.productId, productName: p.name,
      type: 'opening', quantity: p.openingStock, balanceBefore: 0, balanceAfter: p.openingStock,
      reason: 'Opening stock (seed)',
    });
  }
  console.log(`Created ${createdProducts.length} products`);

  // Suppliers
  const suppliers = await Supplier.insertMany([
    { supplierId: 'SUPP-00001', name: 'Kumar Traders', company: 'Kumar Traders Pvt Ltd', mobile: '9876543210', city: 'Krishnagiri', state: 'Tamil Nadu', outstandingBalance: 0 },
    { supplierId: 'SUPP-00002', name: 'Sri Murugan Wholesale', company: 'Sri Murugan Wholesale', mobile: '9876543211', city: 'Dharmapuri', state: 'Tamil Nadu', outstandingBalance: 5000 },
    { supplierId: 'SUPP-00003', name: 'Raj Distributors', company: 'Raj Distributors', mobile: '9876543212', city: 'Salem', state: 'Tamil Nadu', outstandingBalance: 2500 },
  ]);

  // Customers
  const customers = await Customer.insertMany([
    { customerId: 'CUST-00001', name: 'Ramesh', mobile: '9500000001', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'regular' },
    { customerId: 'CUST-00002', name: 'Ramesh', mobile: '9500000002', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'regular' },
    { customerId: 'CUST-00003', name: 'Suresh Kumar', mobile: '9500000003', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'credit', creditLimit: 5000 },
    { customerId: 'CUST-00004', name: 'Priya Devi', mobile: '9500000004', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'regular' },
    { customerId: 'CUST-00005', name: 'Murugan', mobile: '9500000005', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'wholesale', creditLimit: 20000 },
  ]);

  // Users
  await User.create({ name: 'Admin User', email: 'admin@columbu.com', password: 'admin123', role: 'admin', mobile: '9000000000' });
  await User.create({ name: 'Cashier', email: 'cashier@columbu.com', password: 'cashier123', role: 'cashier', mobile: '9000000001' });

  // Shop Settings
  await Setting.create({ key: 'shop', value: {
    name: 'New Columbu Stores',
    address: 'Main Road, Krishnagiri, Tamil Nadu - 635001',
    mobile: '9876543200',
    gstin: '33AABCK1234A1Z5',
    state: 'Tamil Nadu',
    stateCode: '33',
    invoicePrefix: 'KS',
    invoiceNumber: 1,
  }});

  // Sample sales (last 7 days)
  const rice = createdProducts[0];
  const sugar = createdProducts[7];
  const oil = createdProducts[5];
  const dal = createdProducts[2];
  const biscuit = createdProducts[12];

  for (let d = 6; d >= 0; d--) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - d);
    const numSales = Math.floor(Math.random() * 5) + 3;
    for (let s = 0; s < numSales; s++) {
      const items = [
        { product: rice._id, productId: rice.productId, productName: rice.name, hsnCode: rice.hsnCode, gstRate: rice.gstRate, quantity: Math.ceil(Math.random() * 3), purchasePrice: rice.purchasePrice, sellingPrice: rice.sellingPrice, discount: 0, discountType: 'percent', taxableAmount: rice.sellingPrice * 2, cgst: 0, sgst: 0, igst: 0, taxAmount: rice.sellingPrice * 2 * 0.05, totalAmount: rice.sellingPrice * 2 * 1.05 },
        { product: sugar._id, productId: sugar.productId, productName: sugar.name, hsnCode: sugar.hsnCode, gstRate: sugar.gstRate, quantity: 1, purchasePrice: sugar.purchasePrice, sellingPrice: sugar.sellingPrice, discount: 0, discountType: 'percent', taxableAmount: sugar.sellingPrice, cgst: 0, sgst: 0, igst: 0, taxAmount: sugar.sellingPrice * 0.05, totalAmount: sugar.sellingPrice * 1.05 },
      ];
      const subtotal = items.reduce((sum, i) => sum + (i.sellingPrice * i.quantity), 0);
      const totalTax = items.reduce((sum, i) => sum + i.taxAmount, 0);
      const grandTotal = Math.round(subtotal + totalTax);
      await Sale.create({
        invoiceNumber: `KS-${Date.now()}-${s}`,
        saleDate,
        customer: customers[s % customers.length]._id,
        customerId: customers[s % customers.length].customerId,
        customerName: customers[s % customers.length].name,
        customerMobile: customers[s % customers.length].mobile,
        items,
        subtotal,
        totalDiscount: 0,
        totalTaxableAmount: subtotal,
        totalTax,
        grandTotal,
        paymentMethod: s % 2 === 0 ? 'cash' : 'upi',
        amountPaid: grandTotal,
        amountDue: 0,
        status: 'completed',
        shopState: 'Tamil Nadu',
        isInterState: false,
      });
    }
  }

  console.log('Seed data created successfully!');
  console.log('\nLogin credentials:');
  console.log('  Admin:   admin@columbu.com / admin123');
  console.log('  Cashier: cashier@columbu.com / cashier123');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
