import test from 'node:test';
import assert from 'node:assert/strict';
import { expectedDigest } from './email-health-policy.mjs';
test('monitor waits for 09:10 MSK and excludes pre-release history', () => {
  const enabled = new Date('2026-10-21T15:00:20Z');
  assert.equal(expectedDigest(new Date('2026-10-22T06:09:59Z'), enabled), null);
  assert.equal(expectedDigest(new Date('2026-10-22T06:10:00Z'), enabled), 'digest:2026-10-22');
  assert.equal(expectedDigest(new Date('2026-10-21T20:59:59Z'), enabled), null);
  assert.equal(expectedDigest(new Date('2026-10-22T07:00:00Z'), new Date('2026-10-22T03:00:00Z')), null);
});
