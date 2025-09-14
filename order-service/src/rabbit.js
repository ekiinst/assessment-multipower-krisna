const amqp = require('amqplib');

let channel = null;

async function connect(url) {
  while (!channel) {
    try {
      const conn = await amqp.connect(url);
      channel = await conn.createChannel();
      console.log('RabbitMQ connected');
    } catch (err) {
      console.error('RabbitMQ connection failed, retrying in 5s...', err.message);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

function publish(queue, message) {
  if (!channel) throw new Error('AMQP channel not connected');
  return channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
}

module.exports = { connect, publish };
