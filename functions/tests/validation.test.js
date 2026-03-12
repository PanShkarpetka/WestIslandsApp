import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBaitInput, parseGuidanceInput, validateTelegramUpdate } from '../src/utils/validation.js';

test('parseGuidanceInput accepts punctuation-wrapped no', () => {
  assert.equal(parseGuidanceInput('no.'), false);
  assert.equal(parseGuidanceInput('(yes)'), true);
});

test('parseBaitInput accepts punctuation-wrapped bait type', () => {
  assert.equal(parseBaitInput('simple:'), 'simple');
  assert.equal(parseBaitInput('advanced!'), 'advanced');
});

test('validateTelegramUpdate returns username and first name metadata', () => {
  const update = validateTelegramUpdate({
    update_id: 10,
    message: {
      message_id: 11,
      text: '/fish',
      chat: { id: 12 },
      from: { id: 13, username: 'angler', first_name: 'River' }
    }
  });

  assert.equal(update.telegramUsername, 'angler');
  assert.equal(update.telegramFirstName, 'River');
});


test('validateTelegramUpdate supports callback query payloads', () => {
  const update = validateTelegramUpdate({
    update_id: 20,
    callback_query: {
      id: 'abc123',
      data: '/fish',
      from: { id: 33, username: 'hook', first_name: 'Line' },
      message: {
        message_id: 21,
        chat: { id: 22 }
      }
    }
  });

  assert.equal(update.updateId, 20);
  assert.equal(update.messageId, 21);
  assert.equal(update.chatId, 22);
  assert.equal(update.telegramUserId, 33);
  assert.equal(update.telegramUsername, 'hook');
  assert.equal(update.telegramFirstName, 'Line');
  assert.equal(update.text, '/fish');
});
