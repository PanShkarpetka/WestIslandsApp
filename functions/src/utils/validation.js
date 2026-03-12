import { BAIT_TYPES } from '../config/constants.js';

const GUIDANCE_TRUE = new Set(['yes', 'y', 'true', '1']);
const GUIDANCE_FALSE = new Set(['no', 'n', 'false', '0']);

function normalizeToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

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
  const normalized = normalizeToken(value);
  if (GUIDANCE_TRUE.has(normalized)) {
    return true;
  }

  if (GUIDANCE_FALSE.has(normalized)) {
    return false;
  }

  throw new Error('Input param must be yes or no.');
}

export function parseBaitInput(value) {
  const normalized = normalizeToken(value);
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

  const message =
    update.message ||
    update.edited_message ||
    update.channel_post ||
    update.callback_query?.message;

  const actor = message?.from || update.callback_query?.from;

  if (!message || !message.chat || !actor) {
    throw new Error('Missing required Telegram message fields.');
  }

  return {
    updateId: update.update_id,
    messageId: message.message_id,
    chatId: message.chat.id,
    messageThreadId: Number.isInteger(message.message_thread_id) ? message.message_thread_id : null,
    telegramUserId: actor.id,
    telegramUsername: actor.username || null,
    telegramFirstName: actor.first_name || null,
    text: String(message.text || update.callback_query?.data || '').trim()
  };
}
