<template>
  <div>
    <Navbar />
    <div class="content-shell">
      <GlobalCycleWidget />
      <main>
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import Navbar from '../components/Navbar.vue';
import GlobalCycleWidget from '../components/GlobalCycleWidget.vue';
</script>

<style scoped>
.content-shell {
  padding-top: 64px;
}
</style>
