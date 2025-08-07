<template>
  <v-container>
    <v-card class="pa-6" elevation="2">
      <v-card-title class="text-h5">Адмін панель</v-card-title>
      <v-card-subtitle>Тут доступно лише адміну</v-card-subtitle>

      <v-divider class="my-4" />

      <v-card-title class="text-h6">Лог подій</v-card-title>
      <v-data-table
          :headers="headers"
          :items="logEntries"
          :items-per-page="10"
          class="elevation-1"
          density="compact"
      >
        <template #item.timestamp="{ item }">
          {{ formatTimestamp(item.timestamp) }}
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

const logEntries = ref([]);

const headers = [
  { title: 'Час', key: 'timestamp' },
  { title: 'Користувач', key: 'user' },
  { title: 'Дія', key: 'action' },
];

onMounted(async () => {
  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  logEntries.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
});

function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) return '-';
  const date = timestamp.toDate();
  return date.toLocaleString('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
</script>

<style scoped>
</style>
