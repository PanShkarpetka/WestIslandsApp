import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/store/userStore.js';

test('login sets nickname and admin flag', () => {
  setActivePinia(createPinia());
  const store = useUserStore();

  store.login('Captain', true, ['guild-a']);

  assert.equal(store.nickname, 'Captain');
  assert.equal(store.isAdmin, true);
  assert.equal(store.isLoggedIn, true);
  assert.deepEqual(store.leaderGuildAccessIds, ['guild-a']);
});

test('canAccessGuild returns true for admin and allowed guild ids', () => {
  setActivePinia(createPinia());
  const store = useUserStore();

  store.login('Captain', false, ['guild-a']);

  assert.equal(store.canAccessGuild('guild-a'), true);
  assert.equal(store.canAccessGuild('guild-b'), false);
});

test('logout clears nickname and admin flag', () => {
  setActivePinia(createPinia());
  const store = useUserStore();

  store.login('Captain', true, ['guild-a']);
  store.logout();

  assert.equal(store.nickname, '');
  assert.equal(store.isAdmin, false);
  assert.equal(store.isLoggedIn, false);
  assert.deepEqual(store.leaderGuildAccessIds, []);
});
