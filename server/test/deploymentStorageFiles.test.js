import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
const sourceDir = path.join(root, 'server/src/storage');

for (const file of ['imagekit.js', 'imagekitPaths.js', 'r2.js']) {
  test(`deployment contains storage source module: ${file}`, () => {
    assert.ok(existsSync(path.join(sourceDir, file)), `Missing server/src/storage/${file}`);
  });
}

for (const file of ['.gitignore', '.dockerignore']) {
  test(`${file} does not exclude server/src/storage`, () => {
    const content = readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(content, /^\s*\*\*\/storage\/?\s*$/m);
    assert.match(content, /^\/server\/storage\/$/m);
  });
}

test('server/.gitignore ignores only runtime uploads, not src/storage source', () => {
  const content = readFileSync(path.join(root, 'server/.gitignore'), 'utf8');
  assert.match(content, /^\/storage\/$/m);
  assert.doesNotMatch(content, /^storage\/$/m);
});

test('Dockerfile checks for storage sources after copying backend', () => {
  const content = readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  assert.match(content, /RUN test -f \/app\/server\/src\/storage\/imagekit\.js/);
});
