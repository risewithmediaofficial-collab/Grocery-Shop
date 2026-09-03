# New Columbu Stores — Grocery Management System

Complete, production-quality Grocery Shop Inventory, Stock, Purchase, Order & Billing Management System built for **New Columbu Stores, Krishnagiri, Tamil Nadu**.

---

## Features

- **POS Billing**: Fast keyboard-navigable POS with live barcode scanning, customer search/disambiguation, and repeat purchase draft creation.
- **Product Management**: Full CRUD, HSN codes, product-level GST rates (0%, 5%, 12%, 18%, 28%), tax inclusive/exclusive modes, and stock alert levels.
- **Inventory & Stock Ledger**: Real-time stock movement ledger, immutable history, stock adjustments with mandatory audit reason.
- **Batches & FEFO**: Batch tracking, manufacturing dates, expiry dates, and remaining quantities.
- **Expiry Dashboard**: Color-coded expiration categorization (Expired, <7 days, <30 days, <60 days).
- **Purchases & Suppliers**: Purchase inward receipts, supplier ledger statements, and payments.
- **Customers & Credit (Udhaar)**: Same-name disambiguation by Mobile/Customer ID, credit sales balance tracking, and customer payment receipts.
- **GST Invoices**: Professional A4 Tax Invoices & Thermal receipt print formats with complete CGST/SGST/IGST breakdown.
- **Sales Returns**: Original invoice lookup, item selection, auto-stock replenishing, and refund tracking.
- **Expenses & Net Profit**: Track operational expenses (Rent, EB, Salary, Transport) to compute Gross and Net Business Profit.
- **Analytics & Reports**: Real-time financial P&L statements, product sales rankings, and total inventory valuation.
- **User Roles & Security**: Unified RBAC (Admin / Store Owner & Cashier with full integrated stock & inventory management) + immutable audit logs for price & stock changes.
- **Customer Ordering System**: Built-in grocery catalog ordering with real-time cashier notifications and "Transfer to Billing POS" capabilities.

---

## Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, React Router v7, Axios, Recharts, Lucide Icons, React Hot Toast
- **Backend**: Node.js, Express.js, MongoDB, Mongoose, JWT Authentication, Helmet, Morgan, Express-Rate-Limit

---

## Getting Started

### 1. Backend Setup

```bash
cd server
npm install
npm run seed     # Seeds sample grocery catalog, users, suppliers, and sales
npm start        # Starts backend server on http://localhost:5000
```

### 2. Frontend Setup

```bash
# In the root directory:
npm install
npm run dev      # Starts frontend on http://localhost:5173
```

---

## Default Credentials

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@columbu.com` | `admin123` | Full access to all modules, financial P&L reports, user & role management, audit logs, store settings, stock & inventory. |
| **Cashier** | `cashier@columbu.com` | `cashier123` | POS Billing, receipts, customer accounts & udhar, purchase inward, product catalog, stock adjustments, batch & expiry monitoring. |

---

## Ordering System Logic & Workflow

The application includes an **Ordering System** ready to be used:
1. Customers browse available grocery items from live stock and add them to their grocery cart.
2. Placing an order immediately dispatches a high-priority notification to store staff.
3. The store manager or cashier can click **"Send to Billing POS"** on any order, automatically pre-filling the POS billing cart with the exact items and applying the current product price and GST snapshots.
