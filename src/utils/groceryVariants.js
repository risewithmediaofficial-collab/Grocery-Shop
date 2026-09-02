/**
 * Grocery Categories, Subcategories, and Packaging Variants Utility
 * Provides intelligent classification and variant generators for Indian Kirana & Supermarket items.
 */

export function isHexObjectId(str) {
  return typeof str === 'string' && /^[0-9a-fA-F]{24}$/.test(str.trim());
}

/**
 * Extracts or infers a clean, human-readable Category name.
 * Never returns raw MongoDB ObjectIds.
 */
export function getProductCategory(product) {
  if (!product) return 'Food & Staples';

  // 1. Populated category object
  if (product.category && typeof product.category === 'object' && product.category.name) {
    if (!isHexObjectId(product.category.name)) return product.category.name;
  }

  // 2. String category that is not an ObjectId
  if (typeof product.category === 'string' && !isHexObjectId(product.category) && product.category.trim()) {
    return product.category.trim();
  }

  // 3. Infer from name
  const name = (product.name || '').toLowerCase();
  if (
    name.includes('rice') ||
    name.includes('dal') ||
    name.includes('atta') ||
    name.includes('oil') ||
    name.includes('sugar') ||
    name.includes('salt') ||
    name.includes('spice') ||
    name.includes('masala') ||
    name.includes('flour') ||
    name.includes('grain')
  ) {
    return 'Food & Staples';
  }

  if (
    name.includes('biscuit') ||
    name.includes('cookie') ||
    name.includes('chip') ||
    name.includes('kurkure') ||
    name.includes('maggi') ||
    name.includes('noodle') ||
    name.includes('namkeen') ||
    name.includes('snack') ||
    name.includes('chocolate')
  ) {
    return 'Snacks & Biscuits';
  }

  if (
    name.includes('water') ||
    name.includes('tea') ||
    name.includes('coffee') ||
    name.includes('milk') ||
    name.includes('coke') ||
    name.includes('drink') ||
    name.includes('juice') ||
    name.includes('dairy')
  ) {
    return 'Beverages & Dairy';
  }

  if (
    name.includes('soap') ||
    name.includes('surf') ||
    name.includes('colgate') ||
    name.includes('vim') ||
    name.includes('detergent') ||
    name.includes('shampoo') ||
    name.includes('cleaner')
  ) {
    return 'Personal & Household Care';
  }

  return 'Food & Staples';
}

/**
 * Extracts or infers a clean, human-readable Subcategory name.
 * Never returns raw MongoDB ObjectIds.
 */
export function getProductSubcategory(product) {
  if (!product) return 'General Grocery';

  // 1. Populated subCategory object
  if (product.subCategory && typeof product.subCategory === 'object' && product.subCategory.name) {
    if (!isHexObjectId(product.subCategory.name)) return product.subCategory.name;
  }
  if (product.subcategory && typeof product.subcategory === 'object' && product.subcategory.name) {
    if (!isHexObjectId(product.subcategory.name)) return product.subcategory.name;
  }

  // 2. String subcategory that is not an ObjectId
  if (typeof product.subCategory === 'string' && !isHexObjectId(product.subCategory) && product.subCategory.trim()) {
    return product.subCategory.trim();
  }
  if (typeof product.subcategory === 'string' && !isHexObjectId(product.subcategory) && product.subcategory.trim()) {
    return product.subcategory.trim();
  }

  // 3. Infer human-readable Subcategory from name & category
  const name = (product.name || '').toLowerCase();
  const cat = (getProductCategory(product) || '').toLowerCase();

  // Rice & Grains
  if (name.includes('rice') || name.includes('poha') || name.includes('grain') || name.includes('wheat grain') || name.includes('basmati') || name.includes('sona masoori')) {
    return 'Rice & Grains';
  }
  // Dal & Pulses
  if (name.includes('dal') || name.includes('pulse') || name.includes('gram') || name.includes('rajma') || name.includes('chana') || name.includes('moong') || name.includes('urad') || name.includes('toor')) {
    return 'Dal & Pulses';
  }
  // Flour & Atta
  if (name.includes('atta') || name.includes('maida') || name.includes('sooji') || name.includes('rava') || name.includes('flour') || name.includes('besan') || name.includes('wheat flour')) {
    return 'Flour & Atta';
  }
  // Cooking Oils & Ghee
  if (name.includes('oil') || name.includes('ghee') || name.includes('vanaspati') || name.includes('sunflower') || name.includes('mustard')) {
    return 'Cooking Oil & Ghee';
  }
  // Sugar & Salt
  if (name.includes('sugar') || name.includes('salt') || name.includes('jaggery') || name.includes('shakar') || name.includes('gur')) {
    return 'Sugar & Salt';
  }
  // Spices & Masala
  if (name.includes('masala') || name.includes('chilli') || name.includes('turmeric') || name.includes('coriander') || name.includes('spice') || name.includes('pepper') || name.includes('jeera') || name.includes('mustard seed') || name.includes('haldi') || name.includes('mirch')) {
    return 'Spices & Masala';
  }

  // Packaged Water
  if (name.includes('water') || name.includes('bisleri') || name.includes('aquafina') || name.includes('kinley') || name.includes('bailley')) {
    return 'Packaged Water';
  }
  // Tea & Coffee
  if (name.includes('tea') || name.includes('coffee') || name.includes('bru') || name.includes('nescafe') || name.includes('tata tea') || name.includes('taj mahal')) {
    return 'Tea & Coffee';
  }
  // Cold Drinks & Juices
  if (name.includes('coke') || name.includes('pepsi') || name.includes('cola') || name.includes('sprite') || name.includes('fanta') || name.includes('juice') || name.includes('drink') || name.includes('frooti') || name.includes('maaza') || name.includes('thums up') || name.includes('limca')) {
    return 'Cold Drinks & Juices';
  }
  // Dairy & Milk
  if (name.includes('milk') || name.includes('curd') || name.includes('butter') || name.includes('paneer') || name.includes('cheese') || name.includes('dahi') || name.includes('amul milk') || name.includes('taaza')) {
    return 'Dairy & Milk';
  }

  // Biscuits & Cookies
  if (name.includes('biscuit') || name.includes('cookie') || name.includes('parle') || name.includes('good day') || name.includes('marie') || name.includes('bourbon') || name.includes('oreo') || name.includes('monaco') || name.includes('krackjack')) {
    return 'Biscuits & Cookies';
  }
  // Chips & Namkeen
  if (name.includes('chip') || name.includes('kurkure') || name.includes('namkeen') || name.includes('bhujia') || name.includes('snack') || name.includes('lays') || name.includes('bingo') || name.includes('haldiram')) {
    return 'Chips & Namkeen';
  }
  // Noodles & Instant Food
  if (name.includes('maggi') || name.includes('noodle') || name.includes('pasta') || name.includes('yippee') || name.includes('soup') || name.includes('oats')) {
    return 'Noodles & Instant Food';
  }
  // Chocolates & Sweets
  if (name.includes('chocolate') || name.includes('cadbury') || name.includes('dairy milk') || name.includes('5 star') || name.includes('kitkat') || name.includes('sweet') || name.includes('candy')) {
    return 'Chocolates & Sweets';
  }

  // Soaps & Body Wash
  if (name.includes('soap') || name.includes('body wash') || name.includes('lifebuoy') || name.includes('dettol') || name.includes('dove') || name.includes('lux') || name.includes('santoor') || name.includes('cinthol')) {
    return 'Soaps & Body Wash';
  }
  // Detergents & Fabric Care
  if (name.includes('surf') || name.includes('detergent') || name.includes('washing') || name.includes('rin') || name.includes('tide') || name.includes('aerial') || name.includes('wheel') || name.includes('ghadi')) {
    return 'Detergents & Fabric Care';
  }
  // Oral Care
  if (name.includes('paste') || name.includes('brush') || name.includes('colgate') || name.includes('oral') || name.includes('pepsodent') || name.includes('sensodyne') || name.includes('closeup')) {
    return 'Oral Care';
  }
  // Dishwash & Cleaners
  if (name.includes('vim') || name.includes('dishwash') || name.includes('harpic') || name.includes('lizol') || name.includes('cleaner') || name.includes('pril') || name.includes('exo')) {
    return 'Dishwash & Cleaners';
  }

  if (cat.includes('food')) return 'Food Essentials';
  if (cat.includes('snack')) return 'Packaged Snacks';
  if (cat.includes('bev')) return 'Packaged Beverages';
  if (cat.includes('house')) return 'Household Essentials';

  return 'General Grocery';
}

/**
 * Emoji icons corresponding to subcategories
 */
export const SUBCATEGORY_ICONS = {
  'all': '✨',
  'rice & grains': '🌾',
  'dal & pulses': '🥣',
  'flour & atta': '🌾',
  'cooking oil & ghee': '🛢️',
  'sugar & salt': '🍬',
  'spices & masala': '🌿',
  'packaged water': '💧',
  'tea & coffee': '☕',
  'cold drinks & juices': '🥤',
  'dairy & milk': '🥛',
  'biscuits & cookies': '🍪',
  'chips & namkeen': '🍿',
  'noodles & instant food': '🍜',
  'chocolates & sweets': '🍫',
  'soaps & body wash': '🧼',
  'detergents & fabric care': '🧺',
  'oral care': '🪥',
  'dishwash & cleaners': '🧽',
  'food essentials': '🍚',
  'packaged snacks': '🍿',
  'packaged beverages': '🥤',
  'household essentials': '🧼',
  'general grocery': '🛒',
};

/**
 * Intelligent packaging & variant generator tailored for grocery retail.
 * Returns structured options for:
 * 1. Commodity Loose staples (Rice, Sugar, Atta, Dals) -> Loose KG input/stepper + Bags (25kg, 50kg, 10kg, 5kg).
 * 2. Packaged Liquids (Water bottles, Cooking Oils, Drinks) -> 500ml, 1 Liter, 2 Liter, 5 Liter, 15 Liter.
 * 3. Packaged Spices & Masala -> 50g, 100g, 250g, 500g, 1kg.
 * 4. Biscuits & Snacks -> ₹5 Pack, ₹10 Pack, ₹20 Pack, ₹30 Pack.
 * 5. General Packaged -> Single Pack, Pack of 4/6, Box, Carton.
 */
export function getProductVariantConfig(product) {
  if (!product) return { type: 'packaged_general', options: [] };
  const baseRate = Number(product.sellingPrice || 0);
  const unitSymbol = (product.unit?.symbol || product.unit || '').toLowerCase();
  const catName = (product.category?.name || product.category || '').toLowerCase();
  const prodName = (product.name || '').toLowerCase();

  // 1. Loose Commodity Staples (Sugar, Rice, Atta, Maida, Dals, Wheat, Flours, Grains)
  const isLooseCommodity =
    catName.includes('grain') ||
    catName.includes('staple') ||
    catName.includes('flour') ||
    prodName.includes('rice') ||
    prodName.includes('sugar') ||
    prodName.includes('atta') ||
    prodName.includes('maida') ||
    prodName.includes('dal') ||
    prodName.includes('wheat') ||
    prodName.includes('sooji') ||
    prodName.includes('rava') ||
    prodName.includes('flour') ||
    (unitSymbol === 'kg' && !prodName.includes('bottle') && !prodName.includes('can'));

  if (isLooseCommodity) {
    const bag25DiscountRate = Math.max(1, Math.round(baseRate > 50 ? baseRate - 1 : baseRate * 0.98));
    const bag50DiscountRate = Math.max(1, Math.round(baseRate > 50 ? baseRate - 2 : baseRate * 0.96));

    const bagOptions = [
      { id: 'bag_25', label: '25 kg Bag', size: 25, price: 25 * bag25DiscountRate, ratePerKg: bag25DiscountRate },
      { id: 'bag_10', label: '10 kg Bag', size: 10, price: 10 * baseRate, ratePerKg: baseRate },
      { id: 'bag_50', label: '50 kg Bag', size: 50, price: 50 * bag50DiscountRate, ratePerKg: bag50DiscountRate },
    ];

    return {
      type: 'commodity_loose',
      primaryUnit: 'kg',
      baseRate,
      bagOptions,
      defaultBagOption: bagOptions[0],
    };
  }

  // 2. Packaged Liquids & Beverages (Water Bottles, Cooking Oils, Drinks, Juices, Milk)
  const isLiquid =
    unitSymbol.includes('l') ||
    unitSymbol.includes('ml') ||
    unitSymbol.includes('btl') ||
    catName.includes('beverage') ||
    catName.includes('drink') ||
    catName.includes('oil') ||
    prodName.includes('water') ||
    prodName.includes('oil') ||
    prodName.includes('milk') ||
    prodName.includes('juice') ||
    prodName.includes('soda') ||
    prodName.includes('cola') ||
    prodName.includes('drink');

  if (isLiquid) {
    const isWater = prodName.includes('water') || prodName.includes('bisleri') || prodName.includes('aquafina') || prodName.includes('kinley');
    let liquidOptions = [];
    if (isWater) {
      liquidOptions = [
        { id: '500ml', label: '500 ml', unitDescription: 'Bottle', price: Math.max(10, Math.round(baseRate * 0.5)) },
        { id: '1L', label: '1 Liter', unitDescription: 'Bottle', price: baseRate || 20 },
        { id: '2L', label: '2 Liter', unitDescription: 'Bottle', price: Math.max(30, Math.round(baseRate * 1.85)) },
        { id: '5L', label: '5 Liter', unitDescription: 'Can', price: Math.max(65, Math.round(baseRate * 4.5)) },
      ];
    } else {
      liquidOptions = [
        { id: '500ml', label: '500 ml', unitDescription: 'Pouch / Bottle', price: Math.round(baseRate * 0.52) },
        { id: '1L', label: '1 Liter', unitDescription: 'Pouch / Bottle', price: baseRate || 140 },
        { id: '2L', label: '2 Liter', unitDescription: 'Bottle / Jar', price: Math.round(2 * (baseRate > 20 ? baseRate - 3 : baseRate)) },
        { id: '5L', label: '5 Liter', unitDescription: 'Can / Jar', price: Math.round(5 * (baseRate > 20 ? baseRate - 6 : baseRate * 0.95)) },
        { id: '15L', label: '15 Liter', unitDescription: 'Tin / Jar', price: Math.round(15 * (baseRate > 20 ? baseRate - 12 : baseRate * 0.9)) },
      ];
    }

    const defaultOpt = liquidOptions.find(o => prodName.includes(o.id.toLowerCase()) || prodName.includes(o.label.toLowerCase())) || liquidOptions[1] || liquidOptions[0];

    return {
      type: 'packaged_liquid',
      options: liquidOptions,
      selectedOption: defaultOpt,
    };
  }

  // 3. Packaged Spices / Masalas / Powders / Tea / Coffee (100g, 250g, 500g, 1kg)
  const isMasalaOrPowder =
    catName.includes('spice') ||
    catName.includes('masala') ||
    catName.includes('tea') ||
    catName.includes('coffee') ||
    prodName.includes('masala') ||
    prodName.includes('powder') ||
    prodName.includes('spice') ||
    prodName.includes('chilli') ||
    prodName.includes('turmeric') ||
    prodName.includes('coriander') ||
    prodName.includes('salt') ||
    prodName.includes('tea') ||
    prodName.includes('coffee') ||
    prodName.includes('pouch');

  if (isMasalaOrPowder) {
    const masalaOptions = [
      { id: '50g', label: '50g', unitDescription: 'Packet', price: Math.max(10, Math.round(baseRate * 0.55)) },
      { id: '100g', label: '100g', unitDescription: 'Packet', price: baseRate || 30 },
      { id: '250g', label: '250g', unitDescription: 'Packet', price: Math.max(25, Math.round(baseRate * 2.35)) },
      { id: '500g', label: '500g', unitDescription: 'Pack', price: Math.max(45, Math.round(baseRate * 4.6)) },
      { id: '1kg', label: '1 kg', unitDescription: 'Pack', price: Math.max(80, Math.round(baseRate * 9.0)) },
    ];

    const defaultOpt = masalaOptions.find(o => prodName.includes(o.id.toLowerCase()) || prodName.includes(o.label.toLowerCase())) || masalaOptions[1] || masalaOptions[0];

    return {
      type: 'packaged_masala',
      options: masalaOptions,
      selectedOption: defaultOpt,
    };
  }

  // 4. Biscuits, Cookies, Chips, Namkeen & Confectionery (₹5, ₹10, ₹20, ₹30 Packs)
  const isSnacksOrBiscuits =
    catName.includes('snack') ||
    catName.includes('biscuit') ||
    catName.includes('cookie') ||
    prodName.includes('biscuit') ||
    prodName.includes('cookie') ||
    prodName.includes('parle') ||
    prodName.includes('good day') ||
    prodName.includes('marie') ||
    prodName.includes('chips') ||
    prodName.includes('kurkure') ||
    prodName.includes('lays') ||
    prodName.includes('namkeen') ||
    prodName.includes('bhujia') ||
    prodName.includes('maggi') ||
    prodName.includes('noodles') ||
    prodName.includes('chocolate') ||
    prodName.includes('candy');

  if (isSnacksOrBiscuits) {
    const snackOptions = [
      { id: 'pack_5', label: '₹5 Pack', unitDescription: 'Small Pack', price: 5 },
      { id: 'pack_10', label: '₹10 Pack', unitDescription: 'Standard Pack', price: 10 },
      { id: 'pack_20', label: '₹20 Pack', unitDescription: 'Medium Pack', price: 20 },
      { id: 'pack_30', label: '₹30 Pack', unitDescription: 'Family Pack', price: 30 },
    ];

    const defaultOpt = snackOptions.find(o => baseRate === o.price) || snackOptions[1] || snackOptions[0];

    return {
      type: 'packaged_snack_price',
      options: snackOptions,
      selectedOption: defaultOpt,
    };
  }

  // 5. General Retail Packaged Goods (Personal Care, Cleaning, FMCG)
  const defaultPackOptions = [
    { id: 'single', label: 'Single Pack (1 pc)', multiplier: 1, price: baseRate },
    { id: 'pack_4', label: 'Pack of 4', multiplier: 4, price: Math.round(4 * (baseRate > 20 ? baseRate - 1 : baseRate)) },
    { id: 'pack_6', label: 'Pack of 6 (Half Dozen)', multiplier: 6, price: Math.round(6 * (baseRate > 20 ? baseRate - 2 : baseRate)) },
    { id: 'box_12', label: 'Box (12 pcs / 1 Dozen)', multiplier: 12, price: Math.round(12 * (baseRate > 20 ? baseRate - 3 : baseRate * 0.95)) },
    { id: 'carton_24', label: 'Master Carton (24 pcs)', multiplier: 24, price: Math.round(24 * (baseRate > 20 ? baseRate - 5 : baseRate * 0.92)) },
  ];

  return {
    type: 'packaged_general',
    options: defaultPackOptions,
    selectedOption: defaultPackOptions[0],
  };
}
