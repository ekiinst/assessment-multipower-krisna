const express = require('express');
const bodyParser = require('body-parser');
const rabbit = require('./rabbit');
const store = require('./store');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 8080;
const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

function validate(payload) {
  if (!payload.itemId || !Array.isArray(payload.itemId) || payload.itemId.length === 0) {
    return { valid: false, error: 'itemId must be a non-empty array' };
  }
  return { valid: true };
}

async function start() {
  const app = express();
  app.use(bodyParser.json());

  app.post('/orders', async (req, res) => {
    try {
      const { orderId: providedOrderId, itemId } = req.body || {};

      const v = validate({ itemId });
      if (!v.valid) return res.status(400).json({ error: v.error });

      const orderId = providedOrderId || uuidv4();

      const already = await store.isProcessed(orderId);
      if (already) return res.status(409).json({ error: 'duplicate orderId' });

      const event = {
        type: 'order.created',
        version: 1,
        orderId,
        itemId,
        createdAt: new Date().toISOString()
      };

      await store.markProcessed(orderId);
      await rabbit.publish('order.created', event);

      return res.status(202).json({ orderId });
    } catch (err) {
      console.error('POST /orders error:', err && err.stack ? err.stack : err);
      return res.status(503).json({ error: 'RabbitMQ not ready, try again later' });
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`Order service listening on ${PORT}`);
  });

  rabbit.connect(process.env.RABBITMQ_URL || RABBIT_URL)
    .then(() => console.log('Order service connected to RabbitMQ'))
    .catch((e) => console.error('Order service: could not connect to RabbitMQ at startup', e.message));

  return { app, server };
}

if (require.main === module) {
  start();
}

module.exports = { validate, start };
