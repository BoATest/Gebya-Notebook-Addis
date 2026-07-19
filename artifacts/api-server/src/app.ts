import "express";
// @ts-expect-error - dist/index.js is built separately, all deps inlined
import app from "../dist/index.js";
export default app;
