import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/routes/__tests__/setup-env.ts"],
    include: ["src/**/*.test.ts"],
  },
});
