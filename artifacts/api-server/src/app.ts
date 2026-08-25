// Vercel auto-detects this file as the project's serverless entrypoint
// (the "root entrypoint"). The build (`tsx ./build.ts`) produces a fully
// self-contained `dist/index.mjs` — all runtime dependencies are inlined so the
// deployed function does not rely on `node_modules` being installed at runtime.
// We re-export that bundle here as the default Express app.
// @ts-ignore - dist/index.mjs is the built bundle (no .d.ts)
import app from "../dist/index.mjs";
export default app;
