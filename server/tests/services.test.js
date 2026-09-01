import { describe, it, expect, vi, beforeEach } from 'vitest';

const Product = require('../models/Product');
const { StockMovement } = require('../models/Inventory');
const { Notification, AuditLog, Setting } = require('../models/System');
const WhatsAppLog = require('../models/WhatsAppLog');

const stockService = require('../services/stock.service');
const whatsappService = require('../services/whatsapp.service');
const auditService = require('../services/audit.service');

describe('Backend Services Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Stock Service', () => {
    it('successfully adds stock to a product and creates a stock movement record', async () => {
      const mockProduct = {
        _id: '60d5ec49f1b2c8b1f8e4e1a1',
        productId: 'PRD-0001',
        name: 'Ponni Rice 25kg',
        currentStock: 10,
        reorderLevel: 5,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Product, 'findById').mockResolvedValue(mockProduct);
      vi.spyOn(StockMovement, 'create').mockResolvedValue({});
      vi.spyOn(Notification, 'create').mockResolvedValue({});

      const result = await stockService.changeStock(mockProduct._id, 5, 'purchase', { reference: 'PUR-001' });

      expect(mockProduct.currentStock).toBe(15);
      expect(mockProduct.save).toHaveBeenCalled();
      expect(StockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'PRD-0001',
          type: 'purchase',
          quantity: 5,
          balanceBefore: 10,
          balanceAfter: 15,
        })
      );
      expect(result.balanceAfter).toBe(15);
    });

    it('throws error when reducing stock exceeds available quantity', async () => {
      const mockProduct = {
        _id: '60d5ec49f1b2c8b1f8e4e1a1',
        name: 'Ponni Rice 25kg',
        currentStock: 2,
        save: vi.fn(),
      };
      vi.spyOn(Product, 'findById').mockResolvedValue(mockProduct);

      await expect(
        stockService.changeStock(mockProduct._id, -5, 'sale', { reference: 'INV-001' })
      ).rejects.toThrow(/Insufficient stock/);
    });

    it('triggers low stock notification when stock falls below reorder level', async () => {
      const mockProduct = {
        _id: '60d5ec49f1b2c8b1f8e4e1a1',
        productId: 'PRD-0001',
        name: 'Ponni Rice 25kg',
        currentStock: 10,
        reorderLevel: 5,
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Product, 'findById').mockResolvedValue(mockProduct);
      vi.spyOn(StockMovement, 'create').mockResolvedValue({});
      vi.spyOn(Notification, 'create').mockResolvedValue({});

      await stockService.changeStock(mockProduct._id, -6, 'sale', { reference: 'INV-002' });

      expect(mockProduct.currentStock).toBe(4);
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_stock',
          severity: 'warning',
        })
      );
    });
  });

  describe('WhatsApp Service', () => {
    it('dispatches automated order placed message with valid formatting', async () => {
      vi.spyOn(Setting, 'findOne').mockResolvedValue({
        value: { autoSendOnOrder: true, gatewayWebhookUrl: '' }
      });
      vi.spyOn(WhatsAppLog, 'create').mockResolvedValue({ _id: 'w1', status: 'delivered' });

      const sampleOrder = {
        _id: '60d5ec49f1b2c8b1f8e4e1b1',
        orderNumber: 'ORD-5001',
        customerName: 'Rajesh',
        customerMobile: '9876543210',
        items: [{ productName: 'Basmati Rice', quantity: 2, unit: 'kg' }],
        deliveryAddress: 'Main St',
      };
      const result = await whatsappService.sendOrderPlacedAutoMessage(sampleOrder);
      expect(result.success).toBe(true);
    });

    it('dispatches custom whatsapp message and logs transaction', async () => {
      vi.spyOn(Setting, 'findOne').mockResolvedValue({
        value: { gatewayWebhookUrl: '' }
      });
      vi.spyOn(WhatsAppLog, 'create').mockResolvedValue({ _id: 'w2', status: 'delivered' });

      const result = await whatsappService.sendWhatsAppMessage({
        to: '9876543210',
        customerName: 'Karthik',
        messageText: 'Your order is ready!',
        template: 'order_ready',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Audit Service', () => {
    it('creates compliance audit records with timestamps and context', async () => {
      vi.spyOn(AuditLog, 'create').mockResolvedValue({});

      await auditService.log({
        user: { _id: '60d5ec49f1b2c8b1f8e4e1c1', name: 'Admin', role: 'admin' },
        action: 'product_created',
        module: 'products',
        recordId: '60d5ec49f1b2c8b1f8e4e1a1',
        recordRef: 'PRD-0001',
        description: 'New product added: Ponni Rice',
        ipAddress: '127.0.0.1',
      });

      expect(AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'products',
          action: 'product_created',
          userName: 'Admin',
          description: 'New product added: Ponni Rice',
        })
      );
    });
  });
});
