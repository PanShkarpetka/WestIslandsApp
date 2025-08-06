<template>
  <div>
    <Navbar />
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup>
import Navbar from '../components/Navbar.vue';
</script>