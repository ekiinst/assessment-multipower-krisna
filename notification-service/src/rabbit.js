const amqp = require('amqplib');

let channel = null;

async function connect(url) {
  const conn = await amqp.connect(url);
  channel = await conn.createChannel();
  return channel;
}

module.exports = { connect };
