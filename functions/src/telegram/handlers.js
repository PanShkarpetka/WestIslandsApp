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
  if (parts.length !== 6) {
    return null;
  }

  return {
    modifiers: [
      parseIntegerInput(parts[1], config.modifierLimits),
      parseIntegerInput(parts[2], config.modifierLimits),
      parseIntegerInput(parts[3], config.modifierLimits)
    ],
    useGuidance: parseGuidanceInput(parts[4]),
    baitType: parseBaitInput(parts[5])
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
      return 'Choose bait: basic, simple, advanced.';
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
    baitBonusRoll: result.baitBonusRoll,
    finalComputedSum: result.finalSum,
    dcChecksPerformed: result.dcChecks,
    successFailureResult: result.success,
    extraCheckResults: result.additionalCheckResults
  };

  let resolvedCatches = [];

  if (result.candidateCatches.length > 0) {
    const txResult = await updateFishAvailabilityTransaction(db, {
      catches: result.candidateCatches,
      logData: baseLog
    });
    resolvedCatches = txResult.finalCatches;
  } else {
    await createFishingLog(db, {
      ...baseLog,
      fishSelected: [],
      fishQuantityCaught: 0,
      fishAvailabilityChanges: []
    });
  }

  return { result, resolvedCatches };
}

export async function handleTelegramMessage({ db, payload }) {
  const { text, telegramUserId } = payload;
  const session = await getOrCreateUserSession(db, telegramUserId);
  const config = await getBotConfig(db);

  if ([COMMANDS.CANCEL, COMMANDS.RESET].includes(text.toLowerCase())) {
    await clearUserSession(db, telegramUserId);
    return 'Fishing flow canceled. Use /fish to start again.';
  }

  if (text.startsWith(COMMANDS.FISH)) {
    try {
      const singleLine = parseSingleLineFishCommand(text, config);
      if (singleLine) {
        const { result, resolvedCatches } = await processFishing({
          db,
          telegramUserId,
          normalizedInput: singleLine,
          commandUsed: '/fish inline',
          rawEnteredParams: text
        });
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
      'Fishing started. You can also send: /fish <mod1> <mod2> <mod3> <yes/no> <basic|simple|advanced>',
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
      nextPayload.baitType = parseBaitInput(text);
      const normalizedInput = {
        modifiers: nextPayload.modifiers,
        useGuidance: nextPayload.useGuidance,
        baitType: nextPayload.baitType
      };
      const { result, resolvedCatches } = await processFishing({
        db,
        telegramUserId,
        normalizedInput,
        commandUsed: '/fish',
        rawEnteredParams: nextPayload
      });

      await clearUserSession(db, telegramUserId);
      return formatFishingResult(result, resolvedCatches);
    }

    await clearUserSession(db, telegramUserId);
    return helpMessage();
  } catch (error) {
    return `Input error: ${error.message}`;
  }
}
