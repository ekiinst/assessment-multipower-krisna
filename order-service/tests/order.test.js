const express = require('express');
const bodyParser = require('body-parser');
const store = require('../src/store');
const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

const rabbit = { publish: jest.fn() };

const app = express();
app.use(bodyParser.json());

app.post('/orders', async (req, res) => {
  try {
    const { orderId: providedOrderId, itemId } = req.body || {};

    if (!Array.isArray(itemId) || itemId.length === 0) {
      return res.status(400).json({ error: 'itemId must be non-empty array' });
    }

    const orderId = providedOrderId || uuidv4();

    const already = await store.isProcessed(orderId);
    if (already) return res.status(409).json({ error: 'duplicate orderId' });

    await store.markProcessed(orderId);
    await rabbit.publish('order.created', { orderId, itemId });

    return res.status(202).json({ orderId });
  } catch (err) {
    res.status(503).json({ error: 'RabbitMQ not ready, try again later' });
  }
});

beforeEach(async () => {
  const fs = require('fs').promises;
  const { FILE } = require('../src/store');
  await store.ensureFile();
  await fs.writeFile(FILE, JSON.stringify({ orders: [] }), 'utf8');
});

describe('Order Service Unit Tests', () => {
  test('rejects empty itemId', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ itemId: [] });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/itemId/);
  });

  test('duplicate orderId returns 409', async () => {
    const id = 'my-fixed-id';
    await store.markProcessed(id);

    const res = await request(app)
      .post('/orders')
      .send({ orderId: id, itemId: ['A'] });
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toMatch(/duplicate/);
  });
});
