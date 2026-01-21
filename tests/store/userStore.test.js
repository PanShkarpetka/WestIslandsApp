import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '../../src/store/userStore.js';

test('login sets nickname and admin flag', () => {
  setActivePinia(createPinia());
  const store = useUserStore();

  store.login('Captain', true);

  assert.equal(store.nickname, 'Captain');
  assert.equal(store.isAdmin, true);
  assert.equal(store.isLoggedIn, true);
});

test('logout clears nickname and admin flag', () => {
  setActivePinia(createPinia());
  const store = useUserStore();

  store.login('Captain', true);
  store.logout();

  assert.equal(store.nickname, '');
  assert.equal(store.isAdmin, false);
  assert.equal(store.isLoggedIn, false);
});
