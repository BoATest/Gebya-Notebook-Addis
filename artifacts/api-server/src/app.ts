// Re-exports the built bundle so non-Vercel entry points (e.g. tests, local
// scripts) can import the Express app directly.  The actual Vercel entry point
// is `api/[...route].ts`, which also imports from `../dist/index.mjs`.
// @ts-ignore - dist/index.mjs is the built bundle (no .d.ts)
import app from "../dist/index.mjs";
export default app;
