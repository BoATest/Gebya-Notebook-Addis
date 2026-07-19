import express from "express";
// @ts-expect-error - dist/index.mjs is built separately
import app from "../dist/index.mjs";
export default app;
