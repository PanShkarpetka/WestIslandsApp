import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateHero, getLeaderGuildAccess, isLeaderNickname, isPasswordHeroName, verifyAdminPassword } from '../../src/services/authService.js';

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

// ─── isPasswordHeroName ───────────────────────────────────────────────────────

test('isPasswordHeroName returns false for empty name', async () => {
  const result = await isPasswordHeroName('', makeHeroDeps([]));
  assert.equal(result, false);
});

test('isPasswordHeroName returns false for admin', async () => {
  const result = await isPasswordHeroName('admin', makeHeroDeps([]));
  assert.equal(result, false);
});

test('isPasswordHeroName returns true when hero exists without password', async () => {
  const result = await isPasswordHeroName('Boromir', makeHeroDeps([
    { id: 'hero-1', data: { name: 'Boromir' } },
  ]));
  assert.equal(result, true);
});

test('isPasswordHeroName returns true when hero has a password set', async () => {
  const result = await isPasswordHeroName('Boromir', makeHeroDeps([
    { id: 'hero-1', data: { name: 'Boromir', password: 'secret' } },
  ]));
  assert.equal(result, true);
});

// ─── authenticateHero ─────────────────────────────────────────────────────────

function makeHeroDeps(docs) {
  return {
    dbRef: {},
    collectionFn: () => ({}),
    queryFn: () => ({}),
    whereFn: () => ({}),
    getDocsFn: async () => ({
      empty: docs.length === 0,
      docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
    }),
  };
}

test('authenticateHero throws when name is empty', async () => {
  await assert.rejects(
    () => authenticateHero('', 'pass', makeHeroDeps([])),
    { message: "Введіть ім'я та пароль" },
  );
});

test('authenticateHero throws when password is empty', async () => {
  await assert.rejects(
    () => authenticateHero('Boromir', '', makeHeroDeps([])),
    { message: "Введіть ім'я та пароль" },
  );
});

test('authenticateHero throws when hero not found', async () => {
  await assert.rejects(
    () => authenticateHero('Boromir', 'pass', makeHeroDeps([])),
    { message: 'Героя не знайдено' },
  );
});

test('authenticateHero throws when password does not match', async () => {
  await assert.rejects(
    () => authenticateHero('Boromir', 'wrong', makeHeroDeps([
      { id: 'hero-1', data: { name: 'Boromir', password: 'correct' } },
    ])),
    { message: 'Невірний пароль' },
  );
});

test('authenticateHero uses default password when hero has no password field', async () => {
  const result = await authenticateHero('Boromir', 'password', makeHeroDeps([
    { id: 'hero-1', data: { name: 'Boromir' } },
  ]));

  assert.deepEqual(result, { heroId: 'hero-1', name: 'Boromir' });
});

test('authenticateHero returns heroId and name on success', async () => {
  const result = await authenticateHero('Boromir', 'secret', makeHeroDeps([
    { id: 'hero-1', data: { name: 'Boromir', password: 'secret' } },
  ]));

  assert.deepEqual(result, { heroId: 'hero-1', name: 'Boromir' });
});
