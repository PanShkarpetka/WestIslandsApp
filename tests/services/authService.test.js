import test from 'node:test';
import assert from 'node:assert/strict';
import { getLeaderGuildAccess, isLeaderNickname, verifyAdminPassword } from '../../src/services/authService.js';

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

test('isLeaderNickname returns false when user is not a leader', async () => {
  const result = await isLeaderNickname('Player', {
    dbRef: {},
    collectionFn: () => ({}),
    queryFn: () => ({}),
    whereFn: () => ({}),
    getDocsFn: async () => ({ empty: true, docs: [] }),
  });

  assert.equal(result, false);
});

test('isLeaderNickname returns true when user leads at least one guild', async () => {
  const result = await isLeaderNickname('Captain', {
    dbRef: {},
    collectionFn: () => ({}),
    queryFn: () => ({}),
    whereFn: () => ({}),
    getDocsFn: async () => ({ empty: false, docs: [{ id: 'guild-a', data: () => ({}) }] }),
  });

  assert.equal(result, true);
});

test('getLeaderGuildAccess does not require password when user is not a leader', async () => {
  const result = await getLeaderGuildAccess('Player', '', {
    dbRef: {},
    collectionFn: () => ({}),
    queryFn: () => ({}),
    whereFn: () => ({}),
    getDocsFn: async () => ({ empty: true, docs: [] }),
  });

  assert.deepEqual(result, { requiresPassword: false, accessibleGuildIds: [] });
});

test('getLeaderGuildAccess requires password for leaders', async () => {
  const result = await getLeaderGuildAccess('Captain', '', {
    dbRef: {},
    collectionFn: () => ({}),
    queryFn: () => ({}),
    whereFn: () => ({}),
    getDocsFn: async () => ({
      empty: false,
      docs: [{ id: 'guild-a', data: () => ({ withdrawPassword: 'abc' }) }],
    }),
  });

  assert.deepEqual(result, { requiresPassword: true, accessibleGuildIds: [] });
});

test('getLeaderGuildAccess returns guild ids matching leader password', async () => {
  const result = await getLeaderGuildAccess('Captain', 'abc', {
    dbRef: {},
    collectionFn: () => ({}),
    queryFn: () => ({}),
    whereFn: () => ({}),
    getDocsFn: async () => ({
      empty: false,
      docs: [
        { id: 'guild-a', data: () => ({ withdrawPassword: 'abc' }) },
        { id: 'guild-b', data: () => ({ leaderPassword: 'abc' }) },
        { id: 'guild-c', data: () => ({ withdrawPassword: 'other' }) },
      ],
    }),
  });

  assert.deepEqual(result, { requiresPassword: true, accessibleGuildIds: ['guild-a', 'guild-b'] });
});
