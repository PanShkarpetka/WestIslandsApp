import { COMMANDS, SESSION_STEPS } from '../config/constants.js';
import { resolveFishingAttempt } from '../services/fishingService.js';
import {
  clearUserSession,
  createFishingLog,
  getAllFishingLogs,
  getAvailableFishes,
  getBotConfig,
  getFishingLogsForDate,
  getOrCreateUserSession,
  resetFishAvailabilityToDaily,
  upsertUserSession,
  updateFishAvailabilityTransaction
} from '../services/firestoreService.js';
import { parseBaitInput, parseGuidanceInput, parseIntegerInput } from '../utils/validation.js';
import { formatFishingResult, helpMessage } from './replyHelpers.js';

function normalizeShipToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function parseSingleLineFishCommand(text, config) {
  const parts = text.split(/\s+/);
  if (parts.length < 4 || parts.length > 7) {
    throw new Error('Використайте один рядок: /fish <mod1> <mod2> <mod3> [yes/no] [basic|simple|advanced] [ship].');
  }

  const extraArgs = parts.slice(4);
  let useGuidance = false;
  let baitType = 'basic';
  let useShip = false;
  let guidanceProvided = false;
  let baitProvided = false;

  for (const arg of extraArgs) {
    const shipToken = normalizeShipToken(arg);
    if (shipToken === 'ship') {
      if (useShip) {
        throw new Error('Прапорець ship можна вказати лише один раз.');
      }
      useShip = true;
      continue;
    }

    if (!guidanceProvided) {
      try {
        useGuidance = parseGuidanceInput(arg);
        guidanceProvided = true;
        continue;
      } catch {
        // no-op: token is not guidance
      }
    }

    if (!baitProvided) {
      try {
        baitType = parseBaitInput(arg);
        baitProvided = true;
        continue;
      } catch {
        // no-op: token is not bait
      }
    }

    throw new Error(`Невідомий аргумент: ${arg}. Формат: /fish <mod1> <mod2> <mod3> [yes/no] [basic|simple|advanced] [ship].`);
  }

  return {
    modifiers: [
      parseIntegerInput(parts[1], config.modifierLimits),
      parseIntegerInput(parts[2], config.modifierLimits),
      parseIntegerInput(parts[3], config.modifierLimits)
    ],
    useGuidance,
    baitType,
    useShip
  };
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

function getFishPriceByCode(fish, code) {
  const value = fish?.fishValueSilver;
  if (typeof value === 'number') {
    return Number(value);
  }

  const low = Number(value?.low ?? Number.NaN);
  const high = Number(value?.high ?? Number.NaN);
  const maxCode = getFishCodeRange(fish).max;
  if (code === maxCode && Number.isFinite(high)) {
    return high;
  }

  return Number.isFinite(low) ? low : high;
}

function parseFishCodesInput(text, command) {
  const rest = text.slice(command.length).trim();
  if (!rest) {
    throw new Error('Provide at least one fish code: /fish_price <code> [more codes]');
  }

  const tokens = rest.split(/[\s,]+/).filter(Boolean);
  const codes = tokens.map((token) => {
    const parsed = Number.parseInt(token, 10);
    if (!Number.isInteger(parsed)) {
      throw new Error(`Invalid fish code: ${token}`);
    }

    return parsed;
  });

  return codes;
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function usernameFromPayload(payload) {
  return payload.telegramUsername || payload.telegramFirstName || String(payload.telegramUserId);
}

function buildFishPriceReport(fishes, codes) {
  const lines = ['💰 <b>Fish prices</b>'];
  let total = 0;

  for (const code of codes) {
    const fish = fishes.find((item) => {
      const range = getFishCodeRange(item);
      return Number.isFinite(range.min) && Number.isFinite(range.max) && range.min <= code && code <= range.max;
    });

    if (!fish) {
      lines.push(`• #${code}: not found`);
      continue;
    }

    const price = Number(getFishPriceByCode(fish, code) || 0);
    total += price;
    lines.push(`• #${code}: <b>${htmlEscape(fish.fishName)}</b> — ${price} silver`);
  }

  lines.push(`Σ Total: <b>${total}</b> silver`);
  return lines.join('\n');
}

function extractSuccessfulCatchRows(logs) {
  const rows = [];
  logs.forEach((log) => {
    const selected = Array.isArray(log.fishSelected) ? log.fishSelected : [];
    if (selected.length === 0 || !log.successFailureResult) {
      return;
    }

    const resultCode = Number(log.effectiveRollUsed ?? log.finalComputedSum);
    const user = log.telegramUsername || log.telegramUserNickname || String(log.telegramUserId || 'unknown');
    selected.forEach((fish) => {
      rows.push({
        user,
        fishName: fish.fishName,
        resultCode,
        price: Number(getFishPriceByCode(fish, resultCode) || 0)
      });
    });
  });
  return rows;
}

async function processFishing({ db, telegramUserId, telegramUsername, normalizedInput, commandUsed, rawEnteredParams }) {
  const [config, fishes] = await Promise.all([
    getBotConfig(db),
    getAvailableFishes(db)
  ]);

  const result = resolveFishingAttempt({ normalizedInput, config, fishes });

  const baseLog = {
    telegramUserId,
    telegramUsername,
    command: commandUsed,
    rawEnteredParams,
    normalizedParams: normalizedInput,
    d20RawRolls: result.rawRolls,
    modifiers: normalizedInput.modifiers,
    finalRollValues: result.finalRolls,
    guidanceData: result.guidance,
    baitUsed: normalizedInput.baitType,
    usedShip: normalizedInput.useShip,
    baitBonusRoll: result.baitBonusRoll,
    shipBonusRoll: result.shipBonusRoll,
    preCapComputedSum: result.computedSum,
    finalComputedSum: result.finalSum,
    eachRollDc: result.eachRollDc,
    passedEachRollDc: result.passedEachRollDc,
    failedRollIndexes: result.failedRollIndexes,
    effectiveRollUsed: result.effectiveRollUsed,
    successFailureResult: result.success
  };

  if (!result.selectedFish) {
    await createFishingLog(db, {
      ...baseLog,
      fishSelected: [],
      fishQuantityCaught: 0,
      fishAvailabilityChanges: []
    });

    return {
      result,
      resolvedCatches: [],
      pendingAdditionalRoll: null
    };
  }

  const requiredRolls = Array.isArray(result.selectedFish.fishAdditionalRollsRequiredForSuccessfulCatch)
    ? result.selectedFish.fishAdditionalRollsRequiredForSuccessfulCatch
    : [];

  if (requiredRolls.length > 0) {
    return {
      result,
      resolvedCatches: [],
      pendingAdditionalRoll: {
        fishId: result.selectedFish.id,
        fishName: result.selectedFish.fishName,
        requirements: requiredRolls,
        baseLog,
        selectedFish: result.selectedFish
      }
    };
  }

  const txResult = await updateFishAvailabilityTransaction(db, {
    catches: [result.selectedFish],
    logData: baseLog
  });

  return {
    result,
    resolvedCatches: txResult.finalCatches,
    pendingAdditionalRoll: null
  };
}

async function resolveAdditionalRollAnswer({ db, telegramUserId, session, passed }) {
  const pending = session.payload?.pendingAdditionalRoll;
  if (!pending?.selectedFish) {
    await clearUserSession(db, telegramUserId);
    return 'No pending additional roll. Use /fish ... to start again.';
  }

  if (!passed) {
    const catchesOnFailure = pending.requirements?.[0]?.catchEvenIfFailed === true;
    if (catchesOnFailure) {
      const txResult = await updateFishAvailabilityTransaction(db, {
        catches: [pending.selectedFish],
        logData: {
          ...pending.baseLog,
          additionalRollPassed: false,
          additionalRollCatchEvenIfFailed: true,
          successFailureResult: true
        }
      });

      await clearUserSession(db, telegramUserId);
      return formatFishingResult(session.payload.result, txResult.finalCatches, {
        additionalRollPassed: false,
        additionalRollCaughtDespiteFailure: true
      });
    }

    await createFishingLog(db, {
      ...pending.baseLog,
      successFailureResult: false,
      additionalRollPassed: false,
      fishSelected: [],
      fishQuantityCaught: 0,
      fishAvailabilityChanges: []
    });

    await clearUserSession(db, telegramUserId);
    return `Перевірку провалено. ${pending.fishName} втекла.`;
  }

  const txResult = await updateFishAvailabilityTransaction(db, {
    catches: [pending.selectedFish],
    logData: {
      ...pending.baseLog,
      additionalRollPassed: true
    }
  });

  await clearUserSession(db, telegramUserId);
  return formatFishingResult(session.payload.result, txResult.finalCatches, { additionalRollPassed: true });
}

export async function handleTelegramMessage({ db, payload }) {
  const { text, telegramUserId } = payload;
  const normalizedText = text.toLowerCase();
  const session = await getOrCreateUserSession(db, telegramUserId);
  const config = await getBotConfig(db);

  const isAdminCommand = normalizedText.startsWith('/admin_');
  if (session.staleSessionCleared && !isAdminCommand && ![
    COMMANDS.FISH,
    COMMANDS.CANCEL,
    COMMANDS.RESET,
    COMMANDS.HELP,
  ].some((command) => normalizedText.startsWith(command))) {
    return 'Fishing flow auto-canceled due to 30 seconds of inactivity. Use /fish to start again.';
  }

  if (normalizedText === COMMANDS.RESET_FISH_AVAILABILITY) {
    const resetCount = await resetFishAvailabilityToDaily(db);
    return `Reset availability to daily defaults for ${resetCount} fishes.`;
  }

  if (normalizedText === COMMANDS.LIST_AVAILABLE_FISHES_TODAY) {
    const fishes = await getAvailableFishes(db);
    const available = fishes
      .filter((fish) => Number(fish.fishAmountAvailableNow || 0) > 0)
      .sort((a, b) => getFishCodeRange(a).min - getFishCodeRange(b).min);

    if (available.length === 0) {
      return 'No fishes are available today.';
    }

    return [
      '🐟 <b>Available fishes today</b>',
      ...available.map((fish) => {
        const range = getFishCodeRange(fish);
        const codeLabel = range.min === range.max ? String(range.min) : `${range.min}-${range.max}`;
        return `• #${codeLabel} ${htmlEscape(fish.fishName)} — available: ${Number(fish.fishAmountAvailableNow || 0)}`;
      })
    ].join('\n');
  }

  if (normalizedText.startsWith(COMMANDS.GET_FISH_PRICE)) {
    const fishes = await getAvailableFishes(db);
    const codes = parseFishCodesInput(text, COMMANDS.GET_FISH_PRICE);
    return buildFishPriceReport(fishes, codes);
  }

  if (normalizedText === COMMANDS.LIST_SUCCESSFUL_CATCHES_TODAY) {
    const logs = await getFishingLogsForDate(db);
    const catches = extractSuccessfulCatchRows(logs);
    if (catches.length === 0) {
      return 'No successful catches today.';
    }

    return [
      '📘 <b>Successful catches today</b>',
      ...catches.map((row) => `• ${htmlEscape(row.user)}: ${htmlEscape(row.fishName)}, code ${row.resultCode}, price ${row.price} silver`)
    ].join('\n');
  }

  if (normalizedText === COMMANDS.SUM_SUCCESSFUL_CATCHES_BY_USER_ALL_TIME) {
    const logs = await getAllFishingLogs(db);
    const catches = extractSuccessfulCatchRows(logs);
    if (catches.length === 0) {
      return 'No successful catches yet.';
    }

    const byUser = catches.reduce((acc, row) => {
      acc.set(row.user, (acc.get(row.user) || 0) + row.price);
      return acc;
    }, new Map());

    return [
      '🧾 <b>Catch value totals by user (all time)</b>',
      ...[...byUser.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([user, total]) => `• ${htmlEscape(user)}: <b>${total}</b> silver`)
    ].join('\n');
  }

  if ([COMMANDS.CANCEL, COMMANDS.RESET].includes(normalizedText)) {
    await clearUserSession(db, telegramUserId);
    return 'Fishing flow canceled. Use /fish to start again.';
  }

  if (normalizedText === COMMANDS.HELP) {
    return helpMessage();
  }

  if (session.step === SESSION_STEPS.ADDITIONAL_ROLL_CONFIRM) {
    try {
      const passed = parseGuidanceInput(text);
      return await resolveAdditionalRollAnswer({ db, telegramUserId, session, passed });
    } catch (error) {
      return `Не правильні дані. Помилка: ${error.message}`;
    }
  }

  if (normalizedText.startsWith(COMMANDS.FISH)) {
    try {
      const singleLine = parseSingleLineFishCommand(text, config);
      const { result, resolvedCatches, pendingAdditionalRoll } = await processFishing({
        db,
        telegramUserId,
        telegramUsername: usernameFromPayload(payload),
        normalizedInput: singleLine,
        commandUsed: '/fish inline',
        rawEnteredParams: text
      });

      if (pendingAdditionalRoll) {
        await upsertUserSession(db, telegramUserId, {
          step: SESSION_STEPS.ADDITIONAL_ROLL_CONFIRM,
          payload: { pendingAdditionalRoll, result }
        });
        return formatFishingResult(result, [], { pendingAdditionalRoll });
      }

      await clearUserSession(db, telegramUserId);
      return formatFishingResult(result, resolvedCatches);
    } catch (error) {
      return `Помилка введення : ${error.message}`;
    }
  }

  if (session.step === SESSION_STEPS.IDLE) {
    return helpMessage();
  }

  await clearUserSession(db, telegramUserId);
  return helpMessage();
}
