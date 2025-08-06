<template>
  <div class="login">
    <h2>Вхід</h2>
    <input v-model="nickname" placeholder="Введіть нікнейм" />

    <div v-if="nickname === 'admin'">
      <input v-model="password" type="password" placeholder="Пароль адміністратора" />
    </div>

    <button @click="handleLogin">Увійти</button>
    <p v-if="error" style="color:red">{{ error }}</p>
  </div>
</template>


<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../store/userStore';
import { verifyAdminPassword } from '../services/authService';

const nickname = ref('');
const password = ref('');
const error = ref('');

const router = useRouter();
const userStore = useUserStore();

async function handleLogin() {
  if (!nickname.value) return (error.value = 'Введіть нікнейм');

  if (nickname.value === 'admin') {
    const isValid = await verifyAdminPassword(password.value);
    if (!isValid) return (error.value = 'Невірний пароль');
    userStore.login(nickname.value, true);
  } else {
    userStore.login(nickname.value, false);
  }

  router.push('/home');
}
</script>

<style scoped>
.login {
  display: flex;
  flex-direction: column;
  max-width: 300px;
  margin: 100px auto;
  gap: 1rem;
}
</style>
