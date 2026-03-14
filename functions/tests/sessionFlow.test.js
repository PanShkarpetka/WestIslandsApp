import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_SESSION_TIMEOUT_MS, COMMANDS, SESSION_STEPS } from '../src/config/constants.js';
import { getOrCreateUserSession } from '../src/services/firestoreService.js';

function createMockDb(seed = {}) {
  const docs = new Map(Object.entries(seed));

  return {
    collection() {
      return {
        doc(id) {
          return {
            async get() {
              if (!docs.has(id)) {
                return { exists: false };
              }

              return {
                exists: true,
                data: () => docs.get(id)
              };
            },
            async set(value, options = {}) {
              if (options.merge && docs.has(id)) {
                docs.set(id, { ...docs.get(id), ...value });
                return;
              }

              docs.set(id, value);
            }
          };
        }
      };
    }
  };
}

test('supports public cancel/reset/help commands', () => {
  assert.equal(COMMANDS.CANCEL, '/cancel');
  assert.equal(COMMANDS.RESET, '/reset');
  assert.equal(COMMANDS.HELP, '/fishing_help');
});

test('expires stale fishing session after 2 minutes', async () => {
  const telegramUserId = '1001';
  const staleUpdatedAt = new Date(Date.now() - ACTIVE_SESSION_TIMEOUT_MS - 1_000).toISOString();
  const db = createMockDb({
    [telegramUserId]: {
      telegramUserId,
      step: SESSION_STEPS.MODIFIER_2,
      payload: { modifiers: [2] },
      updatedAt: staleUpdatedAt
    }
  });

  const session = await getOrCreateUserSession(db, telegramUserId);

  assert.equal(session.step, SESSION_STEPS.IDLE);
  assert.deepEqual(session.payload, {});
  assert.equal(session.staleSessionCleared, true);
});


test('stale session marker is not persisted into next turn', async () => {
  const telegramUserId = '1002';
  const staleUpdatedAt = new Date(Date.now() - ACTIVE_SESSION_TIMEOUT_MS - 1_000).toISOString();
  const db = createMockDb({
    [telegramUserId]: {
      telegramUserId,
      step: SESSION_STEPS.MODIFIER_1,
      payload: {},
      updatedAt: staleUpdatedAt
    }
  });

  const firstRead = await getOrCreateUserSession(db, telegramUserId);
  assert.equal(firstRead.staleSessionCleared, true);

  const secondRead = await getOrCreateUserSession(db, telegramUserId);
  assert.equal(secondRead.staleSessionCleared, undefined);
  assert.equal(secondRead.step, SESSION_STEPS.IDLE);
});
