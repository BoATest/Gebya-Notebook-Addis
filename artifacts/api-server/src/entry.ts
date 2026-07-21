import app from "./app.js";

const port = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`[api] listening on :${port}`);
  });
}

export default app;

// Force a fresh Vercel production build (entrypoint fix for Express preset).
