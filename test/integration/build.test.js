// test/integration/build.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';

const env = process.env.TEST_ENV ?? 'local';
console.log(`Running integration tests in TEST_ENV = ${env}`);

test('build output dist/index.js exists', () => {
  assert.ok(existsSync('dist/index.js'), 'dist/index.js not found');
});

test('TEST_ENV is a valid environment', () => {
  assert.ok(['local', 'staging', 'prod'].includes(env), `invalid TEST_ENV: ${env}`);
});