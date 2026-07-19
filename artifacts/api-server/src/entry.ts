import app from "./main.js";

// Use module.exports to avoid esbuild's __toCommonJS wrapper
// so dist/index.js exports the Express app directly.
module.exports = app;