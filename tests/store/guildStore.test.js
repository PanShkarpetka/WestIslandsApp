import test from 'node:test';
import assert from 'node:assert/strict';
import { applyGuildTransaction } from '../../src/store/guildStore.js';
import { createMockFirestore } from '../helpers/mockFirestore.js';

function makeDeps(seed = {}) {
  const mock = createMockFirestore(seed);
  return {
    mock,
    deps: {
      db: mock.db,
      runTransactionFn: mock.firebase.runTransaction,
      docFn: mock.firebase.doc,
      collectionFn: mock.firebase.collection,
      serverTimestampFn: mock.firebase.serverTimestamp,
    },
  };
}

test('deposit increases guild treasure and writes log entry', async () => {
  const { mock, deps } = makeDeps({ 'guilds/guild-a': { treasure: 500 } });

  await applyGuildTransaction(
    { guildId: 'guild-a', amount: 200, comment: 'Raid loot', actor: { nickname: 'Captain' }, type: 'deposit' },
    deps,
  );

  assert.equal(mock.get('guilds/guild-a').treasure, 700);

  const logs = Object.values(mock.list('guilds/guild-a/logs'));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].amount, 200);
  assert.equal(logs[0].type, 'deposit');
  assert.equal(logs[0].treasureAfter, 700);
  assert.equal(logs[0].userNickname, 'Captain');
});

test('withdrawal decreases guild treasure and writes log entry', async () => {
  const { mock, deps } = makeDeps({ 'guilds/guild-b': { treasure: 1000 } });

  await applyGuildTransaction(
    { guildId: 'guild-b', amount: -300, comment: 'Equipment', actor: { nickname: 'Treasurer' }, type: 'withdraw' },
    deps,
  );

  assert.equal(mock.get('guilds/guild-b').treasure, 700);

  const logs = Object.values(mock.list('guilds/guild-b/logs'));
  assert.equal(logs[0].amount, -300);
  assert.equal(logs[0].treasureAfter, 700);
});

test('throws when withdrawal would make guild treasure negative', async () => {
  const { deps } = makeDeps({ 'guilds/guild-c': { treasure: 100 } });

  await assert.rejects(
    () => applyGuildTransaction(
      { guildId: 'guild-c', amount: -200, comment: '', actor: null, type: 'withdraw' },
      deps,
    ),
    /Not enough guild treasure/,
  );
});

test('throws when guild document does not exist', async () => {
  const { deps } = makeDeps({});

  await assert.rejects(
    () => applyGuildTransaction(
      { guildId: 'nonexistent', amount: 100, comment: '', actor: null, type: 'deposit' },
      deps,
    ),
    /Guild not found/,
  );
});

test('log comment is truncated to 500 characters', async () => {
  const { mock, deps } = makeDeps({ 'guilds/guild-d': { treasure: 0 } });

  await applyGuildTransaction(
    { guildId: 'guild-d', amount: 1, comment: 'x'.repeat(600), actor: null, type: 'deposit' },
    deps,
  );

  const logs = Object.values(mock.list('guilds/guild-d/logs'));
  assert.equal(logs[0].comment.length, 500);
});

test('falls back to Unknown nickname when actor is missing', async () => {
  const { mock, deps } = makeDeps({ 'guilds/guild-e': { treasure: 0 } });

  await applyGuildTransaction(
    { guildId: 'guild-e', amount: 10, comment: '', actor: null, type: 'deposit' },
    deps,
  );

  const logs = Object.values(mock.list('guilds/guild-e/logs'));
  assert.equal(logs[0].userNickname, 'Unknown');
});

test('multiple transactions accumulate correctly', async () => {
  const { mock, deps } = makeDeps({ 'guilds/guild-f': { treasure: 100 } });

  await applyGuildTransaction({ guildId: 'guild-f', amount: 50, comment: 'A', actor: null, type: 'deposit' }, deps);
  await applyGuildTransaction({ guildId: 'guild-f', amount: -30, comment: 'B', actor: null, type: 'withdraw' }, deps);

  assert.equal(mock.get('guilds/guild-f').treasure, 120);
  assert.equal(Object.keys(mock.list('guilds/guild-f/logs')).length, 2);
});
