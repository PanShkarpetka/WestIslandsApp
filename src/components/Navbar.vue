<template>
  <v-app-bar app flat height="56">
    <!-- Mobile hamburger -->
    <v-btn icon class="d-sm-none" @click="drawer = !drawer" variant="text">
      <v-icon>mdi-menu</v-icon>
    </v-btn>

    <!-- Title -->
    <v-toolbar-title class="navbar-title">
      <v-icon class="mr-1" size="22">mdi-anchor</v-icon>
      West Islands
    </v-toolbar-title>

    <v-spacer />

    <!-- Desktop nav -->
    <template v-if="!isMobile">
      <v-btn v-for="item in navItems" :key="item.to" icon :to="item.to" variant="text" class="nav-icon-btn" :title="item.label">
        <v-icon>{{ item.icon }}</v-icon>
        <v-tooltip activator="parent" location="bottom">{{ item.label }}</v-tooltip>
      </v-btn>
      <v-btn v-if="userStore.isHeroUser" icon to="/account" variant="text" class="nav-icon-btn" title="Мій рахунок">
        <v-icon>mdi-account</v-icon>
        <v-tooltip activator="parent" location="bottom">Мій рахунок</v-tooltip>
      </v-btn>
      <v-btn v-if="userStore.isAdmin" icon to="/admin" variant="text" class="nav-icon-btn" title="Адмін">
        <v-icon>mdi-shield-account</v-icon>
        <v-tooltip activator="parent" location="bottom">Адмін</v-tooltip>
      </v-btn>

      <v-divider vertical class="mx-2 nav-divider" />

      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn icon variant="text" v-bind="props" class="nav-icon-btn">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list class="nav-menu-list">
          <v-list-item @click="userStore.isLoggedIn ? logout() : login()">
            <template #prepend>
              <v-icon>{{ userStore.isLoggedIn ? 'mdi-logout-variant' : 'mdi-login-variant' }}</v-icon>
            </template>
            <v-list-item-title>{{ userStore.isLoggedIn ? 'Покинути корабель' : 'На борт' }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>

  <!-- Mobile drawer -->
  <v-navigation-drawer v-model="drawer" temporary location="left" width="260">
    <div class="drawer-header">
      <v-icon size="28" class="mr-2">mdi-anchor</v-icon>
      <span class="drawer-title">West Islands</span>
    </div>

    <v-divider class="drawer-divider" />

    <v-list nav class="drawer-list">
      <v-list-item
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        @click="drawer = false"
        rounded="lg"
        class="drawer-item"
      >
        <template #prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ item.label }}</v-list-item-title>
      </v-list-item>

      <v-list-item
        v-if="userStore.isHeroUser"
        to="/account"
        @click="drawer = false"
        rounded="lg"
        class="drawer-item"
      >
        <template #prepend><v-icon>mdi-account</v-icon></template>
        <v-list-item-title>Мій рахунок</v-list-item-title>
      </v-list-item>

      <v-list-item
        v-if="userStore.isAdmin"
        to="/admin"
        @click="drawer = false"
        rounded="lg"
        class="drawer-item"
      >
        <template #prepend><v-icon>mdi-shield-account</v-icon></template>
        <v-list-item-title>Адмін</v-list-item-title>
      </v-list-item>
    </v-list>

    <template #append>
      <v-divider class="drawer-divider" />
      <v-list nav class="drawer-list">
        <v-list-item @click="userStore.isLoggedIn ? logout() : login()" rounded="lg" class="drawer-item">
          <template #prepend>
            <v-icon>{{ userStore.isLoggedIn ? 'mdi-logout-variant' : 'mdi-login-variant' }}</v-icon>
          </template>
          <v-list-item-title>{{ userStore.isLoggedIn ? 'Покинути корабель' : 'На борт' }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { useUserStore } from '../store/userStore';
import { useRouter } from 'vue-router';
import { ref, computed } from 'vue';
import { DEFAULT_ISLAND_ID } from '../config/constants.js';

const userStore = useUserStore();
const router = useRouter();
const drawer = ref(false);

const navItems = [
  { to: '/ships',                       icon: 'mdi-sail-boat',           label: 'Кораблі' },
  { to: `/islands/${DEFAULT_ISLAND_ID}`, icon: 'mdi-island',              label: 'Острови' },
  { to: '/donations',                   icon: 'mdi-hand-coin',           label: 'Збори' },
  { to: '/religion',                    icon: 'mdi-candle',              label: 'Релігія' },
  { to: '/travel',                      icon: 'mdi-compass-rose',        label: 'Подорожі' },
  { to: '/guilds',                      icon: 'mdi-shield-sword',        label: 'Гільдії' },
  { to: '/mage-guild',                  icon: 'mdi-magic-staff',         label: 'Магічні послуги' },
  { to: '/crafting',                    icon: 'mdi-anvil',               label: 'Крафтинг' },
  { to: '/fishing',                     icon: 'mdi-fish',                label: 'Рибалка' },
];

function logout() {
  drawer.value = false;
  userStore.logout();
  router.push('/');
}

function login() {
  drawer.value = false;
  router.push('/');
}

const isMobile = computed(() => window.innerWidth < 600);
</script>

<style scoped>
/* App bar */
:deep(.v-toolbar__content) {
  border-bottom: 2px solid var(--wi-border);
  background: linear-gradient(180deg, #110d04 0%, #1c1308 100%);
  padding: 0 8px;
}

.navbar-title {
  font-family: var(--wi-font-heading) !important;
  font-size: 1.15rem !important;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--wi-gold) !important;
  text-shadow: 0 0 14px rgba(200, 150, 42, 0.45);
  display: flex;
  align-items: center;
}

.nav-icon-btn {
  color: var(--wi-text-muted) !important;
  transition: color 0.2s, transform 0.15s;
}

.nav-icon-btn :deep(.v-btn__overlay) {
  background-color: var(--wi-gold) !important;
  opacity: 0;
}

.nav-icon-btn:hover {
  color: var(--wi-gold) !important;
  transform: translateY(-1px);
}

.nav-icon-btn:hover :deep(.v-btn__overlay) {
  opacity: 0.1 !important;
}

.nav-icon-btn.router-link-active {
  color: var(--wi-gold) !important;
}

.nav-divider {
  border-color: var(--wi-border) !important;
  opacity: 1;
}

/* Dropdown menu */
.nav-menu-list {
  background: #110d04 !important;
  border: 1px solid var(--wi-border) !important;
  min-width: 200px;
}

/* Mobile drawer */
.drawer-header {
  display: flex;
  align-items: center;
  padding: 20px 16px 16px;
  color: var(--wi-gold);
  font-family: var(--wi-font-heading);
  text-shadow: 0 0 10px rgba(200, 150, 42, 0.4);
}

.drawer-title {
  font-family: var(--wi-font-heading);
  font-size: 1.2rem;
  letter-spacing: 0.08em;
  color: var(--wi-gold);
}

.drawer-divider {
  border-color: var(--wi-border) !important;
  opacity: 1 !important;
}

.drawer-list {
  padding: 8px !important;
}

.drawer-item {
  color: var(--wi-text-muted) !important;
  margin-bottom: 2px;
  font-family: var(--wi-font-body) !important;
}

.drawer-item:hover {
  color: var(--wi-gold) !important;
  background: rgba(200, 150, 42, 0.08) !important;
}

.drawer-item.v-list-item--active {
  color: var(--wi-gold) !important;
  background: rgba(200, 150, 42, 0.12) !important;
}
</style>
