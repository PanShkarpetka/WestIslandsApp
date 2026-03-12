import { COMMANDS, SESSION_STEPS } from '../config/constants.js';
import { resolveFishingAttempt } from '../services/fishingService.js';
import {
  clearUserSession,
  createFishingLog,
  getAvailableFishes,
  getBotConfig,
  getOrCreateUserSession,
  upsertUserSession,
  updateFishAvailabilityTransaction
} from '../services/firestoreService.js';
import { parseBaitInput, parseGuidanceInput, parseIntegerInput } from '../utils/validation.js';
import { formatFishingResult, helpMessage } from './replyHelpers.js';

function parseSingleLineFishCommand(text, config) {
  const parts = text.split(/\s+/);
  console.log(`parts: ${JSON.stringify({parts})}`);
  if (parts.length !== 6 && parts.length !== 7) {
    return null;
  }

  const shipToken = (parts[6] || '').trim().toLowerCase();
  if (parts.length === 7 && shipToken !== 'ship') {
    throw new Error('Optional final argument must be "ship".');
  }

  return {
    modifiers: [
      parseIntegerInput(parts[1], config.modifierLimits),
      parseIntegerInput(parts[2], config.modifierLimits),
      parseIntegerInput(parts[3], config.modifierLimits)
    ],
    useGuidance: parseGuidanceInput(parts[4]),
    baitType: parseBaitInput(parts[5]),
    useShip: parts.length === 7
  };
}

function parseBaitAndShipInput(text) {
  const parts = String(text).trim().toLowerCase().split(/\s+/);
  if (parts.length === 0 || parts.length > 2) {
    throw new Error('Enter bait as: basic|simple|advanced, optionally followed by "ship".');
  }

  if (parts.length === 2 && parts[1] !== 'ship') {
    throw new Error('Optional second value must be "ship".');
  }

  return {
    baitType: parseBaitInput(parts[0]),
    useShip: parts.length === 2
  };
}

function nextPrompt(step) {
  switch (step) {
    case SESSION_STEPS.MODIFIER_1:
      return 'Enter modifier for roll 1 (integer).';
    case SESSION_STEPS.MODIFIER_2:
      return 'Enter modifier for roll 2 (integer).';
    case SESSION_STEPS.MODIFIER_3:
      return 'Enter modifier for roll 3 (integer).';
    case SESSION_STEPS.GUIDANCE:
      return 'Use guidance? (yes/no)';
    case SESSION_STEPS.BAIT:
      return 'Choose bait: basic, simple, advanced. Optionally append "ship" (example: simple ship).';
    case SESSION_STEPS.ADDITIONAL_ROLL_CONFIRM:
      return 'Pass additional roll? (yes/no)';
    default:
      return helpMessage();
  }
}

async function processFishing({ db, telegramUserId, normalizedInput, commandUsed, rawEnteredParams }) {
  const [config, fishes] = await Promise.all([
    getBotConfig(db),
    getAvailableFishes(db)
  ]);

  const result = resolveFishingAttempt({ normalizedInput, config, fishes });

  const baseLog = {
    telegramUserId,
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
    return 'No pending additional roll. Use /fish to start again.';
  }

  if (!passed) {
    await createFishingLog(db, {
      ...pending.baseLog,
      successFailureResult: false,
      additionalRollPassed: false,
      fishSelected: [],
      fishQuantityCaught: 0,
      fishAvailabilityChanges: []
    });

    await clearUserSession(db, telegramUserId);
    return `Additional roll failed. ${pending.fishName} escaped.`;
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
  const session = await getOrCreateUserSession(db, telegramUserId);
  const config = await getBotConfig(db);

  if ([COMMANDS.CANCEL, COMMANDS.RESET].includes(text.toLowerCase())) {
    await clearUserSession(db, telegramUserId);
    return 'Fishing flow canceled. Use /fish to start again.';
  }

  if (session.step === SESSION_STEPS.ADDITIONAL_ROLL_CONFIRM) {
    try {
      const passed = parseGuidanceInput(text);
      return await resolveAdditionalRollAnswer({ db, telegramUserId, session, passed });
    } catch (error) {
      return `Input error: ${error.message}`;
    }
  }

  if (text.startsWith(COMMANDS.FISH)) {
    try {
      const singleLine = parseSingleLineFishCommand(text, config);
      console.log(`singleLine: ${JSON.stringify({singleLine})}`);

      if (singleLine) {
        const { result, resolvedCatches, pendingAdditionalRoll } = await processFishing({
          db,
          telegramUserId,
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
      }
    } catch (error) {
      return `Input error: ${error.message}`;
    }

    await upsertUserSession(db, telegramUserId, {
      step: SESSION_STEPS.MODIFIER_1,
      payload: {}
    });
    return [
      'Fishing started. You can also send: /fish <mod1> <mod2> <mod3> <yes/no> <basic|simple|advanced> [ship]',
      nextPrompt(SESSION_STEPS.MODIFIER_1)
    ].join('\n');
  }

  if (session.step === SESSION_STEPS.IDLE) {
    return helpMessage();
  }

  try {
    const nextPayload = { ...(session.payload || {}) };

    if (session.step === SESSION_STEPS.MODIFIER_1) {
      nextPayload.modifiers = [parseIntegerInput(text, config.modifierLimits)];
      await upsertUserSession(db, telegramUserId, { step: SESSION_STEPS.MODIFIER_2, payload: nextPayload });
      return nextPrompt(SESSION_STEPS.MODIFIER_2);
    }

    if (session.step === SESSION_STEPS.MODIFIER_2) {
      nextPayload.modifiers.push(parseIntegerInput(text, config.modifierLimits));
      await upsertUserSession(db, telegramUserId, { step: SESSION_STEPS.MODIFIER_3, payload: nextPayload });
      return nextPrompt(SESSION_STEPS.MODIFIER_3);
    }

    if (session.step === SESSION_STEPS.MODIFIER_3) {
      nextPayload.modifiers.push(parseIntegerInput(text, config.modifierLimits));
      await upsertUserSession(db, telegramUserId, { step: SESSION_STEPS.GUIDANCE, payload: nextPayload });
      return nextPrompt(SESSION_STEPS.GUIDANCE);
    }

    if (session.step === SESSION_STEPS.GUIDANCE) {
      nextPayload.useGuidance = parseGuidanceInput(text);
      await upsertUserSession(db, telegramUserId, { step: SESSION_STEPS.BAIT, payload: nextPayload });
      return nextPrompt(SESSION_STEPS.BAIT);
    }

    if (session.step === SESSION_STEPS.BAIT) {
      const baitInput = parseBaitAndShipInput(text);
      nextPayload.baitType = baitInput.baitType;
      nextPayload.useShip = baitInput.useShip;

      const normalizedInput = {
        modifiers: nextPayload.modifiers,
        useGuidance: nextPayload.useGuidance,
        baitType: nextPayload.baitType,
        useShip: nextPayload.useShip
      };
      const { result, resolvedCatches, pendingAdditionalRoll } = await processFishing({
        db,
        telegramUserId,
        normalizedInput,
        commandUsed: '/fish',
        rawEnteredParams: nextPayload
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
    }

    await clearUserSession(db, telegramUserId);
    return helpMessage();
  } catch (error) {
    return `Input error: ${error.message}`;
  }
}
