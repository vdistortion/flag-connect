import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const compose = await readFile(new URL('./compose.yaml', import.meta.url), 'utf8');
const dockerfile = await readFile(new URL('./Dockerfile', import.meta.url), 'utf8');
const workflow = await readFile(
  new URL('../.github/workflows/deploy.yaml', import.meta.url),
  'utf8',
);
const nginx = await readFile(new URL('./nginx.conf', import.meta.url), 'utf8');

test('one builder generates identical immutable flags and banner for bot and nginx', () => {
  assert.equal((dockerfile.match(/npm run assets:build/g) ?? []).length, 1);
  assert.match(dockerfile, /COPY --from=builder \/app\/dist\/bot-assets \/flags/);
  assert.match(
    dockerfile,
    /COPY --from=builder \/app\/dist\/bot-assets \/usr\/share\/nginx\/html\/images\/flags/,
  );
  assert.doesNotMatch(compose, /flag-connect-flags|flags-sync|\.env.garage|asset-sync/);
  assert.match(compose, /FLAG_ASSETS_DIR: \/flags/);
  assert.match(nginx, /png/);
});

test('composites retain their separate writable bot volume and read-only nginx volume', () => {
  assert.match(compose, /flag-connect-generated:\/generated/);
  assert.match(compose, /flag-connect-generated:\/usr\/share\/nginx\/html\/images\/generated:ro/);
  assert.match(compose, /GENERATED_FLAGS_DIR: \/generated/);
  assert.match(compose, /name: flag-connect-generated/);
});

test('workflow uses Node 24 actions and an explicit Ubuntu image without migration overrides', () => {
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /actions\/upload-artifact@v6/);
  const runners = [...workflow.matchAll(/runs-on:\s*(\S+)/g)].map((match) => match[1]);
  assert.deepEqual(runners, ['ubuntu-24.04', 'ubuntu-24.04']);
  assert.doesNotMatch(workflow, /FORCE_JAVASCRIPT_ACTIONS|ALLOW_USE_UNSECURE_NODE/);
});

test('manual deployment verifies full conversion and no longer requires or syncs Garage', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  (push|pull_request):/m);
  assert.match(workflow, /npm run assets:build/);
  assert.match(workflow, /npm run assets:check/);
  assert.match(workflow, /npm run test:deploy/);
  assert.match(workflow, /npm run bot:build/);
  assert.doesNotMatch(workflow, /flags-sync|asset-sync|\.env.garage|network inspect garage/);
  assert.doesNotMatch(workflow, /volume (rm|prune)|bucket (delete|remove)/);
});
