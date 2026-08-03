/**
 * Ensure ECS task definitions keep DocumentDB-compatible DB_URI settings.
 * DocumentDB requires authMechanism=SCRAM-SHA-1 in the connection string.
 *
 * Usage: node scripts/patch-ecs-task-definition.mjs <task-definition.json>
 */
import { readFileSync, writeFileSync } from 'fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/patch-ecs-task-definition.mjs <task-definition.json>');
  process.exit(1);
}

const taskDef = JSON.parse(readFileSync(file, 'utf8'));
let patched = false;

for (const container of taskDef.containerDefinitions ?? []) {
  for (const env of container.environment ?? []) {
    if (env.name !== 'DB_URI' || !env.value) continue;

    if (!env.value.includes('authMechanism=')) {
      const separator = env.value.includes('?') ? '&' : '?';
      env.value = `${env.value}${separator}authMechanism=SCRAM-SHA-1`;
      patched = true;
    }
  }
}

writeFileSync(file, JSON.stringify(taskDef, null, 2) + '\n', 'utf8');
console.log(
  patched
    ? 'Patched DB_URI with authMechanism=SCRAM-SHA-1'
    : 'DB_URI already includes authMechanism',
);
