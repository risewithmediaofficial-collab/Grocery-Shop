import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const { Category } = require('../models/Category');
const Product = require('../models/Product');
const User = require('../models/User');
const app = require('../app');

const secret = process.env.JWT_SECRET || 'kolambu_super_secret_jwt_key_2024_change_in_production';
const testToken = jwt.sign({ id: '60d5ec49f1b2c8b1f8e4e1a1' }, secret);

describe('Express Backend API Endpoints (Supertest)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Health Check & Basic Middleware', () => {
    it('GET /api/health returns 200 with status ok and shop name', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('New Columbu Stores');
    });

    it('GET /api/nonexistent-route returns 404 Not Found response', async () => {
      const res = await request(app).get('/api/nonexistent-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Route not found');
    });
  });

  describe('Auth Route Validations', () => {
    it('POST /api/auth/login returns 400 when missing email or password', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email and password are required');
    });
  });

  describe('Categories & Catalog Endpoints', () => {
    it('GET /api/categories/categories returns categories list with auth token', async () => {
      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: '60d5ec49f1b2c8b1f8e4e1a1',
          name: 'Admin',
          role: 'admin',
          isActive: true,
        }),
      });
      vi.spyOn(Category, 'find').mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          { _id: '60d5ec49f1b2c8b1f8e4e1a1', name: 'Food Grains', slug: 'food-grains' },
        ]),
      });
      const res = await request(app)
        .get('/api/categories/categories')
        .set('Authorization', `Bearer ${testToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/orders/catalog returns active public product catalog', async () => {
      const queryMock = {};
      queryMock.populate = vi.fn().mockReturnValue(queryMock);
      queryMock.sort = vi.fn().mockResolvedValue([
        { _id: '60d5ec49f1b2c8b1f8e4e1a1', name: 'Ponni Rice 25kg', sellingPrice: 1450, currentStock: 20 },
      ]);
      vi.spyOn(Product, 'find').mockReturnValue(queryMock);
      const res = await request(app).get('/api/orders/catalog');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
