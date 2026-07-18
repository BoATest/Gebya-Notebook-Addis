// .cjs prevents Vercel's Node.js builder from recompiling sources.
// The Express app is pre-bundled into dist/index.cjs.
const path = require('path');
const fs = require('fs');

const bundlePath = path.resolve(__dirname, '..', 'dist', 'index.cjs');

if (!fs.existsSync(bundlePath)) {
  module.exports = (req, res) => {
    res.status(500).json({ error: 'Bundle not found', path: bundlePath });
  };
  return;
}

let app;
try {
  const mod = require(bundlePath);
  app = mod && mod.__esModule && mod.default ? mod.default : mod;
} catch (err) {
  console.error('[entrypoint] failed to load bundle:', err);
  module.exports = (req, res) => {
    res.status(500).json({ error: 'Bundle load failed', message: err.message });
  };
  return;
}

module.exports = app;
