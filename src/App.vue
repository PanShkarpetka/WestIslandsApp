<template>
  <v-app>
    <MainLayout>
      <router-view />
    </MainLayout>
  </v-app>
</template>

<script setup>
import MainLayout from './layouts/MainLayout.vue';
</script>