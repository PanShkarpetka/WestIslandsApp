<template>
  <div class="login-page">
    <!-- Animated sea background -->
    <div class="sea-bg">
      <div class="wave wave-1" />
      <div class="wave wave-2" />
      <div class="wave wave-3" />
    </div>

    <div class="login-wrapper">
      <!-- Crest / emblem -->
      <div class="login-crest">
        <v-icon size="52" class="crest-icon">mdi-anchor</v-icon>
      </div>

      <div class="login-scroll">
        <h1 class="login-title">West Islands</h1>
        <p class="login-subtitle">Портал авантюриста</p>

        <div class="login-form">
          <v-text-field
            v-model="nickname"
            label="Ваш псевдонім"
            variant="underlined"
            :loading="checkingLeader"
            color="primary"
            class="login-field"
          />

          <v-text-field
            v-if="nickname === 'admin' || requireLeaderPassword"
            v-model="password"
            :label="nickname === 'admin' ? 'Пароль адміністратора' : 'Пароль лідера гільдії'"
            type="password"
            variant="underlined"
            color="primary"
            class="login-field"
          />

          <v-alert v-if="error" variant="tonal" color="error" density="compact" class="mt-3 login-alert">
            <v-icon start>mdi-skull-crossbones</v-icon>
            {{ error }}
          </v-alert>
        </div>

        <div class="login-actions">
          <v-btn
            class="login-btn"
            size="large"
            :loading="checkingLeader"
            @click="handleLogin"
          >
            <v-icon start>mdi-sail-boat</v-icon>
            На борт
          </v-btn>
        </div>
      </div>
    </div>
  </div>
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

  if (!nickname.value) return (error.value = 'Введіть ваш псевдонім');

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
/* ── Page shell ─────────────────────────────────────────────── */
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 80%, #0d1f2d 0%, #0a120a 50%, #1a1209 100%);
}

/* ── Animated sea ───────────────────────────────────────────── */
.sea-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.wave {
  position: absolute;
  bottom: 0;
  width: 200%;
  border-radius: 40%;
  opacity: 0.07;
  background: #3a6080;
  animation: swell linear infinite;
}

.wave-1 { height: 120px; animation-duration: 14s; left: -50%; }
.wave-2 { height: 90px;  animation-duration: 20s; left: -60%; animation-delay: -5s; opacity: 0.05; }
.wave-3 { height: 70px;  animation-duration: 26s; left: -40%; animation-delay: -10s; opacity: 0.04; }

@keyframes swell {
  0%   { transform: translateX(0)    rotate(0deg); }
  100% { transform: translateX(25%)  rotate(360deg); }
}

/* ── Login wrapper ──────────────────────────────────────────── */
.login-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 420px;
  padding: 16px;
}

/* ── Crest ──────────────────────────────────────────────────── */
.login-crest {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1f1508, #2c1e0f);
  border: 2px solid var(--wi-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: -40px;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 24px rgba(200, 150, 42, 0.35), 0 4px 16px rgba(0,0,0,0.6);
}

.crest-icon {
  color: var(--wi-gold) !important;
  filter: drop-shadow(0 0 6px rgba(200, 150, 42, 0.6));
}

/* ── Scroll card ────────────────────────────────────────────── */
.login-scroll {
  width: 100%;
  background: linear-gradient(160deg, #2c1e0f 0%, #1f1508 100%);
  border: 1px solid var(--wi-gold);
  border-radius: 8px;
  padding: 56px 32px 32px;
  box-shadow: 0 8px 48px rgba(0,0,0,0.7), 0 0 32px rgba(200, 150, 42, 0.1);
  text-align: center;
}

.login-title {
  font-family: var(--wi-font-heading);
  font-size: 2rem;
  font-weight: 900;
  color: var(--wi-gold);
  letter-spacing: 0.12em;
  text-shadow: 0 0 20px rgba(200, 150, 42, 0.5);
  margin: 0 0 4px;
}

.login-subtitle {
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  font-size: 0.95rem;
  margin: 0 0 28px;
  letter-spacing: 0.05em;
}

/* ── Form ───────────────────────────────────────────────────── */
.login-form {
  text-align: left;
}

.login-field {
  margin-bottom: 4px;
}

.login-alert {
  font-family: var(--wi-font-body) !important;
}

/* ── Actions ────────────────────────────────────────────────── */
.login-actions {
  margin-top: 28px;
  display: flex;
  justify-content: center;
}

.login-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.1em !important;
  padding: 0 40px !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.5) !important;
}

.login-btn:hover {
  background: linear-gradient(180deg, #e8b84b 0%, #b88030 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 20px rgba(200,150,42,0.4) !important;
}

/* ── Mobile ─────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .login-scroll {
    padding: 52px 20px 24px;
  }

  .login-title {
    font-size: 1.6rem;
  }
}
</style>
