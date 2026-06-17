const app = require('../src/app');
const { initSchema } = require('../src/db');

// Lazy-init schema on first cold start; cached for the lifetime of the instance.
let ready = false;

module.exports = async (req, res) => {
  if (!ready) {
    await initSchema();
    ready = true;
  }
  return app(req, res);
};
