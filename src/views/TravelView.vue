<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">Калькулятори подорожей</h1>
      </v-col>
    </v-row>
    <v-tabs v-model="activeTab" color="primary" align-tabs="start" class="mb-4">
      <v-tab value="ships">Кораблі</v-tab>
      <v-tab value="couriers">Кур’єри</v-tab>
    </v-tabs>
    <v-window v-model="activeTab">
      <v-window-item value="ships">
        <ShipCalculator />
      </v-window-item>
      <v-window-item value="couriers">
        <CourierCalculator />
      </v-window-item>
    </v-window>
  </v-container>

</template>

<script setup>
import { ref } from 'vue';
import CourierCalculator from '@/components/CourierCalculator.vue';
import ShipCalculator from '@/components/ShipCalculator.vue';

const activeTab = ref('ships');
</script>
