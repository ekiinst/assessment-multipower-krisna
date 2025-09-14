const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'processed_orders.json');

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE);
  } catch (err) {
    await fs.writeFile(FILE, JSON.stringify({ orders: [] }), 'utf8');
  }
}

async function read() {
  await ensureFile();
  const raw = await fs.readFile(FILE, 'utf8');
  return JSON.parse(raw);
}

async function write(obj) {
  await ensureFile();
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj), 'utf8');
  await fs.rename(tmp, FILE);
}

async function isProcessed(orderId) {
  const obj = await read();
  return obj.orders.includes(orderId);
}

async function markProcessed(orderId) {
  const obj = await read();
  if (!obj.orders.includes(orderId)) {
    obj.orders.push(orderId);
    await write(obj);
  }
}

module.exports = { ensureFile, isProcessed, markProcessed, FILE };
