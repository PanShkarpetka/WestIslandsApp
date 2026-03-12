import { BAIT_TYPES } from '../config/constants.js';

const GUIDANCE_TRUE = new Set(['yes', 'y', 'true', '1']);
const GUIDANCE_FALSE = new Set(['no', 'n', 'false', '0']);

export function parseIntegerInput(value, { min, max }) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) {
    throw new Error('Please enter a valid integer.');
  }

  if (parsed < min || parsed > max) {
    throw new Error(`Modifier must be between ${min} and ${max}.`);
  }

  return parsed;
}

export function parseGuidanceInput(value) {
  console.log(`value: ${value}`)
  const normalized = String(value).trim().toLowerCase();
  if (GUIDANCE_TRUE.has(normalized)) {
    return true;
  }

  if (GUIDANCE_FALSE.has(normalized)) {
    return false;
  }

  throw new Error('Guidance must be yes or no.');
}

export function parseBaitInput(value) {
  const normalized = String(value).trim().toLowerCase();
  if (!Object.values(BAIT_TYPES).includes(normalized)) {
    throw new Error('Bait must be one of: basic, simple, advanced.');
  }

  return normalized;
}

export function validateTelegramUpdate(update) {
  if (!update || typeof update !== 'object') {
    throw new Error('Malformed Telegram payload.');
  }

  if (!Number.isInteger(update.update_id)) {
    throw new Error('Missing Telegram update_id.');
  }

  const message = update.message;
  if (!message || !message.chat || !message.from) {
    throw new Error('Missing required Telegram message fields.');
  }

  return {
    updateId: update.update_id,
    messageId: message.message_id,
    chatId: message.chat.id,
    telegramUserId: message.from.id,
    text: String(message.text || '').trim()
  };
}
