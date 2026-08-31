/**
 * WhatsApp Messaging Utility for New Columbu Stores (Krishnagiri)
 * Generates automated formatted WhatsApp messages and universal click-to-chat links
 */

export const STORE_DETAILS = {
  name: 'New Columbu Stores',
  tagline: 'Fresh Groceries & Supermarket',
  location: 'Krishnagiri, Tamil Nadu',
  phone: '+91 98765 43200',
  cleanPhone: '919876543200',
};

/**
 * Format currency in Indian Rupees
 */
const fmtPrice = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

/**
 * 1. Automated Order Confirmation & Thank You Message
 */
export function generateOrderConfirmationMessage(order, store = STORE_DETAILS) {
  const customerName = order.customerName || order.customer?.name || 'Valued Customer';
  const orderNum = order.orderNumber || 'ORD';
  const address = order.deliveryAddress || 'Store Pickup';
  
  const itemsText = (order.items || []).map((item, idx) => {
    const pName = item.productName || item.product?.name || 'Grocery Item';
    const qty = item.quantity || 1;
    const unit = item.unit || '';
    const note = item.notes ? ` (${item.notes})` : '';
    return `${idx + 1}. *${pName}* × ${qty} ${unit}${note}`;
  }).join('\n');

  return `🛒 *${store.name}*
📍 _${store.location}_

Hello *${customerName}*, thank you for placing your grocery order with us! 🙏

📋 *Order Details:*
• *Order ID:* #${orderNum}
• *Status:* ⏳ Received & Under Review
• *Delivery to:* ${address}

🛍️ *Items Ordered:*
${itemsText}

${order.notes ? `📝 *Special Notes:* ${order.notes}\n` : ''}
📦 Our store staff is packing your fresh items. We will notify you once your order is on the way!

📞 *Need Assistance?*
Contact: ${store.phone}
Thank you for shopping with *${store.name}*! ✨`;
}

/**
 * 2. Automated "Out for Delivery" Update Message
 */
export function generateOutForDeliveryMessage(order, store = STORE_DETAILS) {
  const customerName = order.customerName || order.customer?.name || 'Valued Customer';
  const orderNum = order.orderNumber || 'ORD';
  const address = order.deliveryAddress || 'Your Address';

  return `🚚 *${store.name} - Order Out for Delivery!*

Hi *${customerName}*, your grocery order *#${orderNum}* is packed and currently on the way to:
📍 *${address}*

📦 Our delivery executive will reach you shortly. Please keep payment/cash ready if applicable.

📞 *Store Helpline:* ${store.phone}
Thank you for choosing *${store.name}*!`;
}

/**
 * 3. Automated "Order Ready for Pickup" Message
 */
export function generateOrderReadyMessage(order, store = STORE_DETAILS) {
  const customerName = order.customerName || order.customer?.name || 'Valued Customer';
  const orderNum = order.orderNumber || 'ORD';

  return `🎉 *${store.name} - Order Ready for Pickup!*

Hello *${customerName}*, your grocery order *#${orderNum}* is completely packed and ready for pickup at our counter:
📍 *${store.name}, ${store.location}*

You can collect your items anytime today during store hours.

📞 *Queries:* ${store.phone}
See you soon! 😊`;
}

/**
 * 4. Automated "Order Completed / Thank You" Message
 */
export function generateOrderDeliveredMessage(order, store = STORE_DETAILS) {
  const customerName = order.customerName || order.customer?.name || 'Valued Customer';
  const orderNum = order.orderNumber || 'ORD';

  return `✅ *${store.name} - Order Completed!*

Dear *${customerName}*, your order *#${orderNum}* has been successfully delivered/collected.

Thank you for shopping at *${store.name}*! We appreciate your trust in us for your household grocery essentials.

🌟 Have a wonderful day ahead!`;
}

/**
 * Open WhatsApp directly with prefilled text (supports WhatsApp Web and Mobile App)
 */
export function openWhatsAppChat(mobile, messageText) {
  if (!mobile) return;
  const cleanMobile = String(mobile).replace(/\D/g, '');
  const recipient = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
  const encoded = encodeURIComponent(messageText);
  const url = `https://wa.me/${recipient}?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
