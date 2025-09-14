const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'processed_notifications.json');
const LOGFILE = path.join(DATA_DIR, 'notifications.log');

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(FILE);
  } catch (err) {
    await fs.writeFile(FILE, JSON.stringify({ orders: {} }), 'utf8');
  }

  try {
    const logRaw = await fs.readFile(LOGFILE, 'utf8');
    if (!logRaw) {
      await fs.writeFile(LOGFILE, '', 'utf8');
    }
  } catch (err) {
    await fs.writeFile(LOGFILE, '', 'utf8');
  }
}

async function read() {
  await ensureFile();
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : { orders: {} };
  } catch (err) {
    console.warn('Warning: processed_notifications.json invalid, resetting to empty');
    return { orders: {} };
  }
}

async function write(obj) {
  await ensureFile();
  const tmp = FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj), 'utf8');
  await fs.rename(tmp, FILE);
}

async function isProcessed(orderId, itemId) {
  const obj = await read();
  const list = obj.orders[orderId] || [];
  return list.includes(itemId);
}

async function markProcessed(orderId, itemId) {
  const obj = await read();
  obj.orders[orderId] = obj.orders[orderId] || [];
  if (!obj.orders[orderId].includes(itemId)) {
    obj.orders[orderId].push(itemId);
    await write(obj);
  }
}

async function appendLogLine(line) {
  await ensureFile();
  await fs.appendFile(LOGFILE, line + '\n', 'utf8');
}

module.exports = { ensureFile, isProcessed, markProcessed, appendLogLine, LOGFILE };
