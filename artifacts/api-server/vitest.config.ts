import { defineConfig } from "vitest/config";
import { resolve } from "path";

const baseUrl = resolve(__dirname, "../../lib");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@workspace\/db\/schema\/(.+)$/, replacement: resolve(baseUrl, "db/src/schema/$1") },
      { find: /^@workspace\/db\/schema$/, replacement: resolve(baseUrl, "db/src/schema/index.ts") },
      { find: /^@workspace\/db$/, replacement: resolve(baseUrl, "db/src/index.ts") },
      { find: /^@workspace\/db\/utils\/(.+)$/, replacement: resolve(baseUrl, "db/src/utils/$1") },
      { find: /^@workspace\/api-zod\/(.+)$/, replacement: resolve(baseUrl, "api-zod/src/$1") },
      { find: /^@workspace\/api-zod$/, replacement: resolve(baseUrl, "api-zod/src/index.ts") },
    ],
  },
  test: {
    setupFiles: ["./src/routes/__tests__/setup-env.ts"],
    include: ["src/**/*.test.ts"],
    // business-legacy.ts throws at module load if JOIN_CODE_SIGNING_KEY is unset (fail-fast
    // guard added with the POST /api/shops account-takeover fix). Test placeholder only.
    env: {
      JOIN_CODE_SIGNING_KEY: "test-join-code-signing-key",
    },
  },
});
