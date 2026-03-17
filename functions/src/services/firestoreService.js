import { ACTIVE_SESSION_TIMEOUT_MS, BOT_CONFIG_DOC, COLLECTIONS, DEFAULT_CONFIG, SESSION_STEPS } from '../config/constants.js';

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
  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const dailyAmount = Math.max(0, Number(data.fishAmountDaily ?? data.fishAmountAvailableNow ?? 0));
    batch.update(doc.ref, { fishAmountAvailableNow: dailyAmount });
  });

  await batch.commit();
  return snapshot.size;
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

export async function createFishingLog(db, logData) {
  const logRef = db.collection(COLLECTIONS.FISHING_LOGS).doc();
  await logRef.set({
    ...logData,
    timestamp: new Date().toISOString()
  });

  return logRef.id;
}

export async function updateFishAvailabilityTransaction(db, { catches, logData }) {
  return db.runTransaction(async (transaction) => {
    const fishDeltas = new Map();
    catches.forEach((fish) => {
      fishDeltas.set(fish.id, (fishDeltas.get(fish.id) || 0) + 1);
    });

    const finalCatches = [];
    const availabilityChanges = [];

    for (const [fishId, desiredCount] of fishDeltas.entries()) {
      const fishRef = db.collection(COLLECTIONS.FISHES).doc(fishId);
      const fishSnapshot = await transaction.get(fishRef);
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
    transaction.set(logRef, {
      ...logData,
      fishSelected: finalCatches,
      fishQuantityCaught: finalCatches.length,
      fishAvailabilityChanges: availabilityChanges,
      timestamp: new Date().toISOString()
    });

    return { finalCatches, availabilityChanges, logId: logRef.id };
  });
}
