import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@workspace/db': path.resolve(__dirname, '../lib/db/src'),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.mjs'],
    environment: 'node',
  },
});
