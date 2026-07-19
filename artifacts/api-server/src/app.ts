import "express";
// @ts-expect-error - dist/index.mjs is built separately, all deps inlined
export { default } from "../dist/index.js";
