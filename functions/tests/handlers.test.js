import test from 'node:test';
import assert from 'node:assert/strict';
import { BOT_CONFIG_DOC, COLLECTIONS, COMMANDS, SESSION_STEPS } from '../src/config/constants.js';
import { handleTelegramMessage } from '../src/telegram/handlers.js';

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
    async runTransaction(callback) {
      const operations = [];
      const transaction = {
        async get(docRef) {
          return docRef.get();
        },
        update(docRef, value) {
          operations.push(() => docRef.set(value, { merge: true }));
        },
        set(docRef, value) {
          operations.push(() => docRef.set(value));
        }
      };

      const result = await callback(transaction);
      for (const apply of operations) {
        await apply();
      }
      return result;
    },
    collection(name) {
      const docs = getCollection(name);
      return {
        async get() {
          return {
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
          const docId = id ?? `generated-${docs.size + 1}`;
          return {
            async get() {
              if (!docs.has(docId)) {
                return { exists: false };
              }

              return {
                exists: true,
                data: () => docs.get(docId)
              };
            },
            async set(value, options = {}) {
              if (options.merge && docs.has(docId)) {
                docs.set(docId, { ...docs.get(docId), ...value });
                return;
              }

              docs.set(docId, value);
            }
          };
        }
      };
    }
  };
}

test('accepts /yes while waiting for an additional roll confirmation', async () => {
  const telegramUserId = '501';
  const db = createMockDb({
    [COLLECTIONS.USER_SESSIONS]: {
      [telegramUserId]: {
        telegramUserId,
        step: SESSION_STEPS.ADDITIONAL_ROLL_CONFIRM,
        payload: {
          result: {
            normalizedInput: { modifiers: [1, 2, 3], baitType: 'basic', useShip: false },
            rawRolls: [10, 10, 10],
            modifiedRolls: [11, 12, 13],
            finalRolls: [11, 12, 13],
            guidance: { guidanceRolls: [], totalGuidanceBonus: 0 },
            baitBonusRoll: null,
            shipBonusRoll: null,
            computedSum: 36,
            finalSum: 36,
            eachRollDc: 10,
            passedEachRollDc: true,
            failedRollIndexes: [],
            rolledFish: null,
            effectiveRollUsed: 36
          },
          pendingAdditionalRoll: {
            fishName: 'Test Fish',
            baseLog: { successFailureResult: true },
            selectedFish: {
              id: 'fish-1',
              fishName: 'Test Fish',
              fishDescription: 'desc',
              fishCodeNumber: { min: 36, max: 36 },
              fishValueSilver: 5,
              fishAdditionalRollsRequiredForSuccessfulCatch: [{ name: 'Dexterity save' }]
            },
            requirements: [{ name: 'Dexterity save' }]
          }
        },
        updatedAt: new Date().toISOString()
      }
    },
    [COLLECTIONS.FISHES]: {
      'fish-1': {
        fishName: 'Test Fish',
        fishDescription: 'desc',
        fishCodeNumber: { min: 36, max: 36 },
        fishValueSilver: 5,
        fishAmountAvailableNow: 1,
        fishAdditionalRollsRequiredForSuccessfulCatch: [{ name: 'Dexterity save' }]
      }
    },
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {}
    }
  });

  const reply = await handleTelegramMessage({
    db,
    payload: { text: '/yes', telegramUserId, telegramUsername: 'angler' }
  });

  assert.match(reply, /Додатковий кидок: <b>УСПІХ ✅<\/b>/);
});

test('accepts shorthand /n while waiting for an additional roll confirmation', async () => {
  const telegramUserId = '502';
  const db = createMockDb({
    [COLLECTIONS.USER_SESSIONS]: {
      [telegramUserId]: {
        telegramUserId,
        step: SESSION_STEPS.ADDITIONAL_ROLL_CONFIRM,
        payload: {
          pendingAdditionalRoll: {
            fishName: 'Test Fish',
            baseLog: {},
            selectedFish: {
              id: 'fish-1',
              fishName: 'Test Fish'
            },
            requirements: [{ name: 'Dexterity save' }]
          }
        },
        updatedAt: new Date().toISOString()
      }
    },
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {}
    }
  });

  const reply = await handleTelegramMessage({
    db,
    payload: { text: '/n', telegramUserId, telegramUsername: 'angler' }
  });

  assert.equal(reply, 'Перевірку провалено. Test Fish втекла.');
});

test('ignores slash commands that do not contain fish', async () => {
  const telegramUserId = '503';
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {}
    }
  });

  const reply = await handleTelegramMessage({
    db,
    payload: { text: '/start', telegramUserId, telegramUsername: 'angler' }
  });

  assert.equal(reply, null);
});

test('ignores unrelated bot commands while waiting for an additional roll confirmation', async () => {
  const telegramUserId = '504';
  const db = createMockDb({
    [COLLECTIONS.USER_SESSIONS]: {
      [telegramUserId]: {
        telegramUserId,
        step: SESSION_STEPS.ADDITIONAL_ROLL_CONFIRM,
        payload: {
          pendingAdditionalRoll: {
            fishName: 'Test Fish',
            baseLog: {},
            selectedFish: {
              id: 'fish-1',
              fishName: 'Test Fish'
            },
            requirements: [{ name: 'Dexterity save' }]
          }
        },
        updatedAt: new Date().toISOString()
      }
    },
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {}
    }
  });

  const reply = await handleTelegramMessage({
    db,
    payload: { text: '/roll d20+d4-1', telegramUserId, telegramUsername: 'angler' }
  });

  assert.equal(reply, null);
});

test('ignores plain chat messages while idle', async () => {
  const telegramUserId = '505';
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {}
    }
  });

  const reply = await handleTelegramMessage({
    db,
    payload: { text: 'hello there', telegramUserId, telegramUsername: 'angler' }
  });

  assert.equal(reply, null);
});

test('accepts /y with bot mention while waiting for an additional roll confirmation', async () => {
  const telegramUserId = '506';
  const db = createMockDb({
    [COLLECTIONS.USER_SESSIONS]: {
      [telegramUserId]: {
        telegramUserId,
        step: SESSION_STEPS.ADDITIONAL_ROLL_CONFIRM,
        payload: {
          result: {
            normalizedInput: { modifiers: [1, 2, 3], baitType: 'basic', useShip: false },
            rawRolls: [10, 10, 10],
            modifiedRolls: [11, 12, 13],
            finalRolls: [11, 12, 13],
            guidance: { guidanceRolls: [], totalGuidanceBonus: 0 },
            baitBonusRoll: null,
            shipBonusRoll: null,
            computedSum: 36,
            finalSum: 36,
            eachRollDc: 10,
            passedEachRollDc: true,
            failedRollIndexes: [],
            rolledFish: null,
            effectiveRollUsed: 36
          },
          pendingAdditionalRoll: {
            fishName: 'Test Fish',
            baseLog: { successFailureResult: true },
            selectedFish: {
              id: 'fish-1',
              fishName: 'Test Fish',
              fishDescription: 'desc',
              fishCodeNumber: { min: 36, max: 36 },
              fishValueSilver: 5,
              fishAdditionalRollsRequiredForSuccessfulCatch: [{ name: 'Dexterity save' }]
            },
            requirements: [{ name: 'Dexterity save' }]
          }
        },
        updatedAt: new Date().toISOString()
      }
    },
    [COLLECTIONS.FISHES]: {
      'fish-1': {
        fishName: 'Test Fish',
        fishDescription: 'desc',
        fishCodeNumber: { min: 36, max: 36 },
        fishValueSilver: 5,
        fishAmountAvailableNow: 1,
        fishAdditionalRollsRequiredForSuccessfulCatch: [{ name: 'Dexterity save' }]
      }
    },
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {}
    }
  });

  const reply = await handleTelegramMessage({
    db,
    payload: { text: '/y@FishingBot', telegramUserId, telegramUsername: 'angler' }
  });

  assert.match(reply, /Додатковий кидок: <b>УСПІХ ✅<\/b>/);
});

test('accepts fish command with bot mention', async () => {
  const telegramUserId = '507';
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {}
    }
  });

  const reply = await handleTelegramMessage({
    db,
    payload: { text: `${COMMANDS.FISH}@FishingBot 1 2 3`, telegramUserId, telegramUsername: 'angler' }
  });

  assert.ok(typeof reply === 'string');
  assert.notEqual(reply, null);
});

test('accepts admin command with bot mention', async () => {
  const telegramUserId = '508';
  const db = createMockDb({
    [COLLECTIONS.BOT_CONFIGS]: {
      [BOT_CONFIG_DOC]: {}
    },
    [COLLECTIONS.FISHES]: {
      'fish-1': {
        fishName: 'Test Fish',
        fishCodeNumber: { min: 36, max: 36 },
        fishAmountAvailableNow: 2
      }
    }
  });

  const reply = await handleTelegramMessage({
    db,
    payload: {
      text: `${COMMANDS.LIST_AVAILABLE_FISHES_TODAY}@FishingBot`,
      telegramUserId,
      telegramUsername: 'angler'
    }
  });

  assert.match(reply, /Available fishes today/);
}); 
