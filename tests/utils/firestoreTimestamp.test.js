import test from 'node:test';
import assert from 'node:assert/strict';
import { getFirestoreTimestampMillis } from '../../src/utils/firestoreTimestamp.js';

test('getFirestoreTimestampMillis supports Firestore Timestamp-like values', () => {
  assert.equal(getFirestoreTimestampMillis({ toMillis: () => 1234 }), 1234);
  assert.equal(getFirestoreTimestampMillis({ seconds: 2 }), 2000);
  assert.equal(getFirestoreTimestampMillis(42), 42);
  assert.equal(getFirestoreTimestampMillis(null), 0);
});
