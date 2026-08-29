import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.GEBYA_PLAYWRIGHT_PORT || process.env.PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  // Only run Playwright e2e specs (which use the .spec.ts extension). Unit
  // tests run under vitest (.test.mjs / .test.ts) and must be excluded — the
  // default Playwright testMatch also matches .test.mjs and would try to
  // execute vitest files as specs. These three are vitest specs mis-named as
  // .spec.ts and are ignored explicitly.
  testMatch: '**/*.spec.ts',
  testIgnore: [
    '**/duration-format.spec.ts',
    '**/parseItemDraft.spec.ts',
    '**/permissions-store.spec.ts',
  ],
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm serve -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.GEBYA_PLAYWRIGHT_ISOLATED,
    timeout: 120000,
    cwd: configDir,
  },
});
