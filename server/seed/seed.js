require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const connectDB = require('../config/db');
const { Category, SubCategory, Brand, Unit } = require('../models/Category');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');
const { Setting } = require('../models/System');
const { StockMovement } = require('../models/Inventory');
const Order = require('../models/Order');

async function seed({ exitOnComplete = false } = {}) {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

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
  // Brands
  const brands = await Brand.insertMany([
    { name: 'Aashirvaad' }, { name: 'Tata' }, { name: 'Fortune' },
    { name: 'Sundrop' }, { name: 'Britannia' }, { name: 'Parle' },
    { name: 'Haldiram' }, { name: 'Everest' }, { name: 'Amul' },
    { name: 'Cadbury' }, { name: 'Nestle' }, { name: 'Bisleri' },
    { name: 'Coca-Cola' }, { name: 'Lifebuoy' }, { name: 'Dettol' },
    { name: 'Surf Excel' }, { name: 'Colgate' }, { name: 'Vim' },
    { name: 'Local / Store Loose' },
  ]);
  const [AASH, TATA, FORT, SUND, BRIT, PARL, HALD, EVER, AMUL, CADB, NEST, BISL, COKE, LIFB, DETT, SURF, COLG, VIM, LOCAL] = brands;

  // Categories & Subcategories (Structured Categories for Indian Stores)
  const catFood = await Category.create({ name: 'Food & Staples', slug: 'food', description: 'Grains, Dal, Atta, Oil, Spices, Sugar, Salt' });
  const catSnacks = await Category.create({ name: 'Snacks & Biscuits', slug: 'snacks', description: 'Biscuits, Cookies, Chips, Namkeen, Noodles' });
  const catBev = await Category.create({ name: 'Beverages & Dairy', slug: 'beverages', description: 'Packaged Water, Tea, Coffee, Cold Drinks, Milk' });
  const catHH = await Category.create({ name: 'Personal & Household Care', slug: 'household', description: 'Soaps, Detergents, Oral Care, Cleaning' });

  const subRice = await SubCategory.create({ name: 'Rice & Grains', category: catFood._id });
  const subDal = await SubCategory.create({ name: 'Dal & Pulses', category: catFood._id });
  const subFlour = await SubCategory.create({ name: 'Flour & Atta', category: catFood._id });
  const subOil = await SubCategory.create({ name: 'Cooking Oil & Ghee', category: catFood._id });
  const subSpice = await SubCategory.create({ name: 'Spices & Masala', category: catFood._id });
  const subSugar = await SubCategory.create({ name: 'Sugar & Salt', category: catFood._id });

  const subBisc = await SubCategory.create({ name: 'Biscuits & Cookies', category: catSnacks._id });
  const subChips = await SubCategory.create({ name: 'Chips & Namkeen', category: catSnacks._id });
  const subNoodles = await SubCategory.create({ name: 'Noodles & Instant Food', category: catSnacks._id });
  const subChoc = await SubCategory.create({ name: 'Chocolates & Sweets', category: catSnacks._id });

  const subWater = await SubCategory.create({ name: 'Packaged Water', category: catBev._id });
  const subTea = await SubCategory.create({ name: 'Tea & Coffee', category: catBev._id });
  const subColdDrink = await SubCategory.create({ name: 'Cold Drinks & Juices', category: catBev._id });
  const subDairy = await SubCategory.create({ name: 'Dairy & Milk', category: catBev._id });

  const subSoap = await SubCategory.create({ name: 'Soaps & Body Wash', category: catHH._id });
  const subDet = await SubCategory.create({ name: 'Detergents & Fabric Care', category: catHH._id });
  const subOral = await SubCategory.create({ name: 'Oral Care', category: catHH._id });
  const subClean = await SubCategory.create({ name: 'Dishwash & Cleaners', category: catHH._id });

  // Products
  const productData = [
    // 1. Food & Staples (Loose / Bags / Kg)
    { name: 'Sona Masoori Rice', sku: 'RICE-001', barcode: '8901234000001', category: catFood._id, subCategory: subRice._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 52, sellingPrice: 60, mrp: 65, gstRate: 5, hsnCode: '1006', openingStock: 250, minimumStock: 50, reorderLevel: 100, maximumStock: 500 },
    { name: 'Basmati Rice', sku: 'RICE-002', barcode: '8901234000002', category: catFood._id, subCategory: subRice._id, brand: TATA._id, unit: KG._id, purchasePrice: 90, sellingPrice: 110, mrp: 120, gstRate: 5, hsnCode: '1006', openingStock: 120, minimumStock: 25, reorderLevel: 50, maximumStock: 300 },
    { name: 'Toor Dal', sku: 'DAL-001', barcode: '8901234000003', category: catFood._id, subCategory: subDal._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 130, sellingPrice: 155, mrp: 165, gstRate: 0, hsnCode: '0713', openingStock: 100, minimumStock: 20, reorderLevel: 30, maximumStock: 200 },
    { name: 'Moong Dal', sku: 'DAL-002', barcode: '8901234000004', category: catFood._id, subCategory: subDal._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 105, sellingPrice: 125, mrp: 135, gstRate: 0, hsnCode: '0713', openingStock: 80, minimumStock: 15, reorderLevel: 25, maximumStock: 150 },
    { name: 'Chana Dal', sku: 'DAL-003', barcode: '8901234000005', category: catFood._id, subCategory: subDal._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 75, sellingPrice: 90, mrp: 98, gstRate: 0, hsnCode: '0713', openingStock: 60, minimumStock: 15, reorderLevel: 20, maximumStock: 120 },
    { name: 'Urad Dal', sku: 'DAL-004', barcode: '8901234000006', category: catFood._id, subCategory: subDal._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 115, sellingPrice: 135, mrp: 145, gstRate: 0, hsnCode: '0713', openingStock: 50, minimumStock: 10, reorderLevel: 20, maximumStock: 100 },
    { name: 'Aashirvaad Superior MP Atta', sku: 'ATTA-001', barcode: '8901234000007', category: catFood._id, subCategory: subFlour._id, brand: AASH._id, unit: KG._id, purchasePrice: 40, sellingPrice: 48, mrp: 54, gstRate: 0, hsnCode: '1101', openingStock: 150, minimumStock: 30, reorderLevel: 50, maximumStock: 300 },
    { name: 'Maida (Refined Flour)', sku: 'ATTA-002', barcode: '8901234000008', category: catFood._id, subCategory: subFlour._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 34, sellingPrice: 42, mrp: 48, gstRate: 0, hsnCode: '1101', openingStock: 60, minimumStock: 15, reorderLevel: 25, maximumStock: 120 },
    { name: 'Sooji / Rava', sku: 'ATTA-003', barcode: '8901234000009', category: catFood._id, subCategory: subFlour._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 36, sellingPrice: 45, mrp: 50, gstRate: 0, hsnCode: '1103', openingStock: 50, minimumStock: 10, reorderLevel: 20, maximumStock: 100 },
    { name: 'Fortune Sunflower Oil', sku: 'OIL-001', barcode: '8901234000010', category: catFood._id, subCategory: subOil._id, brand: FORT._id, unit: L._id, purchasePrice: 135, sellingPrice: 155, mrp: 170, gstRate: 5, hsnCode: '1512', openingStock: 80, minimumStock: 20, reorderLevel: 30, maximumStock: 150 },
    { name: 'Fortune Mustard Oil', sku: 'OIL-002', barcode: '8901234000011', category: catFood._id, subCategory: subOil._id, brand: FORT._id, unit: L._id, purchasePrice: 125, sellingPrice: 145, mrp: 160, gstRate: 5, hsnCode: '1514', openingStock: 40, minimumStock: 10, reorderLevel: 15, maximumStock: 80 },
    { name: 'Amul Pure Ghee', sku: 'GHEE-001', barcode: '8901234000012', category: catFood._id, subCategory: subOil._id, brand: AMUL._id, unit: L._id, purchasePrice: 520, sellingPrice: 590, mrp: 630, gstRate: 12, hsnCode: '0405', openingStock: 30, minimumStock: 5, reorderLevel: 10, maximumStock: 60 },
    { name: 'Refined Sugar', sku: 'SGR-001', barcode: '8901234000013', category: catFood._id, subCategory: subSugar._id, brand: LOCAL._id, unit: KG._id, purchasePrice: 38, sellingPrice: 45, mrp: 50, gstRate: 5, hsnCode: '1701', openingStock: 200, minimumStock: 40, reorderLevel: 80, maximumStock: 400 },
    { name: 'Tata Salt (Iodized)', sku: 'SLT-001', barcode: '8901234000014', category: catFood._id, subCategory: subSugar._id, brand: TATA._id, unit: KG._id, purchasePrice: 20, sellingPrice: 28, mrp: 30, gstRate: 0, hsnCode: '2501', openingStock: 100, minimumStock: 20, reorderLevel: 40, maximumStock: 200 },
    { name: 'Everest Red Chilli Powder', sku: 'SPC-001', barcode: '8901234000015', category: catFood._id, subCategory: subSpice._id, brand: EVER._id, unit: G._id, purchasePrice: 28, sellingPrice: 38, mrp: 44, gstRate: 5, hsnCode: '0904', openingStock: 60, minimumStock: 15, reorderLevel: 25, maximumStock: 120 },
    { name: 'Everest Turmeric Powder', sku: 'SPC-002', barcode: '8901234000016', category: catFood._id, subCategory: subSpice._id, brand: EVER._id, unit: G._id, purchasePrice: 24, sellingPrice: 32, mrp: 38, gstRate: 5, hsnCode: '0910', openingStock: 50, minimumStock: 10, reorderLevel: 20, maximumStock: 100 },
    { name: 'Everest Garam Masala', sku: 'SPC-003', barcode: '8901234000017', category: catFood._id, subCategory: subSpice._id, brand: EVER._id, unit: G._id, purchasePrice: 35, sellingPrice: 46, mrp: 52, gstRate: 5, hsnCode: '0910', openingStock: 40, minimumStock: 10, reorderLevel: 15, maximumStock: 80 },
    { name: 'Everest Coriander Powder', sku: 'SPC-004', barcode: '8901234000018', category: catFood._id, subCategory: subSpice._id, brand: EVER._id, unit: G._id, purchasePrice: 22, sellingPrice: 30, mrp: 35, gstRate: 5, hsnCode: '0909', openingStock: 45, minimumStock: 10, reorderLevel: 15, maximumStock: 90 },

    // 2. Snacks & Biscuits (₹5, ₹10, ₹20, ₹30 Packs)
    { name: 'Good Day Butter Biscuits', sku: 'BSC-001', barcode: '8901234000019', category: catSnacks._id, subCategory: subBisc._id, brand: BRIT._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 18, hsnCode: '1905', openingStock: 120, minimumStock: 30, reorderLevel: 50, maximumStock: 250 },
    { name: 'Parle-G Gold Biscuits', sku: 'BSC-002', barcode: '8901234000020', category: catSnacks._id, subCategory: subBisc._id, brand: PARL._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 18, hsnCode: '1905', openingStock: 150, minimumStock: 40, reorderLevel: 60, maximumStock: 300 },
    { name: 'Britannia Marie Gold', sku: 'BSC-003', barcode: '8901234000021', category: catSnacks._id, subCategory: subBisc._id, brand: BRIT._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 18, hsnCode: '1905', openingStock: 90, minimumStock: 20, reorderLevel: 35, maximumStock: 180 },
    { name: 'Britannia Bourbon', sku: 'BSC-004', barcode: '8901234000022', category: catSnacks._id, subCategory: subBisc._id, brand: BRIT._id, unit: PC._id, purchasePrice: 16, sellingPrice: 20, mrp: 20, gstRate: 18, hsnCode: '1905', openingStock: 70, minimumStock: 15, reorderLevel: 25, maximumStock: 140 },
    { name: 'Oreo Vanilla Cookies', sku: 'BSC-005', barcode: '8901234000023', category: catSnacks._id, subCategory: subBisc._id, brand: CADB._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 18, hsnCode: '1905', openingStock: 80, minimumStock: 20, reorderLevel: 30, maximumStock: 160 },
    { name: 'Lays Classic Salted Chips', sku: 'CHP-001', barcode: '8901234000024', category: catSnacks._id, subCategory: subChips._id, brand: LOCAL._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 12, hsnCode: '2008', openingStock: 100, minimumStock: 25, reorderLevel: 40, maximumStock: 200 },
    { name: 'Lays Magic Masala Chips', sku: 'CHP-002', barcode: '8901234000025', category: catSnacks._id, subCategory: subChips._id, brand: LOCAL._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 12, hsnCode: '2008', openingStock: 100, minimumStock: 25, reorderLevel: 40, maximumStock: 200 },
    { name: 'Kurkure Masala Munch', sku: 'CHP-003', barcode: '8901234000026', category: catSnacks._id, subCategory: subChips._id, brand: LOCAL._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 12, hsnCode: '2008', openingStock: 90, minimumStock: 20, reorderLevel: 35, maximumStock: 180 },
    { name: 'Haldiram Aloo Bhujia', sku: 'CHP-004', barcode: '8901234000027', category: catSnacks._id, subCategory: subChips._id, brand: HALD._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 12, hsnCode: '2008', openingStock: 80, minimumStock: 20, reorderLevel: 30, maximumStock: 160 },
    { name: 'Maggi 2-Minute Masala Noodles', sku: 'NDL-001', barcode: '8901234000028', category: catSnacks._id, subCategory: subNoodles._id, brand: NEST._id, unit: PC._id, purchasePrice: 11.5, sellingPrice: 14, mrp: 14, gstRate: 18, hsnCode: '1902', openingStock: 140, minimumStock: 30, reorderLevel: 50, maximumStock: 280 },
    { name: 'Cadbury Dairy Milk Chocolate', sku: 'CHC-001', barcode: '8901234000029', category: catSnacks._id, subCategory: subChoc._id, brand: CADB._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 18, hsnCode: '1806', openingStock: 90, minimumStock: 20, reorderLevel: 30, maximumStock: 180 },

    // 3. Beverages & Dairy
    { name: 'Bisleri Packaged Water', sku: 'WTR-001', barcode: '8901234000030', category: catBev._id, subCategory: subWater._id, brand: BISL._id, unit: BTL._id, purchasePrice: 13, sellingPrice: 20, mrp: 20, gstRate: 18, hsnCode: '2201', openingStock: 120, minimumStock: 30, reorderLevel: 50, maximumStock: 250, expiryTracking: true },
    { name: 'Tata Tea Gold', sku: 'TEA-001', barcode: '8901234000031', category: catBev._id, subCategory: subTea._id, brand: TATA._id, unit: G._id, purchasePrice: 125, sellingPrice: 155, mrp: 170, gstRate: 5, hsnCode: '0902', openingStock: 50, minimumStock: 10, reorderLevel: 20, maximumStock: 100 },
    { name: 'Nescafe Classic Coffee', sku: 'COF-001', barcode: '8901234000032', category: catBev._id, subCategory: subTea._id, brand: NEST._id, unit: G._id, purchasePrice: 70, sellingPrice: 90, mrp: 100, gstRate: 18, hsnCode: '2101', openingStock: 40, minimumStock: 10, reorderLevel: 15, maximumStock: 80 },
    { name: 'Coca-Cola Cold Drink', sku: 'BEV-001', barcode: '8901234000033', category: catBev._id, subCategory: subColdDrink._id, brand: COKE._id, unit: BTL._id, purchasePrice: 32, sellingPrice: 40, mrp: 40, gstRate: 28, hsnCode: '2202', openingStock: 60, minimumStock: 15, reorderLevel: 25, maximumStock: 120, expiryTracking: true },
    { name: 'Thums Up Cold Drink', sku: 'BEV-002', barcode: '8901234000034', category: catBev._id, subCategory: subColdDrink._id, brand: COKE._id, unit: BTL._id, purchasePrice: 32, sellingPrice: 40, mrp: 40, gstRate: 28, hsnCode: '2202', openingStock: 60, minimumStock: 15, reorderLevel: 25, maximumStock: 120, expiryTracking: true },
    { name: 'Amul Taaza Fresh Milk', sku: 'MLK-001', barcode: '8901234000035', category: catBev._id, subCategory: subDairy._id, brand: AMUL._id, unit: L._id, purchasePrice: 24, sellingPrice: 27, mrp: 27, gstRate: 0, hsnCode: '0401', openingStock: 50, minimumStock: 15, reorderLevel: 25, maximumStock: 80, expiryTracking: true },

    // 4. Personal & Household Care
    { name: 'Lifebuoy Total Soap', sku: 'SOAP-001', barcode: '8901234000036', category: catHH._id, subCategory: subSoap._id, brand: LIFB._id, unit: PC._id, purchasePrice: 28, sellingPrice: 35, mrp: 38, gstRate: 18, hsnCode: '3401', openingStock: 80, minimumStock: 20, reorderLevel: 30, maximumStock: 160 },
    { name: 'Dettol Original Soap', sku: 'SOAP-002', barcode: '8901234000037', category: catHH._id, subCategory: subSoap._id, brand: DETT._id, unit: PC._id, purchasePrice: 30, sellingPrice: 38, mrp: 42, gstRate: 18, hsnCode: '3401', openingStock: 70, minimumStock: 15, reorderLevel: 25, maximumStock: 140 },
    { name: 'Surf Excel Easy Wash Detergent', sku: 'DET-001', barcode: '8901234000038', category: catHH._id, subCategory: subDet._id, brand: SURF._id, unit: KG._id, purchasePrice: 105, sellingPrice: 130, mrp: 145, gstRate: 18, hsnCode: '3402', openingStock: 50, minimumStock: 10, reorderLevel: 20, maximumStock: 100 },
    { name: 'Colgate Strong Teeth Toothpaste', sku: 'ORAL-001', barcode: '8901234000039', category: catHH._id, subCategory: subOral._id, brand: COLG._id, unit: PC._id, purchasePrice: 42, sellingPrice: 55, mrp: 60, gstRate: 18, hsnCode: '3306', openingStock: 60, minimumStock: 15, reorderLevel: 25, maximumStock: 120 },
    { name: 'Vim Dishwash Bar', sku: 'CLN-001', barcode: '8901234000040', category: catHH._id, subCategory: subClean._id, brand: VIM._id, unit: PC._id, purchasePrice: 8, sellingPrice: 10, mrp: 10, gstRate: 18, hsnCode: '3402', openingStock: 100, minimumStock: 25, reorderLevel: 40, maximumStock: 200 },
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
    { customerId: 'CUST-00001', name: 'Ramesh Kumar', mobile: '9842156789', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'regular' },
    { customerId: 'CUST-00002', name: 'Anand Natarajan', mobile: '9443218765', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'regular' },
    { customerId: 'CUST-00003', name: 'Suresh Kumar', mobile: '9789123450', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'credit', creditLimit: 5000 },
    { customerId: 'CUST-00004', name: 'Priya Devi', mobile: '9655432198', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'regular' },
    { customerId: 'CUST-00005', name: 'K. Murugan', mobile: '9944123890', city: 'Krishnagiri', state: 'Tamil Nadu', customerType: 'wholesale', creditLimit: 20000 },
  ]);

  // Users
  const adminUser = await User.create({ name: 'Admin User', email: 'admin@columbu.com', password: 'admin123', role: 'admin', mobile: '9000000000' });
  const cashier1 = await User.create({ name: 'Cashier 1', email: 'cashier@columbu.com', password: 'cashier123', role: 'cashier', mobile: '9000000001' });
  const cashier2 = await User.create({ name: 'Cashier 2', email: 'cashier2@columbu.com', password: 'cashier123', role: 'cashier', mobile: '9000000002' });

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
        createdBy: s % 2 === 0 ? cashier1._id : cashier2._id,
      });
    }
  }

  // Sample active incoming customer order
  await Order.create({
    customer: customers[0]._id,
    customerName: customers[0].name,
    customerMobile: customers[0].mobile,
    deliveryAddress: '14 Gandhi Road, Krishnagiri',
    status: 'pending',
    deliveryCharge: 30,
    items: [
      { product: rice._id, productName: rice.name, quantity: 2, unit: 'kg', notes: 'Basmati' },
      { product: oil._id, productName: oil.name, quantity: 1, unit: 'L', notes: 'Cooking oil' },
    ],
    notes: 'Please pack in eco-friendly bag',
  });

  // Sample Audit Logs
  const { AuditLog } = require('../models/System');
  await AuditLog.create([
    {
      user: cashier1._id,
      userName: 'Cashier 1',
      action: 'user_login',
      module: 'auth',
      description: 'Cashier 1 signed in to Billing Terminal',
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      user: cashier2._id,
      userName: 'Cashier 2',
      action: 'sale_created',
      module: 'sales',
      recordRef: 'KS-10024',
      description: 'Cashier 2 generated bill KS-10024 (₹1,450 • Cash)',
      createdAt: new Date(Date.now() - 1800000),
    },
  ]);

  console.log('Seed data created successfully!');
  console.log('\nLogin credentials:');
  console.log('  Admin:   admin@columbu.com / admin123');
  console.log('  Cashier: cashier@columbu.com / cashier123');
  if (exitOnComplete) {
    process.exit(0);
  }
}

if (require.main === module) {
  seed({ exitOnComplete: true }).catch(err => { console.error('Seed error:', err); process.exit(1); });
}

module.exports = { seed, runSeed: seed };
