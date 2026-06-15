import { ACTIVE_SESSION_TIMEOUT_MS, BOT_CONFIG_DOC, COLLECTIONS, DEFAULT_CONFIG, SESSION_STEPS } from '../config/constants.js';
import { rollFishingTreasure } from './fishingService.js';

function mergeDeep(target, source) {
  const output = { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeDeep(target[key] || {}, value);
    } else {
      output[key] = value;
    }
  }

  return output;
}


export function applyAvailabilityGuard(before, requested) {
  const safeBefore = Math.max(0, Number(before || 0));
  const safeRequested = Math.max(0, Number(requested || 0));
  const awarded = Math.min(safeBefore, safeRequested);
  const after = Math.max(0, safeBefore - safeRequested);
  return { awarded, after };
}

function getFishCodeRange(fish) {
  const code = fish?.fishCodeNumber;
  if (typeof code === 'number') {
    return { min: Number(code), max: Number(code) };
  }

  return {
    min: Number(code?.min ?? Number.NaN),
    max: Number(code?.max ?? Number.NaN)
  };
}

function resolveFishValueSilver(fish, effectiveRollUsed) {
  const value = fish?.fishValueSilver;
  if (typeof value === 'number') return Number(value) || 0;
  if (!value || typeof value !== 'object') return 0;

  const low = Number(value.low ?? 0);
  const high = Number(value.high ?? 0);
  const range = getFishCodeRange(fish);
  const roll = Number(effectiveRollUsed);

  if (Number.isFinite(roll) && Number.isFinite(range.min) && Number.isFinite(range.max)) {
    if (range.max > range.min) {
      const t = Math.max(0, Math.min(1, (roll - range.min) / (range.max - range.min)));
      return low + t * (high - low);
    }
    return high;
  }

  return (low + high) / 2;
}

function normalizeTelegramUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

function matchesTelegramIdentity(heroTelegramId, { telegramUserId, telegramUsername }) {
  const link = String(heroTelegramId || '').trim();
  if (!link) return false;

  if (/^\d+$/.test(link)) {
    return link === String(telegramUserId || '').trim();
  }

  return normalizeTelegramUsername(link) === normalizeTelegramUsername(telegramUsername);
}

async function findHeroByTelegramIdentity(db, { telegramUserId, telegramUsername } = {}) {
  if (telegramUserId == null && !telegramUsername) return null;

  const heroesRef = db.collection(COLLECTIONS.HEROES);
  if (typeof heroesRef.where === 'function') {
    const candidates = new Set();
    const userId = String(telegramUserId || '').trim();
    const username = String(telegramUsername || '').trim().replace(/^@+/, '');
    const usernameKey = normalizeTelegramUsername(username);
    if (userId) candidates.add(userId);
    if (username) {
      candidates.add(username);
      candidates.add(`@${username}`);
    }
    if (usernameKey && usernameKey !== username) {
      candidates.add(usernameKey);
      candidates.add(`@${usernameKey}`);
    }

    const values = [...candidates].slice(0, 10);
    if (!values.length) return null;
    const snap = await heroesRef.where('telegramId', 'in', values).limit(1).get();
    const doc = snap.docs?.[0];
    return doc ? { id: doc.id, ...doc.data() } : null;
  }

  const snap = await heroesRef.get();
  const doc = snap.docs.find((item) => matchesTelegramIdentity(item.data()?.telegramId, { telegramUserId, telegramUsername }));
  return doc ? { id: doc.id, ...doc.data() } : null;
}

async function safeFindHeroByTelegramIdentity(db, identity) {
  try {
    return await findHeroByTelegramIdentity(db, identity);
  } catch (_error) {
    return null;
  }
}

export async function getBotConfig(db) {
  const docRef = db.collection(COLLECTIONS.BOT_CONFIGS).doc(BOT_CONFIG_DOC);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return DEFAULT_CONFIG;
  }

  return mergeDeep(DEFAULT_CONFIG, snapshot.data());
}

export async function getAvailableFishes(db) {
  const snapshot = await db.collection(COLLECTIONS.FISHES).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}


export async function resetFishAvailabilityToDaily(db) {
  const snapshot = await db.collection(COLLECTIONS.FISHES).get();
  await Promise.all(snapshot.docs.map(async (doc) => {
    const data = doc.data();
    const dailyAmount = Math.max(0, Number(data.fishAmountDaily ?? data.fishAmountAvailableNow ?? 0));
    await doc.ref.set({ fishAmountAvailableNow: dailyAmount }, { merge: true });
  }));

  return snapshot.size;
}

export function getDailyResetKeyNoonUtc(date = new Date()) {
  const current = new Date(date);
  const anchor = new Date(Date.UTC(
    current.getUTCFullYear(),
    current.getUTCMonth(),
    current.getUTCDate(),
    12,
    0,
    0,
    0
  ));

  if (current.getTime() < anchor.getTime()) {
    anchor.setUTCDate(anchor.getUTCDate() - 1);
  }

  return anchor.toISOString().slice(0, 10);
}

function randomIntInclusive(max, rng = Math.random) {
  const safeMax = Math.max(0, Number(max || 0));
  return Math.floor(rng() * (safeMax + 1));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export async function resetFishingDailyStateIfNeeded(db, { now = new Date(), rng = Math.random, force = false } = {}) {
  const todayKey = getDailyResetKeyNoonUtc(now);
  const configRef = db.collection(COLLECTIONS.BOT_CONFIGS).doc(BOT_CONFIG_DOC);
  const configSnapshot = await configRef.get();
  const existing = configSnapshot.exists ? configSnapshot.data() : {};
  const lastResetKey = existing?.fishingState?.lastResetDateKey;

  if (!force && lastResetKey === todayKey) {
    return false;
  }

  const fishesSnapshot = await db.collection(COLLECTIONS.FISHES).get();
  await Promise.all(fishesSnapshot.docs.map(async (doc) => {
    const data = doc.data();
    const dailyAmount = Math.max(0, Number(data.fishAmountDaily ?? 0));
    const randomizedAmount = randomIntInclusive(dailyAmount, rng);
    await doc.ref.set({ fishAmountAvailableNow: randomizedAmount }, { merge: true });
  }));

  await configRef.set({
    dc: {
      eachRollDc: 10
    },
    fishingState: {
      lastResetDateKey: todayKey,
      caughtCounter: 0,
      notCaughtCounter: 0,
      resetAt: now.toISOString()
    }
  }, { merge: true });

  return true;
}

export async function registerFishingOutcome(db, { success, now = new Date() }) {
  await resetFishingDailyStateIfNeeded(db, { now });

  const todayKey = getDailyResetKeyNoonUtc(now);
  const configRef = db.collection(COLLECTIONS.BOT_CONFIGS).doc(BOT_CONFIG_DOC);
  const configSnapshot = await configRef.get();
  const existing = configSnapshot.exists ? configSnapshot.data() : {};
  const state = existing?.fishingState || {};
  const currentDc = clamp(Number(existing?.dc?.eachRollDc ?? 10), 10, 15);

  let caughtCounter = Math.max(0, Number(state.caughtCounter ?? state.caughtCount ?? 0));
  let notCaughtCounter = Math.max(0, Number(state.notCaughtCounter ?? state.notCaughtCount ?? 0));
  let eachRollDc = currentDc;
  let dcChangeDirection = null;

  if (success) {
    caughtCounter += 1;
    if (caughtCounter >= 5) {
      eachRollDc = clamp(currentDc + 1, 10, 15);
      caughtCounter = 0;
      notCaughtCounter = 0;
      dcChangeDirection = eachRollDc > currentDc ? 'up' : null;
    }
  } else {
    notCaughtCounter += 1;
    if (notCaughtCounter >= 10) {
      eachRollDc = clamp(currentDc - 1, 10, 15);
      caughtCounter = 0;
      notCaughtCounter = 0;
      dcChangeDirection = eachRollDc < currentDc ? 'down' : null;
    }
  }

  await configRef.set({
    dc: {
      eachRollDc
    },
    fishingState: {
      ...state,
      lastResetDateKey: state.lastResetDateKey || todayKey,
      caughtCounter,
      notCaughtCounter,
      lastOutcomeAt: now.toISOString()
    }
  }, { merge: true });

  return {
    caughtCounter,
    notCaughtCounter,
    eachRollDc,
    previousDc: currentDc,
    dcChanged: dcChangeDirection !== null,
    dcChangeDirection
  };
}

function startOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function getFishingLogsForDate(db, date = new Date()) {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const snapshot = await db.collection(COLLECTIONS.FISHING_LOGS)
    .where('timestamp', '>=', start.toISOString())
    .where('timestamp', '<', end.toISOString())
    .orderBy('timestamp', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getFishingLogsForYesterday(db, today = new Date()) {
  const start = startOfDay(today);
  start.setDate(start.getDate() - 1);
  return getFishingLogsForDate(db, start);
}

export async function getAllFishingLogs(db) {
  const snapshot = await db.collection(COLLECTIONS.FISHING_LOGS)
    .orderBy('timestamp', 'asc')
    .get();

  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getOrCreateUserSession(db, telegramUserId) {
  const sessionRef = db.collection(COLLECTIONS.USER_SESSIONS).doc(String(telegramUserId));
  const snapshot = await sessionRef.get();

  if (!snapshot.exists) {
    const freshSession = {
      telegramUserId,
      step: SESSION_STEPS.IDLE,
      payload: {},
      updatedAt: new Date().toISOString()
    };
    await sessionRef.set(freshSession);
    return freshSession;
  }

  const session = snapshot.data();
  const updatedAtMs = new Date(session.updatedAt || 0).getTime();
  if (Date.now() - updatedAtMs > ACTIVE_SESSION_TIMEOUT_MS) {
    const resetSession = {
      telegramUserId,
      step: SESSION_STEPS.IDLE,
      payload: {},
      updatedAt: new Date().toISOString()
    };
    await sessionRef.set(resetSession);
    return {
      ...resetSession,
      staleSessionCleared: true
    };
  }

  return session;
}

export async function upsertUserSession(db, telegramUserId, sessionPatch) {
  const sessionRef = db.collection(COLLECTIONS.USER_SESSIONS).doc(String(telegramUserId));
  await sessionRef.set({
    telegramUserId,
    ...sessionPatch,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function clearUserSession(db, telegramUserId) {
  const sessionRef = db.collection(COLLECTIONS.USER_SESSIONS).doc(String(telegramUserId));
  await sessionRef.set({
    telegramUserId,
    step: SESSION_STEPS.IDLE,
    payload: {},
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function markUpdateProcessed(db, updateId, payload = {}) {
  const docRef = db.collection(COLLECTIONS.PROCESSED_UPDATES).doc(String(updateId));
  try {
    await docRef.create({
      updateId,
      processedAt: new Date().toISOString(),
      ...payload
    });
    return true;
  } catch (error) {
    if (error.code === 6 || /already exists/i.test(error.message)) {
      return false;
    }

    throw error;
  }
}

async function resolveActiveCycleMeta(db) {
  try {
    const snapshot = await db.collection('cycles')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const activeCycle = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() || {}) }))
      .find((cycle) => cycle.startedAt && !cycle.finishedAt);

    if (!activeCycle) return {};

    return {
      cycleId: activeCycle.id,
      cycleStartedAt: activeCycle.startedAt || ''
    };
  } catch (_error) {
    return {};
  }
}

export async function createFishingLog(db, logData) {
  const logRef = db.collection(COLLECTIONS.FISHING_LOGS).doc();
  const cycleMeta = await resolveActiveCycleMeta(db);
  await logRef.set({
    ...logData,
    ...cycleMeta,
    timestamp: new Date().toISOString()
  });

  return logRef.id;
}

export async function updateFishAvailabilityTransaction(db, { catches, logData, rng = Math.random }) {
  const config = await getBotConfig(db);
  const cycleMeta = await resolveActiveCycleMeta(db);
  const linkedHero = await safeFindHeroByTelegramIdentity(db, {
    telegramUserId: logData?.telegramUserId,
    telegramUsername: logData?.telegramUsername || logData?.telegramUserNickname
  });
  return db.runTransaction(async (transaction) => {
    const fishDeltas = new Map();
    catches.forEach((fish) => {
      fishDeltas.set(fish.id, (fishDeltas.get(fish.id) || 0) + 1);
    });

    const finalCatches = [];
    const availabilityChanges = [];
    const treasuresFound = [];

    const fishSnapshots = [];
    for (const [fishId, desiredCount] of fishDeltas.entries()) {
      const fishRef = db.collection(COLLECTIONS.FISHES).doc(fishId);
      const fishSnapshot = await transaction.get(fishRef);
      fishSnapshots.push({ fishId, desiredCount, fishRef, fishSnapshot });
    }

    for (const { fishId, desiredCount, fishRef, fishSnapshot } of fishSnapshots) {
      if (!fishSnapshot.exists) {
        continue;
      }

      const data = fishSnapshot.data();
      const before = Math.max(0, Number(data.fishAmountAvailableNow || 0));
      const { awarded: actualCount, after } = applyAvailabilityGuard(before, desiredCount);

      if (actualCount > 0) {
        transaction.update(fishRef, { fishAmountAvailableNow: after });
      }

      for (let i = 0; i < actualCount; i += 1) {
        finalCatches.push({
          id: fishId,
          fishName: data.fishName,
          fishDescription: data.fishDescription,
          fishCodeNumber: data.fishCodeNumber,
          fishValueSilver: data.fishValueSilver,
          fishAdditionalRollsRequiredForSuccessfulCatch: data.fishAdditionalRollsRequiredForSuccessfulCatch
        });
      }

      availabilityChanges.push({ fishId, before, requested: desiredCount, awarded: actualCount, after });
    }

    const logRef = db.collection(COLLECTIONS.FISHING_LOGS).doc();

    finalCatches.forEach((fish) => {
      const valueSilver = resolveFishValueSilver(fish, logData?.effectiveRollUsed);
      const caughtFishRef = db.collection(COLLECTIONS.CAUGHT_FISH).doc();
      transaction.set(caughtFishRef, {
        fishId: fish.id,
        fishName: fish.fishName,
        fishDescription: fish.fishDescription,
        fishCodeNumber: fish.fishCodeNumber,
        fishValueSilver: fish.fishValueSilver,
        effectiveRollUsed: logData?.effectiveRollUsed ?? null,
        valueSilver,
        valueGold: valueSilver / 10,
        telegramUserId: logData?.telegramUserId == null ? null : String(logData.telegramUserId),
        telegramUsername: logData?.telegramUsername || logData?.telegramUserNickname || '',
        telegramUsernameKey: normalizeTelegramUsername(logData?.telegramUsername || logData?.telegramUserNickname),
        heroId: linkedHero?.id || null,
        heroName: linkedHero?.name || null,
        sourceFishingLogId: logRef.id,
        cycleId: cycleMeta.cycleId || null,
        status: 'available',
        createdAt: new Date().toISOString(),
        disposedAt: null
      });
      const treasure = rollFishingTreasure({ config: config.treasures, rng });
      if (treasure) {
        const treasureRef = db.collection(COLLECTIONS.CAUGHT_TREASURES).doc();
        const treasureData = {
          ...treasure,
          telegramUserId: logData?.telegramUserId == null ? null : String(logData.telegramUserId),
          telegramUsername: logData?.telegramUsername || logData?.telegramUserNickname || '',
          telegramUsernameKey: normalizeTelegramUsername(logData?.telegramUsername || logData?.telegramUserNickname),
          heroId: linkedHero?.id || null,
          heroName: linkedHero?.name || null,
          sourceFishingLogId: logRef.id,
          sourceCaughtFishId: caughtFishRef.id,
          fishId: fish.id,
          fishName: fish.fishName,
          cycleId: cycleMeta.cycleId || null,
          status: 'available',
          createdAt: new Date().toISOString(),
          removedAt: null
        };
        treasuresFound.push({
          id: treasureRef.id,
          treasureId: treasure.treasureId,
          treasureName: treasure.treasureName,
          valueGold: treasure.valueGold,
          valueRangeGold: treasure.valueRangeGold,
          chance: treasure.chance,
          fishId: fish.id,
          fishName: fish.fishName,
          heroId: linkedHero?.id || null,
          heroName: linkedHero?.name || null
        });
        transaction.set(treasureRef, treasureData);
      }
    });

    transaction.set(logRef, {
      ...logData,
      ...cycleMeta,
      heroId: linkedHero?.id || null,
      heroName: linkedHero?.name || null,
      fishSelected: finalCatches,
      fishQuantityCaught: finalCatches.length,
      treasuresFound,
      fishAvailabilityChanges: availabilityChanges,
      timestamp: new Date().toISOString()
    });

    return { finalCatches, availabilityChanges, treasuresFound, logId: logRef.id };
  });
}
