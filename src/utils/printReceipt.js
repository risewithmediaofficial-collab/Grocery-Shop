/**
 * printReceipt.js
 * Prints a clean thermal receipt directly via a hidden iframe
 * without navigating away from the POS screen.
 */

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function printReceipt(sale) {
  if (!sale) return;

  // Remove any previously created print iframes
  const oldIframe = document.getElementById('pos-thermal-print-frame');
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-thermal-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const saleDate = sale.saleDate ? new Date(sale.saleDate) : new Date();
  const dateStr = saleDate.toLocaleDateString('en-IN');
  const timeStr = saleDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const totalQty = (sale.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const items = sale.items || [];

  const totalSaved = Number(sale.totalSavings || 0) > 0
    ? Number(sale.totalSavings)
    : items.reduce((acc, it) => acc + Math.max(0, (Number(it.mrp || 0) - Number(it.sellingPrice || 0)) * (Number(it.quantity) || 0)), 0);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${sale.invoiceNumber || 'Bill'}</title>
  <style>
    @page {
      margin: 5mm;
      size: auto;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Courier New', Courier, monospace, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 6px;
      width: 290px;
      max-width: 100%;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .header {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #444;
      margin-bottom: 8px;
    }
    .logo-box {
      width: 38px;
      height: 38px;
      border-radius: 6px;
      background: #1a3c5e;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 900;
      flex-shrink: 0;
      text-align: center;
      line-height: 38px;
    }
    .store-info {
      text-align: left;
    }
    .store-name {
      font-size: 13.5px;
      font-weight: 900;
      margin: 0 0 2px 0;
      letter-spacing: 0.5px;
      color: #000;
    }
    .store-sub {
      font-size: 9.5px;
      color: #333;
      margin: 1px 0;
    }
    .meta-sec {
      border-bottom: 1px dashed #444;
      padding-bottom: 6px;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .flex-between {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 2px;
    }
    .items-header {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 10px;
      border-bottom: 1px solid #222;
      padding-bottom: 3px;
      margin-bottom: 5px;
    }
    .item-row {
      margin-bottom: 6px;
      border-bottom: 1px dotted #e5e5e5;
      padding-bottom: 3px;
    }
    .item-row:last-child {
      border-bottom: none;
    }
    .item-title-row {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 11px;
    }
    .item-desc {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #444;
      margin-top: 1px;
    }
    .savings-tag {
      color: #047857;
      font-weight: bold;
    }
    .totals-sec {
      border-top: 1px dashed #444;
      border-bottom: 1px dashed #444;
      padding: 6px 0;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 900;
      border-top: 1px solid #111;
      padding-top: 4px;
      margin-top: 4px;
    }
    .pay-sec {
      border-bottom: 1px dashed #444;
      padding-bottom: 6px;
      margin-bottom: 6px;
      font-size: 10px;
    }
    .savings-box {
      border: 1px solid #059669;
      background: #ecfdf5;
      color: #065f46;
      text-align: center;
      font-weight: bold;
      padding: 5px;
      border-radius: 4px;
      margin: 8px 0;
      font-size: 10px;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      color: #555;
      margin-top: 6px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">NC</div>
    <div class="store-info">
      <div class="store-name">NEW COLUMBU STORES</div>
      <div class="store-sub">Main Road, Krishnagiri, Tamil Nadu – 635001</div>
      <div class="store-sub">GSTIN: 33AABCK1234A1Z5 | Ph: +91 98765 43200</div>
    </div>
  </div>

  <div class="meta-sec">
    <div class="flex-between">
      <span>Receipt #: <b>${sale.invoiceNumber || 'N/A'}</b></span>
      <span>${dateStr}</span>
    </div>
    <div class="flex-between">
      <span>Time: ${timeStr}</span>
      <span>Cashier: ${sale.createdBy?.name || 'Staff'}</span>
    </div>
    <div class="flex-between">
      <span>Customer: <b>${sale.customerName || 'Walk-in'}</b></span>
      ${sale.customerMobile ? `<span>${sale.customerMobile}</span>` : ''}
    </div>
  </div>

  <div class="items-header">
    <span>ITEM & CALCULATION</span>
    <span>TOTAL</span>
  </div>

  <div class="items-list">
    ${items.map(it => `
      <div class="item-row">
        <div class="item-title-row">
          <span>${it.productName || 'Item'}</span>
          <span>${fmt(it.totalAmount)}</span>
        </div>
        <div class="item-desc">
          <span>${it.unit ? `₹${it.sellingPrice} / ${it.unit} • ` : ''}${it.quantity} ${it.unit || ''} × ₹${it.sellingPrice}</span>
          ${it.mrp > it.sellingPrice ? `<span class="savings-tag">Save ${fmt((it.mrp - it.sellingPrice) * it.quantity)}</span>` : ''}
        </div>
      </div>
    `).join('')}
  </div>

  <div class="totals-sec">
    <div class="flex-between">
      <span>Total Items: ${items.length} (Qty: ${totalQty})</span>
      <span>Subtotal: ${fmt(sale.subtotal)}</span>
    </div>
    ${Number(sale.totalDiscount || 0) > 0 ? `
      <div class="flex-between" style="color: #047857; font-weight: bold;">
        <span>Discount:</span>
        <span>-${fmt(sale.totalDiscount)}</span>
      </div>
    ` : ''}
    <div class="flex-between">
      <span>GST Tax (CGST+SGST):</span>
      <span>${fmt(sale.totalTax)}</span>
    </div>
    ${Number(sale.roundOff || 0) !== 0 ? `
      <div class="flex-between">
        <span>Round Off:</span>
        <span>${fmt(sale.roundOff)}</span>
      </div>
    ` : ''}
    <div class="grand-total-row">
      <span>GRAND TOTAL:</span>
      <span>${fmt(sale.grandTotal)}</span>
    </div>
  </div>

  <div class="pay-sec">
    <div class="flex-between">
      <span>Payment Mode:</span>
      <span style="font-weight: bold; text-transform: uppercase;">${sale.paymentMethod || 'CASH'}</span>
    </div>
    <div class="flex-between">
      <span>Amount Paid:</span>
      <span>${fmt(sale.amountPaid || sale.grandTotal)}</span>
    </div>
    ${Number(sale.changeReturned || 0) > 0 ? `
      <div class="flex-between">
        <span>Change Returned:</span>
        <span>${fmt(sale.changeReturned)}</span>
      </div>
    ` : ''}
    ${Number(sale.amountDue || 0) > 0 ? `
      <div class="flex-between" style="color: #b91c1c; font-weight: bold;">
        <span>Balance Due:</span>
        <span>${fmt(sale.amountDue)}</span>
      </div>
    ` : ''}
  </div>

  ${totalSaved > 0 ? `
    <div class="savings-box">
      <div>TOTAL SAVINGS: ${fmt(totalSaved)}</div>
      <div style="font-size: 8.5px; font-weight: normal; margin-top: 1px;">Thank you for saving with us</div>
    </div>
  ` : ''}

  <div class="footer">
    <div>Thank you for shopping at New Columbu Stores!</div>
    <div>Please visit again</div>
  </div>
</body>
</html>`;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Print automatically after content is ready
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // Clean up iframe after print dialog resolves
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        iframe.remove();
      }
    }, 2000);
  }, 250);
}

/**
 * Prints an Order Invoice / Delivery Bill directly without navigating away
 */
export function printOrderReceipt(order) {
  if (!order) return;

  const oldIframe = document.getElementById('pos-thermal-print-frame');
  if (oldIframe) oldIframe.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-thermal-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const dateStr = orderDate.toLocaleDateString('en-IN');
  const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const items = order.items || [];
  const totalQty = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const deliveryCharge = Number(order.deliveryCharge || 0);
  const itemsTotal = items.reduce((acc, it) => acc + (Number(it.totalPrice) || (Number(it.unitPrice || 0) * Number(it.quantity || 1))), 0);
  const grandTotal = Number(order.totalAmount || (itemsTotal + deliveryCharge));
  const isPaid = order.paymentStatus === 'paid';
  const isOnline = (order.orderType || 'online') === 'online';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Invoice - ${order.orderNumber || 'Order'}</title>
  <style>
    @page { margin: 5mm; size: auto; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Courier New', Courier, monospace, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 6px;
      width: 290px;
      max-width: 100%;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .header {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #444;
      margin-bottom: 8px;
    }
    .logo-box {
      width: 38px;
      height: 38px;
      border-radius: 6px;
      background: #1a3c5e;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 900;
      flex-shrink: 0;
      text-align: center;
      line-height: 38px;
    }
    .store-info { text-align: left; }
    .store-name {
      font-size: 13.5px;
      font-weight: 900;
      margin: 0 0 2px 0;
      letter-spacing: 0.5px;
      color: #000;
    }
    .store-sub { font-size: 9px; color: #444; margin: 0; line-height: 1.3; }
    .divider { border-top: 1px dashed #666; margin: 6px 0; }
    .flex-between { display: flex; justify-content: space-between; align-items: baseline; }
    .items-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
    .items-table th {
      border-bottom: 1px dashed #666;
      padding: 3px 0;
      text-align: left;
      font-size: 9.5px;
      font-weight: bold;
    }
    .items-table td { padding: 3px 0; vertical-align: top; }
    .total-box {
      border-top: 1px dashed #444;
      border-bottom: 1px dashed #444;
      padding: 6px 0;
      margin: 6px 0;
      font-size: 12px;
      font-weight: 900;
    }
    .badge {
      display: inline-block;
      padding: 2px 5px;
      font-size: 9px;
      font-weight: 900;
      border: 1px solid #000;
      border-radius: 3px;
      text-transform: uppercase;
    }
    .pay-badge {
      padding: 4px;
      text-align: center;
      font-weight: 900;
      font-size: 11px;
      margin: 6px 0;
      border: 1px dashed #000;
      border-radius: 4px;
    }
    .footer { text-align: center; font-size: 9px; color: #444; margin-top: 8px; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-box">NC</div>
    <div class="store-info">
      <div class="store-name">NEW COLUMBU STORES</div>
      <div class="store-sub">Fresh Groceries & Provisions</div>
      <div class="store-sub">Ph: +91 98765 43210</div>
    </div>
  </div>

  <div style="font-size: 10px; line-height: 1.4; margin-bottom: 6px;">
    <div class="flex-between">
      <span><strong>ORDER #:</strong> ${order.orderNumber || '-'}</span>
      <span class="badge">${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
    </div>
    <div class="flex-between" style="color: #444; font-size: 9px;">
      <span>Date: ${dateStr} ${timeStr}</span>
      <span>Status: ${(order.status || 'Pending').toUpperCase()}</span>
    </div>
  </div>

  <div class="divider"></div>

  <div style="font-size: 10px; line-height: 1.35; margin: 4px 0;">
    <div><strong>Customer:</strong> ${order.customerName || 'Walk-in Customer'}</div>
    ${order.customerMobile ? `<div><strong>Phone:</strong> +91 ${order.customerMobile}</div>` : ''}
    <div><strong>Delivery Mode:</strong> ${deliveryCharge > 0 ? 'Home Delivery' : 'Store Pickup'}</div>
    ${order.deliveryAddress ? `<div><strong>Address:</strong> ${order.deliveryAddress}</div>` : ''}
    ${order.notes ? `<div><strong>Note:</strong> ${order.notes}</div>` : ''}
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 52%;">ITEM</th>
        <th style="width: 16%; text-align: center;">QTY</th>
        <th style="width: 16%; text-align: right;">RATE</th>
        <th style="width: 16%; text-align: right;">AMT</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(it => {
        const qty = Number(it.quantity || 1);
        const rate = Number(it.unitPrice || 0);
        const amt = Number(it.totalPrice || (rate * qty));
        return `
          <tr>
            <td>
              <div style="font-weight: bold;">${it.productName || 'Grocery Item'}</div>
              ${it.isPacked ? '<span style="font-size: 8px; color: #166534;">[PACKED]</span>' : ''}
            </td>
            <td style="text-align: center;">${qty} ${it.unit || ''}</td>
            <td style="text-align: right;">${rate > 0 ? `₹${rate}` : '-'}</td>
            <td style="text-align: right; font-weight: bold;">₹${amt.toFixed(2)}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="divider"></div>

  <div style="font-size: 10px; line-height: 1.5;">
    <div class="flex-between">
      <span>Items Subtotal (${totalQty} pcs):</span>
      <span>${fmt(itemsTotal)}</span>
    </div>
    ${deliveryCharge > 0 ? `
      <div class="flex-between">
        <span>Delivery Charges:</span>
        <span>${fmt(deliveryCharge)}</span>
      </div>
    ` : `
      <div class="flex-between" style="color: #166534;">
        <span>Delivery Charges:</span>
        <span>FREE</span>
      </div>
    `}
  </div>

  <div class="total-box flex-between">
    <span>TOTAL BILL:</span>
    <span>${fmt(grandTotal)}</span>
  </div>

  <div class="pay-badge" style="background: ${isPaid ? '#ecfdf5' : '#fffbeb'}; border-color: ${isPaid ? '#10b981' : '#f59e0b'};">
    ${isPaid ? `
      <div>✅ PAYMENT COMPLETED</div>
      <div style="font-size: 9px; font-weight: normal; margin-top: 1px;">
        Paid ₹${Number(order.paidAmount || grandTotal)} via ${(order.paymentMethod || 'cash').toUpperCase()}
        ${order.collectedBy ? `(Collected by ${order.collectedBy})` : ''}
      </div>
    ` : `
      <div>⚠️ TO COLLECT ON DELIVERY</div>
      <div style="font-size: 12px; font-weight: 900; margin-top: 2px;">
        COLLECT: ${fmt(grandTotal)}
      </div>
      <div style="font-size: 8.5px; font-weight: normal; margin-top: 2px;">
        Accept Cash or Scan Shop UPI QR Code
      </div>
    `}
  </div>

  <div class="footer">
    <div>*** DIGITAL DELIVERY INVOICE ***</div>
    <div>Thank you for choosing New Columbu Stores!</div>
    <div style="font-size: 8px; margin-top: 2px;">Deliver Fresh, Deliver Fast</div>
  </div>
</body>
</html>`;

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        iframe.remove();
      }
    }, 2000);
  }, 250);
}

