import "express";
// @ts-expect-error - dist/index.cjs is built separately, all deps inlined
import app from "../dist/index.cjs";
export default app;
