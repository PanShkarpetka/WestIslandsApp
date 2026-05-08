import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTreasuryTransaction } from '../../src/store/treasuryStore.js';
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

test('deposit adds amount to balance and writes transaction record', async () => {
  const { mock, deps } = makeDeps({ 'treasury/meta': { balance: 100 } });

  await applyTreasuryTransaction(
    { delta: 50, type: 'deposit', comment: 'Test deposit', user: { uid: 'u1', nickname: 'Alice' } },
    deps,
  );

  const meta = mock.get('treasury/meta');
  assert.equal(meta.balance, 150);

  const txDocs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txDocs.length, 1);
  assert.equal(txDocs[0].amount, 50);
  assert.equal(txDocs[0].type, 'deposit');
  assert.equal(txDocs[0].balanceAfter, 150);
  assert.equal(txDocs[0].userId, 'u1');
  assert.equal(txDocs[0].nickname, 'Alice');
  assert.equal(txDocs[0].comment, 'Test deposit');
});

test('withdraw subtracts amount and writes transaction record', async () => {
  const { mock, deps } = makeDeps({ 'treasury/meta': { balance: 200 } });

  await applyTreasuryTransaction(
    { delta: -80, type: 'withdraw', comment: 'Supplies', user: { uid: 'u2', nickname: 'Bob' } },
    deps,
  );

  const meta = mock.get('treasury/meta');
  assert.equal(meta.balance, 120);

  const txDocs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txDocs[0].amount, -80);
  assert.equal(txDocs[0].type, 'withdraw');
  assert.equal(txDocs[0].balanceAfter, 120);
});

test('throws when withdrawal would make balance negative', async () => {
  const { deps } = makeDeps({ 'treasury/meta': { balance: 30 } });

  await assert.rejects(
    () => applyTreasuryTransaction({ delta: -50, type: 'withdraw', comment: '', user: null }, deps),
    /Недостатньо золота/,
  );
});

test('creates meta doc when it does not exist yet', async () => {
  const { mock, deps } = makeDeps({});

  await applyTreasuryTransaction(
    { delta: 100, type: 'deposit', comment: 'First deposit', user: null },
    deps,
  );

  assert.equal(mock.get('treasury/meta').balance, 100);
});

test('truncates comment to 500 characters', async () => {
  const { mock, deps } = makeDeps({ 'treasury/meta': { balance: 0 } });
  const longComment = 'x'.repeat(600);

  await applyTreasuryTransaction(
    { delta: 1, type: 'deposit', comment: longComment, user: null },
    deps,
  );

  const txDocs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txDocs[0].comment.length, 500);
});

test('falls back to anon and default nickname when user is missing', async () => {
  const { mock, deps } = makeDeps({ 'treasury/meta': { balance: 0 } });

  await applyTreasuryTransaction({ delta: 10, type: 'deposit', comment: '', user: null }, deps);

  const txDocs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txDocs[0].userId, 'anon');
  assert.equal(txDocs[0].nickname, 'Гравець');
});

test('each deposit writes a separate transaction document', async () => {
  const { mock, deps } = makeDeps({ 'treasury/meta': { balance: 0 } });

  await applyTreasuryTransaction({ delta: 10, type: 'deposit', comment: 'A', user: null }, deps);
  await applyTreasuryTransaction({ delta: 20, type: 'deposit', comment: 'B', user: null }, deps);

  const txDocs = Object.values(mock.list('treasury-transactions'));
  assert.equal(txDocs.length, 2);
  assert.equal(mock.get('treasury/meta').balance, 30);
});
