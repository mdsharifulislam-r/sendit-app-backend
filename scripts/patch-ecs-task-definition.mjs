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
  const env = container.environment ?? [];
  container.environment = env;

  const family = taskDef.family || '';
  const serviceFromFamily = family.replace(/^sendit-[^-]+-/, '');

  const hasServiceName = env.some((item) => item.name === 'SERVICE_NAME');
  if (!hasServiceName && serviceFromFamily) {
    env.push({ name: 'SERVICE_NAME', value: serviceFromFamily });
    patched = true;
  }

  for (const item of env) {
    if (item.name !== 'DB_URI' || !item.value) continue;

    if (!item.value.includes('authMechanism=')) {
      const separator = item.value.includes('?') ? '&' : '?';
      item.value = `${item.value}${separator}authMechanism=SCRAM-SHA-1`;
      patched = true;
    }

    if (item.value.includes('readPreference=secondaryPreferred')) {
      item.value = item.value.replace(
        'readPreference=secondaryPreferred',
        'readPreference=primary',
      );
      patched = true;
    }
  }
}

writeFileSync(file, JSON.stringify(taskDef, null, 2) + '\n', 'utf8');
console.log(
  patched
    ? 'Patched DB_URI (DocumentDB: SCRAM-SHA-1 / readPreference=primary)'
    : 'DB_URI already DocumentDB-compatible',
);
