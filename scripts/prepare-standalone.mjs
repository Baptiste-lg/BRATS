import { cpSync, existsSync, mkdirSync } from 'node:fs';

const staticSource = '.next/static';
const staticDestination = '.next/standalone/.next/static';

if (!existsSync(staticSource)) {
  throw new Error(`Next.js static assets not found at ${staticSource}`);
}

mkdirSync('.next/standalone/.next', { recursive: true });
cpSync(staticSource, staticDestination, { recursive: true });
