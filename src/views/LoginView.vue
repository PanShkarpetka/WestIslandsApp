<template>
  <v-container class="fill-height d-flex justify-center align-center">
    <v-card class="pa-6" elevation="4" width="100%">
      <v-card-title class="text-h5">Вхід до системи</v-card-title>
      <v-card-text>
        <v-text-field v-model="nickname" label="Нікнейм" outlined dense />

        <v-text-field
          v-if="nickname === 'admin' || requireLeaderPassword"
          v-model="password"
          :label="nickname === 'admin' ? 'Пароль адміністратора' : 'Пароль лідера гільдії'"
          type="password"
          outlined
          dense
        />

        <v-alert v-if="error" type="error" dense class="mt-3">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn color="primary" :loading="checkingLeader" @click="handleLogin">Увійти</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/userStore';
import { getLeaderGuildAccess, isLeaderNickname, verifyAdminPassword } from '../services/authService.js';

const nickname = ref('');
const password = ref('');
const error = ref('');
const requireLeaderPassword = ref(false);
const checkingLeader = ref(false);

const router = useRouter();
const userStore = useUserStore();

let checkToken = 0;
watch(nickname, async (nextNickname) => {
  error.value = '';
  password.value = '';

  if (!nextNickname || nextNickname === 'admin') {
    requireLeaderPassword.value = false;
    return;
  }

  const currentToken = ++checkToken;
  checkingLeader.value = true;
  try {
    const isLeader = await isLeaderNickname(nextNickname);
    if (currentToken !== checkToken) return;
    requireLeaderPassword.value = isLeader;
  } catch {
    if (currentToken !== checkToken) return;
    requireLeaderPassword.value = false;
  } finally {
    if (currentToken === checkToken) checkingLeader.value = false;
  }
});

async function handleLogin() {
  error.value = '';

  if (!nickname.value) return (error.value = 'Введіть нікнейм');

  if (nickname.value === 'admin') {
    const isValid = await verifyAdminPassword(password.value);
    if (!isValid) return (error.value = 'Невірний пароль');
    userStore.login(nickname.value, true);
    return router.push('/ships');
  }

  const leaderAccess = await getLeaderGuildAccess(nickname.value, password.value);
  if (leaderAccess.requiresPassword && !password.value) {
    requireLeaderPassword.value = true;
    return (error.value = 'Для лідера гільдії потрібно ввести пароль');
  }

  if (leaderAccess.requiresPassword && !leaderAccess.accessibleGuildIds.length) {
    requireLeaderPassword.value = true;
    return (error.value = 'Невірний пароль лідера гільдії');
  }

  userStore.login(nickname.value, false, leaderAccess.accessibleGuildIds);
  router.push('/ships');
}
</script>

<style scoped>
.fill-height {
  height: 100vh;
}
</style>
