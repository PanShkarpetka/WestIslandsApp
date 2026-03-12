import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBaitInput, parseGuidanceInput } from '../src/utils/validation.js';

test('parseGuidanceInput accepts punctuation-wrapped no', () => {
  assert.equal(parseGuidanceInput('no.'), false);
  assert.equal(parseGuidanceInput('(yes)'), true);
});

test('parseBaitInput accepts punctuation-wrapped bait type', () => {
  assert.equal(parseBaitInput('simple:'), 'simple');
  assert.equal(parseBaitInput('advanced!'), 'advanced');
});
