import { spawnSync } from 'node:child_process';

const [port = '4185', ...args] = process.argv.slice(2);

const result = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', ...args],
  {
    env: {
      ...process.env,
      GEBYA_PLAYWRIGHT_ISOLATED: '1',
      GEBYA_PLAYWRIGHT_PORT: port,
      PORT: port,
    },
    shell: true,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
