import app from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

if (!Number.isNaN(port)) {
  app.listen(port, "0.0.0.0", () => {
    console.info(`[api] listening on http://0.0.0.0:${port}`);
  });
}

export default app;
