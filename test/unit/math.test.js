// test/unit/math.test.js
import { test } from 'node:test';
import assert from 'node:assert';

test('addition works', () => {
  assert.strictEqual(1 + 1, 2);
});

test('string concatenation works', () => {
  assert.strictEqual('activity' + '-' + 'log', 'activity-log');
});