const rabbit = require('./rabbit');
const store = require('./store');

const RABBIT_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

async function start() {
  
  await store.ensureFile();

  try {
    const channel = await rabbit.connect(process.env.RABBITMQ_URL || RABBIT_URL);
    console.log('Notification service connected to RabbitMQ');

    const queue = 'order.created';
    await channel.assertQueue(queue, { durable: true });

    await channel.prefetch(1);

    await channel.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const payload = JSON.parse(msg.content.toString());
        if (!payload || payload.type !== 'order.created') {
          console.warn('Unexpected message type, nack and requeue');
          channel.nack(msg, false, false);
          return;
        }

        const orderId = payload.orderId;
        const items = Array.isArray(payload.itemId) ? payload.itemId : [];

        for (const itemId of items) {
          const already = await store.isProcessed(orderId, itemId);
          if (!already) {
            const line = `notification.sent orderId=${orderId} itemId=${itemId}`;
            console.log(line);
            await store.appendLogLine(line);
            await store.markProcessed(orderId, itemId);
          } else {
            console.log(`skipped duplicate notification orderId=${orderId} itemId=${itemId}`);
          }
        }

        channel.ack(msg);
      } catch (err) {
        console.error('Error processing message, leaving it unacked for retry:', err && err.stack ? err.stack : err);
        channel.nack(msg, false, true);
      }
    }, { noAck: false });

    console.log('Notification consumer started, waiting for messages...');
  } catch (err) {
    console.error('Notification service failed to start:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start };
