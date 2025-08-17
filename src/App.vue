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

<style>
/* global */
.custom-v-field-background .v-input__control {
  background: linear-gradient(90deg, rgba(255,255,255,.7), rgba(255,255,255,.01))
}
</style>
