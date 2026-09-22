import { spawnSync } from 'node:child_process';

if (process.platform === 'openbsd') {
  console.error(
    'Playwright E2E tests are not supported on OpenBSD. Run npm run test:e2e in the Ubuntu CI job.',
  );
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(args) {
  const result = spawnSync(npx, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

const install = spawnSync(npx, ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
if (install.error) {
  console.error(install.error.message);
  process.exit(1);
}
if (install.status !== 0) process.exit(install.status ?? 1);

run(['playwright', 'test', ...process.argv.slice(2)]);
