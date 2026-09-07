import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const Order = require('../models/Order');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { Notification } = require('../models/System');
const auditService = require('../services/audit.service');
const whatsappService = require('../services/whatsapp.service');
const { SaleReturn } = require('../models/Returns');
const stockService = require('../services/stock.service');
const app = require('../app');

const secret = process.env.JWT_SECRET || 'kolambu_super_secret_jwt_key_2024_change_in_production';
const testToken = jwt.sign({ id: '60d5ec49f1b2c8b1f8e4e1a1' }, secret);

describe('Orders and Exchanges Routes (Backend API)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(User, 'findById').mockReturnValue({
      select: vi.fn().mockResolvedValue({
        _id: '60d5ec49f1b2c8b1f8e4e1a1',
        name: 'Karthik Admin',
        role: 'admin',
        isActive: true,
      }),
    });

    vi.spyOn(Customer, 'findOne').mockResolvedValue(null);
    vi.spyOn(Customer, 'create').mockResolvedValue({ _id: 'cust1', name: 'Senthil Nathan', save: vi.fn().mockResolvedValue(true) });
    vi.spyOn(Notification, 'create').mockResolvedValue({});
    vi.spyOn(auditService, 'log').mockResolvedValue({});
    vi.spyOn(whatsappService, 'sendOrderPlacedAutoMessage').mockResolvedValue({});
  });

  describe('Order Creation & Packing Checklist Endpoints', () => {
    it('POST /api/orders creates online/offline order with automatic total calculation', async () => {
      const createdOrder = {
        _id: '60d5ec49f1b2c8b1f8e4e1b1',
        orderNumber: 'ORD-9901',
        orderType: 'online',
        customerName: 'Senthil Nathan',
        items: [{ product: '60d5ec49f1b2c8b1f8e4e1c1', quantity: 2, unitPrice: 100, totalPrice: 200 }],
        deliveryCharge: 30,
        totalAmount: 230,
        status: 'pending',
      };

      vi.spyOn(Product, 'findById').mockResolvedValue({
        _id: '60d5ec49f1b2c8b1f8e4e1c1',
        name: 'Cooking Oil 1L',
        sellingPrice: 100,
        unit: { symbol: 'L' },
      });

      vi.spyOn(Order, 'create').mockResolvedValue(createdOrder);

      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Senthil Nathan',
          customerMobile: '9876543210',
          deliveryAddress: 'Main Road',
          deliveryCharge: 30,
          orderType: 'online',
          items: [{ product: '60d5ec49f1b2c8b1f8e4e1c1', quantity: 2, unitPrice: 100 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toBe('ORD-9901');
      expect(res.body.data.totalAmount).toBe(230);
    });

    it('PUT /api/orders/:id/pack-all marks all items in order as packed', async () => {
      const mockOrder = {
        _id: '60d5ec49f1b2c8b1f8e4e1b1',
        orderNumber: 'ORD-9901',
        items: [
          { isPacked: false },
          { isPacked: false },
        ],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .put('/api/orders/60d5ec49f1b2c8b1f8e4e1b1/pack-all')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.items.every(it => it.isPacked)).toBe(true);
      expect(mockOrder.isFullyPacked).toBe(true);
    });

    it('PUT /api/orders/:id/payment records Cash or UPI payment details with UTR', async () => {
      const mockOrder = {
        _id: '60d5ec49f1b2c8b1f8e4e1b1',
        orderNumber: 'ORD-9901',
        paymentStatus: 'pending',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .put('/api/orders/60d5ec49f1b2c8b1f8e4e1b1/payment')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          paymentStatus: 'paid',
          paymentMethod: 'upi',
          paidAmount: 230,
          upiAmount: 230,
          upiTransactionId: 'UTR-11223344',
          collectedBy: 'Delivery Partner Murugan',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.paymentStatus).toBe('paid');
      expect(mockOrder.upiTransactionId).toBe('UTR-11223344');
      expect(mockOrder.collectedBy).toBe('Delivery Partner Murugan');
    });

    it('GET /api/orders/counts returns order statistics with offline orders count', async () => {
      vi.spyOn(Order, 'countDocuments')
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(12) // online
        .mockResolvedValueOnce(3)  // offline
        .mockResolvedValueOnce(10) // active
        .mockResolvedValueOnce(5); // completed

      const res = await request(app)
        .get('/api/orders/counts')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.offline).toBe(3);
      expect(res.body.data.online).toBe(12);
      expect(res.body.data.total).toBe(15);
    });

    it('PUT /api/orders/:id/accept accepts pending order and transitions to confirmed with staff credentials', async () => {
      const mockOrder = {
        _id: '60d5ec49f1b2c8b1f8e4e1b1',
        orderNumber: 'ORD-9901',
        status: 'pending',
        statusLogs: [],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder);

      const res = await request(app)
        .put('/api/orders/60d5ec49f1b2c8b1f8e4e1b1/accept')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockOrder.status).toBe('confirmed');
      expect(mockOrder.acceptedByName).toBe('Karthik Admin');
      expect(mockOrder.acceptedByRole).toBe('admin');
      expect(mockOrder.acceptedAt).toBeDefined();
      expect(mockOrder.save).toHaveBeenCalled();
    });
  });

  describe('Product Returns & Exchanges Endpoints', () => {
    it('POST /api/invoices/return processes product exchange with net difference', async () => {
      const mockSale = {
        _id: '60d5ec49f1b2c8b1f8e4e1d1',
        invoiceNumber: 'INV-1000',
        items: [
          {
            product: '60d5ec49f1b2c8b1f8e4e1c1',
            productName: 'Damaged Biscuit Pack',
            sellingPrice: 50,
            gstRate: 5,
            quantity: 2,
          },
        ],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Sale, 'findById').mockResolvedValue(mockSale);

      vi.spyOn(Product, 'findById').mockResolvedValue({
        _id: '60d5ec49f1b2c8b1f8e4e1c2',
        name: 'Replacement Biscuit Family Pack',
        sellingPrice: 70,
        currentStock: 20,
        gstRate: 5,
      });

      vi.spyOn(SaleReturn, 'create').mockResolvedValue({
        _id: '60d5ec49f1b2c8b1f8e4e1e1',
        returnNumber: 'RET-0001',
        returnType: 'exchange',
        totalAmount: 100, // 2 * 50
        differenceAmount: 40, // (2 * 70) - 100 = 40
        differenceAction: 'collected',
      });

      vi.spyOn(stockService, 'processSaleReturn').mockResolvedValue(true);
      vi.spyOn(stockService, 'changeStock').mockResolvedValue(true);

      const res = await request(app)
        .post('/api/invoices/return')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          saleId: '60d5ec49f1b2c8b1f8e4e1d1',
          returnType: 'exchange',
          items: [{ product: '60d5ec49f1b2c8b1f8e4e1c1', quantity: 2, reason: 'damaged' }],
          exchangeItems: [{ product: '60d5ec49f1b2c8b1f8e4e1c2', quantity: 2, sellingPrice: 70 }],
          notes: 'Customer replaced damaged 50rs pack with 70rs family pack',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.returnType).toBe('exchange');
      expect(stockService.processSaleReturn).toHaveBeenCalled();
      expect(stockService.changeStock).toHaveBeenCalledWith(
        '60d5ec49f1b2c8b1f8e4e1c2',
        -2,
        'sale',
        expect.any(Object)
      );
    });
  });
});
