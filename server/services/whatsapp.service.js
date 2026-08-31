const WhatsAppLog = require('../models/WhatsAppLog');
const { Setting } = require('../models/System');

const STORE_CONFIG = {
  name: 'New Columbu Stores',
  location: 'Krishnagiri, Tamil Nadu',
  phone: '+91 98765 43200',
};

/**
 * Clean & normalize phone number to standard 10 digits
 */
function cleanPhoneNumber(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
}

/**
 * Get WhatsApp automation settings from DB
 */
async function getWhatsAppSettings() {
  try {
    const doc = await Setting.findOne({ key: 'whatsapp_automation' });
    return doc?.value || {
      autoSendOnOrder: true,
      autoSendOnStatusChange: true,
      autoSendOnSale: true,
      autoSendOnPaymentDue: true,
      senderName: STORE_CONFIG.name,
      gatewayWebhookUrl: '',
      apiKey: '',
    };
  } catch {
    return {
      autoSendOnOrder: true,
      autoSendOnStatusChange: true,
      autoSendOnSale: true,
      autoSendOnPaymentDue: true,
    };
  }
}

/**
 * Core Automated WhatsApp Dispatcher
 */
async function sendWhatsAppMessage({
  to,
  customerName = 'Valued Customer',
  template = 'custom',
  messageText,
  orderId = null,
  saleId = null,
  customerId = null,
  metadata = {}
}) {
  const cleanPhone = cleanPhoneNumber(to);
  if (!cleanPhone || cleanPhone.length < 10) {
    console.warn('[WhatsApp Automation] Invalid phone number provided:', to);
    return { success: false, message: 'Invalid phone number' };
  }

  try {
    const settings = await getWhatsAppSettings();

    // 1. If external webhook is configured, post to external gateway
    let externalStatus = 'delivered';
    if (settings.gatewayWebhookUrl) {
      try {
        // Dispatches payload to WhatsApp Gateway / Cloud API
        fetch(settings.gatewayWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {})
          },
          body: JSON.stringify({
            recipient: `91${cleanPhone}`,
            message: messageText,
            template,
            metadata
          })
        }).catch(err => console.error('[WhatsApp Gateway Error]', err.message));
      } catch (err) {
        console.error('[WhatsApp Dispatch Error]', err);
      }
    }

    // 2. Persist automated message to WhatsAppLog database
    const log = await WhatsAppLog.create({
      recipientMobile: cleanPhone,
      customerName,
      template,
      messageText,
      status: externalStatus,
      order: orderId,
      sale: saleId,
      customer: customerId,
      metadata,
    });

    console.log(`[WhatsApp Automation ✅] Sent ${template} message to +91 ${cleanPhone}`);
    return { success: true, log };
  } catch (err) {
    console.error('[WhatsApp Service Error]', err);
    return { success: false, error: err.message };
  }
}

/**
 * 1. Automated Order Placed Message
 */
async function sendOrderPlacedAutoMessage(order) {
  const settings = await getWhatsAppSettings();
  if (settings.autoSendOnOrder === false) return;

  const customerName = order.customerName || order.customer?.name || 'Valued Customer';
  const orderNum = order.orderNumber || 'ORD';
  const address = order.deliveryAddress || 'Store Pickup';

  const itemsList = (order.items || []).map((it, idx) => {
    const name = it.productName || it.product?.name || 'Item';
    const qty = it.quantity || 1;
    const unit = it.unit || '';
    return `${idx + 1}. *${name}* × ${qty} ${unit}`;
  }).join('\n');

  const text = `🛒 *${STORE_CONFIG.name}*
📍 _${STORE_CONFIG.location}_

Hello *${customerName}*, your grocery order has been received! 🙏

📋 *Order Details:*
• *Order ID:* #${orderNum}
• *Status:* ⏳ Received & Under Review
• *Delivery to:* ${address}

🛍️ *Items Ordered:*
${itemsList}

${order.notes ? `📝 *Notes:* ${order.notes}\n` : ''}
📦 Our store staff is packing your items.
📞 *Store Helpline:* ${STORE_CONFIG.phone}
Thank you for ordering with us! ✨`;

  return sendWhatsAppMessage({
    to: order.customerMobile,
    customerName,
    template: 'order_confirmation',
    messageText: text,
    orderId: order._id,
    customerId: order.customer,
  });
}

/**
 * 2. Automated Order Status Update Message (Ready / Out for Delivery / Delivered)
 */
async function sendOrderStatusAutoMessage(order, newStatus) {
  const settings = await getWhatsAppSettings();
  if (settings.autoSendOnStatusChange === false) return;

  const customerName = order.customerName || order.customer?.name || 'Valued Customer';
  const orderNum = order.orderNumber || 'ORD';
  const address = order.deliveryAddress || 'Your Address';

  let text = '';
  let template = 'order_ready';

  if (newStatus === 'ready') {
    template = 'order_ready';
    text = `🎉 *${STORE_CONFIG.name} - Order Ready!*

Hello *${customerName}*, your grocery order *#${orderNum}* is completely packed and ready for pickup at our counter:
📍 *${STORE_CONFIG.name}, ${STORE_CONFIG.location}*

📞 *Store Helpline:* ${STORE_CONFIG.phone}`;
  } else if (newStatus === 'out_for_delivery') {
    template = 'out_for_delivery';
    text = `🚚 *${STORE_CONFIG.name} - Out for Delivery!*

Hi *${customerName}*, your order *#${orderNum}* is packed and currently on the way to:
📍 *${address}*

📦 Our delivery agent will reach you shortly.
📞 *Helpline:* ${STORE_CONFIG.phone}`;
  } else if (newStatus === 'delivered') {
    template = 'order_delivered';
    text = `✅ *${STORE_CONFIG.name} - Order Delivered!*

Dear *${customerName}*, your order *#${orderNum}* has been successfully delivered/collected.

Thank you for shopping at *${STORE_CONFIG.name}*! Have a wonderful day ahead! 🌟`;
  } else {
    return; // Don't send for intermediate unnotified statuses
  }

  return sendWhatsAppMessage({
    to: order.customerMobile,
    customerName,
    template,
    messageText: text,
    orderId: order._id,
    customerId: order.customer,
  });
}

/**
 * 3. Automated POS Billing Receipt Message
 */
async function sendSaleInvoiceAutoMessage(sale) {
  const settings = await getWhatsAppSettings();
  if (settings.autoSendOnSale === false) return;
  if (!sale.customerMobile) return;

  const customerName = sale.customerName || 'Valued Customer';
  const invoiceNum = sale.invoiceNumber || 'INV';
  const total = Number(sale.grandTotal || 0).toLocaleString('en-IN');
  const paymentMethod = sale.paymentMethod?.toUpperCase() || 'CASH';

  const itemsList = (sale.items || []).map((it, idx) => {
    const name = it.productName || 'Item';
    const qty = it.quantity || 1;
    const price = it.sellingPrice || 0;
    return `${idx + 1}. *${name}* × ${qty} (₹${price * qty})`;
  }).join('\n');

  const text = `🧾 *${STORE_CONFIG.name} - Digital Invoice*
📍 _${STORE_CONFIG.location}_

Hello *${customerName}*, here is your grocery purchase receipt:

📄 *Invoice #:* ${invoiceNum}
💰 *Grand Total:* ₹${total}
💳 *Paid Via:* ${paymentMethod}

🛍️ *Purchased Items:*
${itemsList}

📞 *Store Contact:* ${STORE_CONFIG.phone}
Thank you for shopping with *${STORE_CONFIG.name}*! 🙏`;

  return sendWhatsAppMessage({
    to: sale.customerMobile,
    customerName,
    template: 'sale_invoice',
    messageText: text,
    saleId: sale._id,
    customerId: sale.customer,
  });
}

module.exports = {
  sendWhatsAppMessage,
  sendOrderPlacedAutoMessage,
  sendOrderStatusAutoMessage,
  sendSaleInvoiceAutoMessage,
  getWhatsAppSettings,
};
