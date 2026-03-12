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
