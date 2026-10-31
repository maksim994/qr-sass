import test from 'node:test';
import assert from 'node:assert/strict';
import { COOKIE_CONSENT_VERSION } from './cookie-consent-version.ts';
import { LEGAL_VERSION } from './legal-documents.ts';
import { parseCookieChoice } from './cookie-consent.ts';
import { partnerVisitSchema } from './partner-rules.ts';
import { parseMetrikaAttribution } from './metrika-attribution.ts';

test('saved cookie opt-in remains valid when only the offer version changes', () => {
  const now = Date.parse('2026-10-26T09:00:00Z');
  assert.equal(COOKIE_CONSENT_VERSION, '2026-10-21.3');
  assert.notEqual(COOKIE_CONSENT_VERSION, LEGAL_VERSION);
  assert.equal(parseCookieChoice(JSON.stringify({ schema: 2, choice: 'accepted', advertising: true, version: '2026-10-21.3', at: now - 86400000 }), now), 'accepted');
  assert.equal(parseCookieChoice(JSON.stringify({ choice: 'declined', version: '2026-10-21.3' }), now), 'declined');
  assert.equal(partnerVisitSchema.safeParse({ code: 'partner', consent: true, consentVersion: '2026-10-21.3' }).success, true);
  assert.deepEqual(parseMetrikaAttribution({ clientId: '123', counterId: '456', consentVersion: '2026-10-21.3' }, '456'), { clientId: '123', counterId: '456', policyVersion: 'opt-in:2026-10-21.3', collectionMode: 'opt-in' });
});
