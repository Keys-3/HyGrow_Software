import test from 'node:test';
import assert from 'node:assert/strict';
import { offlineFarmer, isOfflineFailure } from '../src/utils/offlineProfile.ts';

const farmer = { id: 'alice', email: 'alice@example.test', name: 'Alice', role: 'farmer' };
test('offline farmer requires the same Firebase identity and cannot restore admin access', () => {
  assert.deepEqual(offlineFarmer(farmer, farmer.id, farmer.email), farmer);
  assert.equal(offlineFarmer(farmer, 'bob', farmer.email), null);
  assert.equal(offlineFarmer(farmer, farmer.id, 'bob@example.test'), null);
  assert.equal(offlineFarmer({ ...farmer, role: 'admin' }, farmer.id, farmer.email), null);
  assert.equal(offlineFarmer(null, farmer.id, farmer.email), null);
});
test('authorization and revoked identity errors never use the offline fallback', () => {
  for (const code of ['permission-denied', 'auth/user-disabled', 'auth/user-token-expired', 'auth/invalid-user-token']) {
    assert.equal(isOfflineFailure({ code }), false);
  }
  assert.equal(isOfflineFailure({ code: 'unavailable' }), true);
  assert.equal(isOfflineFailure({ code: 'auth/network-request-failed' }), true);
  assert.equal(isOfflineFailure({ code: 'profile/offline-timeout' }), true);
});
