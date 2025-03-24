// Crea un nuevo archivo server/cache.js
const NodeCache = require('node-cache');

// Cache con tiempo de vida de 1 hora
const cache = new NodeCache({ stdTTL: 3600 });

function get(key) {
  return cache.get(key);
}

function set(key, value) {
  cache.set(key, value);
}

function has(key) {
  return cache.has(key);
}

module.exports = {
  get,
  set,
  has
};