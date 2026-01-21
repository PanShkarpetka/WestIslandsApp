import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminPassword } from '../../src/services/authService.js';

test('verifyAdminPassword returns false when document missing', async () => {
  const result = await verifyAdminPassword('secret', {
    dbRef: {},
    docFn: () => ({ id: 'admin' }),
    getDocFn: async () => ({ exists: () => false }),
  });

  assert.equal(result, false);
});

test('verifyAdminPassword matches password from snapshot', async () => {
  const result = await verifyAdminPassword('secret', {
    dbRef: {},
    docFn: () => ({ id: 'admin' }),
    getDocFn: async () => ({
      exists: () => true,
      data: () => ({ password: 'secret' }),
    }),
  });

  assert.equal(result, true);
});

test('verifyAdminPassword fails with mismatched password', async () => {
  const result = await verifyAdminPassword('secret', {
    dbRef: {},
    docFn: () => ({ id: 'admin' }),
    getDocFn: async () => ({
      exists: () => true,
      data: () => ({ password: 'other' }),
    }),
  });

  assert.equal(result, false);
});
