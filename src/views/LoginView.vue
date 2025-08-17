<template>
  <v-container class="fill-height d-flex justify-center align-center">
    <v-card class="pa-6" elevation="4" width="100%">
      <v-card-title class="text-h5">Вхід до системи</v-card-title>
      <v-card-text>
        <v-text-field v-model="nickname" label="Нікнейм" outlined dense />

        <v-text-field
            v-if="nickname === 'admin'"
            v-model="password"
            label="Пароль адміністратора"
            type="password"
            outlined
            dense
        />

        <v-alert v-if="error" type="error" dense class="mt-3">{{ error }}</v-alert>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn color="primary" @click="handleLogin">Увійти</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/userStore';
import { verifyAdminPassword } from '../services/authService.js';

const nickname = ref('');
const password = ref('');
const error = ref('');

const router = useRouter();
const userStore = useUserStore();

async function handleLogin() {
  error.value = '';

  if (!nickname.value) return (error.value = 'Введіть нікнейм');

  if (nickname.value === 'admin') {
    const isValid = await verifyAdminPassword(password.value);
    if (!isValid) return (error.value = 'Невірний пароль');
    userStore.login(nickname.value, true);
  } else {
    userStore.login(nickname.value, false);
  }

  router.push('/ships');
}
</script>

<style scoped>
.fill-height {
  height: 100vh;
}
</style>