<template>
  <v-app-bar app color="primary" dark>
    <v-btn icon class="d-sm-none" @click="drawer = !drawer">
      <v-icon>mdi-menu</v-icon>
    </v-btn>
    <v-toolbar-title>West Islands</v-toolbar-title>

    <v-spacer />

    <template v-if="!isMobile">
      <v-btn icon to="/ships">
        <v-icon>mdi-ferry</v-icon>
      </v-btn>
      <v-btn icon to="/islands">
        <v-icon>mdi-island</v-icon>
      </v-btn>
      <v-btn icon to="/donations">
        <v-icon>mdi-cash-multiple</v-icon>
      </v-btn>
      <v-btn v-if="userStore.isAdmin" icon to="/admin">
        <v-icon>mdi-shield-account</v-icon>
      </v-btn>

      <v-menu location="bottom">
        <template #activator="{ props }">
          <v-btn icon v-bind="props">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="userStore.isLoggedIn ? logout() : login()">
            <v-list-item-title>
              <v-icon start>{{ userStore.isLoggedIn ? 'mdi-logout' : 'mdi-login' }}</v-icon>
              {{ userStore.isLoggedIn ? 'Вийти' : 'Увійти' }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <v-navigation-drawer
        v-model="drawer"
        temporary
        location="left"
        elevation="2"
        width="240"
        style="height: 100vh"
    >
      <v-list nav dense>
        <v-list-item tag="router-link" :to="'/ships'" @click="drawer = false">
          <v-list-item-icon><v-icon>mdi-ferry</v-icon></v-list-item-icon>
          <v-list-item-title>Головна</v-list-item-title>
        </v-list-item>

        <v-list-item tag="router-link" :to="'/islands'" @click="drawer = false">
          <v-list-item-icon><v-icon>mdi-island</v-icon></v-list-item-icon>
          <v-list-item-title>Острови</v-list-item-title>
        </v-list-item>

        <v-list-item tag="router-link" :to="'/donations'" @click="drawer = false">
          <v-list-item-icon><v-icon>mdi-cash-multiple</v-icon></v-list-item-icon>
          <v-list-item-title>Збори</v-list-item-title>
        </v-list-item>

        <v-list-item
            v-if="userStore.isAdmin"
            tag="router-link"
            :to="'/admin'"
            @click="drawer = false"
        >
          <v-list-item-icon><v-icon>mdi-shield-account</v-icon></v-list-item-icon>
          <v-list-item-title>Адмін</v-list-item-title>
        </v-list-item>

        <v-list-item @click="userStore.isLoggedIn ? logout() : login()">
          <v-list-item-icon>
            <v-icon>{{ userStore.isLoggedIn ? 'mdi-logout' : 'mdi-login' }}</v-icon>
          </v-list-item-icon>
          <v-list-item-title>{{ userStore.isLoggedIn ? 'Вийти' : 'Увійти' }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </v-app-bar>
</template>

<script setup>
import { useUserStore } from '../store/userStore';
import { useRouter } from 'vue-router';
import { ref, computed } from 'vue';

const userStore = useUserStore();
const router = useRouter();
const drawer = ref(false);

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
</style>
