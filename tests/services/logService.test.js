import test from 'node:test';
import assert from 'node:assert/strict';
import { logEvent } from '../../src/services/logService.js';

test('logEvent writes a log entry with nickname', async () => {
  const calls = [];
  const addDocFn = async (collectionRef, payload) => {
    calls.push({ collectionRef, payload });
  };
  const collectionFn = (dbRef, name) => ({ dbRef, name });
  const serverTimestampFn = () => 'now';
  const userStore = () => ({ nickname: 'Nova' });

  await logEvent('created ship', {
    userStore,
    addDocFn,
    collectionFn,
    serverTimestampFn,
    dbRef: { name: 'db' },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    collectionRef: { dbRef: { name: 'db' }, name: 'logs' },
    payload: {
      action: 'created ship',
      user: 'Nova',
      timestamp: 'now',
    },
  });
});

test('logEvent falls back to default user label', async () => {
  const calls = [];
  const addDocFn = async (collectionRef, payload) => {
    calls.push({ collectionRef, payload });
  };

  await logEvent('updated', {
    userStore: () => ({ nickname: '' }),
    addDocFn,
    collectionFn: (dbRef, name) => ({ dbRef, name }),
    serverTimestampFn: () => 'now',
    dbRef: { name: 'db' },
  });

  assert.equal(calls[0].payload.user, 'невідомо');
});

test('logEvent logs errors when write fails', async () => {
  const errors = [];
  const logger = {
    error: (message, error) => errors.push({ message, error }),
  };

  await logEvent('fail', {
    userStore: () => ({ nickname: 'Nova' }),
    addDocFn: async () => {
      throw new Error('boom');
    },
    collectionFn: () => ({}),
    serverTimestampFn: () => 'now',
    dbRef: { name: 'db' },
    logger,
  });

  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, 'Не вдалося записати лог:');
  assert.equal(errors[0].error.message, 'boom');
});
