/**
 * Build secrets.json from .env for AWS Secrets Manager upload.
 * Usage: node scripts/build-secrets-json.mjs
 * Output: infrastructure/terraform/modules/secrets/secrets.json (gitignored)
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const envPath = resolve(root, '.env');
const outPath = resolve(
  root,
  'infrastructure/terraform/modules/secrets/secrets.json',
);

const KEYS = [
  'JWT_SECRET',
  'JWT_EXPIRE_IN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'SUPER_ADMIN_EMAIL',
  'SUPER_ADMIN_PASSWORD',
  'OPENAI_API_KEY',
  'CORS_ORIGIN',
];

function parseEnv(content) {
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

const env = parseEnv(readFileSync(envPath, 'utf8'));
const secrets = {};
const missing = [];

for (const key of KEYS) {
  if (env[key]) {
    secrets[key] = env[key];
  } else {
    missing.push(key);
  }
}

writeFileSync(outPath, JSON.stringify(secrets, null, 2) + '\n', 'utf8');

console.log(`Wrote ${Object.keys(secrets).length} keys to:`);
console.log(outPath);
if (missing.length) {
  console.warn('Missing in .env:', missing.join(', '));
}
console.log('\nUpload with:');
console.log(
  '  export AWS_PAGER="" && aws secretsmanager put-secret-value --region eu-central-1 --secret-id sendit-dev-app-secret --secret-string "$(cat infrastructure/terraform/modules/secrets/secrets.json)"',
);
