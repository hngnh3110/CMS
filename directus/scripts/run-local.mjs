import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
process.loadEnvFile(resolve(root, '.env'));
if (!process.env.DIRECTUS_CLI)
  throw Error(
    'Set DIRECTUS_CLI to the installed Directus 11.17.4 cli.js; use Node 22.',
  );
mkdirSync(resolve(root, '.runtime/uploads'), { recursive: true });
const env = {
  ...process.env,
  DB_CLIENT: 'sqlite3',
  DB_FILENAME: resolve(root, '.runtime/data.db'),
  STORAGE_LOCAL_ROOT: resolve(root, '.runtime/uploads'),
  EXTENSIONS_PATH: resolve(root, 'directus/extensions'),
  HOST: '127.0.0.1',
  PORT: '8055',
  PUBLIC_URL: 'http://localhost:8055',
  TELEMETRY: 'false',
  PAYLOAD_LIMIT: '8mb',
  EXTENSIONS_MUST_LOAD: 'true',
};
const child = spawn(
  process.execPath,
  [process.env.DIRECTUS_CLI, process.argv[2] || 'start'],
  { cwd: root, env, stdio: 'inherit' },
);
child.on('exit', (code) => process.exit(code ?? 1));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
