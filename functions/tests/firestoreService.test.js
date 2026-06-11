import test from 'node:test';
import assert from 'node:assert/strict';
import { BOT_CONFIG_DOC, COLLECTIONS } from '../src/config/constants.js';
import {
  applyAvailabilityGuard,
  createFishingLog,
  registerFishingOutcome,
  resetFishingDailyStateIfNeeded,
  updateFishAvailabilityTransaction
} from '../src/services/firestoreService.js';

function createMockDb(seed = {}) {
  const collections = new Map();
  let autoId = 0;

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
    _collections: collections,
    collection(name) {
      const docs = getCollection(name);
      function makeDocRef(id = `auto_${++autoId}`) {
        return {
          id,
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

      function makeQuery(currentDocs) {
        return {
          orderBy() {
            return makeQuery(currentDocs);
          },
          limit(count) {
            return makeQuery(currentDocs.slice(0, count));
          },
          async get() {
            return {
              size: currentDocs.length,
              docs: currentDocs.map(([id, value]) => ({
                id,
                data: () => value,
                ref: makeDocRef(id)
              }))
            };
          }
        };
      }

      return {
        async get() {
          return makeQuery([...docs.entries()]).get();
        },
        orderBy(field, direction = 'asc') {
          const sorted = [...docs.entries()].sort(([, a], [, b]) => {
            const av = a?.[field] ?? 0;
            const bv = b?.[field] ?? 0;
            if (av === bv) return 0;
            return direction === 'desc' ? (av > bv ? -1 : 1) : (av > bv ? 1 : -1);
          });
          return makeQuery(sorted);
        },
        doc(id) {
          return makeDocRef(id);
        }
      };
    },
    async runTransaction(callback) {
      let hasWritten = false;
      const transaction = {
        get: (ref) => {
          if (hasWritten) throw new Error('Firestore transactions require all reads to be executed before all writes');
          return ref.get();
        },
        set: (ref, data, options) => {
          hasWritten = true;
          return ref.set(data, options);
        },
        update: (ref, data) => {
          hasWritten = true;
          return ref.set(data, { merge: true });
        }
      };
      return callback(transaction);
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

test('register outcome raises dc every 5 catches and resets both counters', async () => {
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
  assert.equal(result.notCaughtCounter, 0);
  assert.equal(result.eachRollDc, 11);
  assert.equal(result.dcChanged, true);
  assert.equal(result.dcChangeDirection, 'up');
});

test('register outcome lowers dc every 10 misses and resets both counters', async () => {
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

  assert.equal(result.caughtCounter, 0);
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

test('createFishingLog tags logs with active campaign cycle', async () => {
  const db = createMockDb({
    cycles: {
      old: { startedAt: '1 Hammer', finishedAt: '10 Hammer', createdAt: 1 },
      active: { startedAt: '11 Hammer', finishedAt: '', createdAt: 2 }
    }
  });

  const logId = await createFishingLog(db, { telegramUserId: 42 });
  const log = await db.collection(COLLECTIONS.FISHING_LOGS).doc(logId).get();

  assert.equal(log.data().cycleId, 'active');
  assert.equal(log.data().cycleStartedAt, '11 Hammer');
});

test('updateFishAvailabilityTransaction tags successful logs with active campaign cycle', async () => {
  const db = createMockDb({
    cycles: {
      active: { startedAt: '11 Hammer', createdAt: 2 }
    },
    [COLLECTIONS.FISHES]: {
      cod: { fishName: 'Cod', fishAmountAvailableNow: 2 }
    }
  });

  await updateFishAvailabilityTransaction(db, {
    catches: [{ id: 'cod' }],
    logData: { telegramUserId: 42 }
  });

  const logs = await db.collection(COLLECTIONS.FISHING_LOGS).get();
  assert.equal(logs.docs[0].data().cycleId, 'active');
  assert.equal(logs.docs[0].data().cycleStartedAt, '11 Hammer');
});

test('updateFishAvailabilityTransaction creates caught fish linked to hero by telegramId', async () => {
  const db = createMockDb({
    cycles: {
      active: { startedAt: '11 Hammer', createdAt: 2 }
    },
    [COLLECTIONS.HEROES]: {
      h1: { name: 'Aela', telegramId: '42' }
    },
    [COLLECTIONS.FISHES]: {
      cod: {
        fishName: 'Cod',
        fishDescription: 'Common fish',
        fishCodeNumber: { min: 10, max: 20 },
        fishValueSilver: { low: 100, high: 200 },
        fishAmountAvailableNow: 2
      }
    }
  });

  await updateFishAvailabilityTransaction(db, {
    catches: [{ id: 'cod' }],
    logData: { telegramUserId: 42, telegramUsername: 'angler', effectiveRollUsed: 15 }
  });

  const logs = await db.collection(COLLECTIONS.FISHING_LOGS).get();
  assert.equal(logs.docs[0].data().heroId, 'h1');
  assert.equal(logs.docs[0].data().heroName, 'Aela');

  const caughtFish = await db.collection(COLLECTIONS.CAUGHT_FISH).get();
  assert.equal(caughtFish.docs.length, 1);
  const data = caughtFish.docs[0].data();
  assert.equal(data.heroId, 'h1');
  assert.equal(data.heroName, 'Aela');
  assert.equal(data.telegramUserId, '42');
  assert.equal(data.telegramUsername, 'angler');
  assert.equal(data.telegramUsernameKey, 'angler');
  assert.equal(data.status, 'available');
  assert.equal(data.valueSilver, 150);
  assert.equal(data.valueGold, 15);
  assert.equal(data.cycleId, 'active');
});

test('updateFishAvailabilityTransaction creates caught fish linked to hero by telegram username', async () => {
  const db = createMockDb({
    [COLLECTIONS.HEROES]: {
      h1: { name: 'Aela', telegramId: '@PanShkarpetka' }
    },
    [COLLECTIONS.FISHES]: {
      cod: {
        fishName: 'Cod',
        fishValueSilver: 50,
        fishAmountAvailableNow: 1
      }
    }
  });

  await updateFishAvailabilityTransaction(db, {
    catches: [{ id: 'cod' }],
    logData: { telegramUserId: 42, telegramUsername: 'PanShkarpetka', effectiveRollUsed: 15 }
  });

  const caughtFish = await db.collection(COLLECTIONS.CAUGHT_FISH).get();
  const data = caughtFish.docs[0].data();
  assert.equal(data.heroId, 'h1');
  assert.equal(data.heroName, 'Aela');
  assert.equal(data.telegramUsernameKey, 'panshkarpetka');
});

test('updateFishAvailabilityTransaction creates unassigned caught fish when hero is not linked', async () => {
  const db = createMockDb({
    [COLLECTIONS.FISHES]: {
      cod: { fishName: 'Cod', fishValueSilver: 50, fishAmountAvailableNow: 1 }
    }
  });

  await updateFishAvailabilityTransaction(db, {
    catches: [{ id: 'cod' }],
    logData: { telegramUserId: 99, effectiveRollUsed: 10 }
  });

  const caughtFish = await db.collection(COLLECTIONS.CAUGHT_FISH).get();
  const data = caughtFish.docs[0].data();
  assert.equal(data.heroId, null);
  assert.equal(data.heroName, null);
  assert.equal(data.telegramUserId, '99');
  assert.equal(data.valueSilver, 50);
  assert.equal(data.valueGold, 5);
});

test('updateFishAvailabilityTransaction reads all fish before writing availability updates', async () => {
  const db = createMockDb({
    [COLLECTIONS.FISHES]: {
      cod: { fishName: 'Cod', fishValueSilver: 50, fishAmountAvailableNow: 1 },
      tuna: { fishName: 'Tuna', fishValueSilver: 70, fishAmountAvailableNow: 1 }
    }
  });

  const result = await updateFishAvailabilityTransaction(db, {
    catches: [{ id: 'cod' }, { id: 'tuna' }],
    logData: { telegramUserId: 99, effectiveRollUsed: 10 }
  });

  assert.equal(result.finalCatches.length, 2);
  const fishes = await db.collection(COLLECTIONS.FISHES).get();
  const byId = Object.fromEntries(fishes.docs.map((doc) => [doc.id, doc.data()]));
  assert.equal(byId.cod.fishAmountAvailableNow, 0);
  assert.equal(byId.tuna.fishAmountAvailableNow, 0);
});
