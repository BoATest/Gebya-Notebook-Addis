import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@workspace/db': path.resolve(__dirname, '../lib/db/src'),
    },
  },
  test: {
    // Vitest runs unit/integration specs ONLY. Playwright e2e specs import
    // @playwright/test and crash under vitest ("test.describe() called here")
    // — they run via pnpm test:e2e / run-playwright-isolated.mjs instead.
    include: [
      // standalone node scripts (run directly: node tests/<file>) excluded:
      '!tests/db-migration-v22.test.mjs',
      '!tests/recentRows.test.mjs',
      '!tests/shopStory.test.mjs',
      'tests/**/*.test.mjs',
      'tests/labels-transaction-form.spec.ts',
      'tests/permissions-store.spec.ts',
      'tests/duration-format.spec.ts',
      'tests/notification-groups.spec.ts',
      'tests/setup-readiness.spec.ts',
    ],
    environment: 'node',
  },
});
