import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.GEBYA_PLAYWRIGHT_PORT || process.env.PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
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
