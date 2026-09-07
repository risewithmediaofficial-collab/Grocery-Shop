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
