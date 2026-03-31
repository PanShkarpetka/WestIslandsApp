import test from 'node:test';
import assert from 'node:assert/strict';
import { BOT_CONFIG_DOC, COLLECTIONS } from '../src/config/constants.js';
import {
  applyAvailabilityGuard,
  registerFishingOutcome,
  resetFishingDailyStateIfNeeded
} from '../src/services/firestoreService.js';

function createMockDb(seed = {}) {
  const collections = new Map();

  for (const [collectionName, docs] of Object.entries(seed)) {
    collections.set(collectionName, new Map(Object.entries(docs)));
  }

  function getCollection(name) {
    if (!collections.has(name)) {
      collections.set(name, new Map());
    }

    return collections.get(name);
  }

  return {
    collection(name) {
      const docs = getCollection(name);
      return {
        async get() {
          return {
            size: docs.size,
            docs: [...docs.entries()].map(([id, value]) => ({
              id,
              data: () => value,
              ref: {
                set: async (nextValue, options = {}) => {
                  if (options.merge && docs.has(id)) {
                    docs.set(id, { ...docs.get(id), ...nextValue });
                    return;
                  }

                  docs.set(id, nextValue);
                }
              }
            }))
          };
        },
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
            async set(nextValue, options = {}) {
              if (options.merge && docs.has(id)) {
                docs.set(id, { ...docs.get(id), ...nextValue });
                return;
              }

              docs.set(id, nextValue);
            }
          };
        }
      };
    }
  };
}

test('stock update guard never drops below zero', () => {
  const result = applyAvailabilityGuard(1, 5);
  assert.equal(result.awarded, 1);
  assert.equal(result.after, 0);
});

test('daily reset randomizes fish availability and resets dc to 10', async () => {
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {
        dc: { eachRollDc: 13 },
        fishingState: { lastResetDateKey: '2026-03-30', caughtCounter: 3, notCaughtCounter: 9 }
      }
    },
    [COLLECTIONS.FISHES]: {
      a: { fishAmountDaily: 7, fishAmountAvailableNow: 7 },
      b: { fishAmountDaily: 3, fishAmountAvailableNow: 3 }
    }
  });

  await resetFishingDailyStateIfNeeded(db, {
    now: new Date('2026-03-31T12:00:00.000Z'),
    rng: () => 0
  });

  const config = await db.collection(COLLECTIONS.BOT_CONFIGS).doc(BOT_CONFIG_DOC).get();
  assert.equal(config.data().dc.eachRollDc, 10);
  assert.equal(config.data().fishingState.caughtCounter, 0);
  assert.equal(config.data().fishingState.notCaughtCounter, 0);

  const fishes = await db.collection(COLLECTIONS.FISHES).get();
  fishes.docs.forEach((doc) => {
    assert.equal(doc.data().fishAmountAvailableNow, 0);
  });
});

test('register outcome raises dc every 5 catches and resets catch counter', async () => {
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {
        dc: { eachRollDc: 10 },
        fishingState: { lastResetDateKey: '2026-03-31', caughtCounter: 4, notCaughtCounter: 9 }
      }
    }
  });

  const result = await registerFishingOutcome(db, {
    success: true,
    now: new Date('2026-03-31T15:00:00.000Z')
  });

  assert.equal(result.caughtCounter, 0);
  assert.equal(result.notCaughtCounter, 9);
  assert.equal(result.eachRollDc, 11);
  assert.equal(result.dcChanged, true);
  assert.equal(result.dcChangeDirection, 'up');
});

test('register outcome lowers dc every 10 misses and resets miss counter', async () => {
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {
        dc: { eachRollDc: 12 },
        fishingState: { lastResetDateKey: '2026-03-31', caughtCounter: 2, notCaughtCounter: 9 }
      }
    }
  });

  const result = await registerFishingOutcome(db, {
    success: false,
    now: new Date('2026-03-31T15:00:00.000Z')
  });

  assert.equal(result.caughtCounter, 2);
  assert.equal(result.notCaughtCounter, 0);
  assert.equal(result.eachRollDc, 11);
  assert.equal(result.dcChanged, true);
  assert.equal(result.dcChangeDirection, 'down');
});

test('reset key flips at UTC noon', async () => {
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {
        fishingState: { lastResetDateKey: '2026-03-30' }
      }
    }
  });

  const notReset = await resetFishingDailyStateIfNeeded(db, {
    now: new Date('2026-03-31T11:59:59.000Z')
  });
  assert.equal(notReset, false);

  const didReset = await resetFishingDailyStateIfNeeded(db, {
    now: new Date('2026-03-31T12:00:00.000Z')
  });
  assert.equal(didReset, true);
});

test('force option performs reset even when current noon-key was already reset', async () => {
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {
        dc: { eachRollDc: 15 },
        fishingState: {
          lastResetDateKey: '2026-03-31',
          caughtCounter: 4,
          notCaughtCounter: 9
        }
      }
    },
    [COLLECTIONS.FISHES]: {
      a: { fishAmountDaily: 5, fishAmountAvailableNow: 5 }
    }
  });

  const reset = await resetFishingDailyStateIfNeeded(db, {
    now: new Date('2026-03-31T15:00:00.000Z'),
    force: true,
    rng: () => 0
  });

  assert.equal(reset, true);
  const config = await db.collection(COLLECTIONS.BOT_CONFIGS).doc(BOT_CONFIG_DOC).get();
  assert.equal(config.data().dc.eachRollDc, 10);
  assert.equal(config.data().fishingState.caughtCounter, 0);
  assert.equal(config.data().fishingState.notCaughtCounter, 0);
});
