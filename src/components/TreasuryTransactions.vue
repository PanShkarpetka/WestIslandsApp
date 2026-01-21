<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-2">
      <div>
        <h2 class="text-lg font-semibold">Транзакції скарбниці</h2>
      </div>
      <v-btn size="small" variant="text" @click="reload" :loading="loading">Оновити</v-btn>
    </div>

    <v-table density="comfortable">
      <thead>
      <tr>
        <th>Коли</th>
        <th>Хто</th>
        <th>Тип</th>
        <th class="text-right">Сума</th>
        <th>Коментар</th>
        <th class="text-right">Баланс після</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="t in tx" :key="t.id">
        <td>{{ formatDate(t.createdAt) }}</td>
        <td>{{ t.nickname || t.userId }}</td>
        <td>
          <v-chip :color="t.type === 'deposit' ? 'green' : 'red'" size="small" variant="flat">
            {{ t.type === 'deposit' ? 'Внесок' : 'Зняття' }}
          </v-chip>
        </td>
        <td class="text-right">
            <span :class="t.amount >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ t.amount >= 0 ? '+' : '' }}{{ t.amount }}
            </span>
        </td>
        <td class="max-w-[360px] truncate" :title="t.comment">{{ t.comment }}</td>
        <td class="text-right">{{ t.balanceAfter }}</td>
      </tr>
      </tbody>
    </v-table>

    <div class="mt-3 flex justify-center">
      <v-btn variant="text" @click="loadMore" :disabled="!hasMore || loading" :loading="loading">
        Завантажити ще
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useTreasuryStore } from "@/store/treasuryStore";
import { Timestamp } from "firebase/firestore";

const treasury = useTreasuryStore();
const tx = computed(() => treasury.tx);
const loading = computed(() => treasury.loading);
const hasMore = computed(() => !!treasury._lastDoc);
const totalIncome = computed(() => treasury.totalIncome);
const totalOutcome = computed(() => treasury.totalOutcome);

function formatDate(v) {
  if (!v) return "—";
  const d = v instanceof Timestamp ? v.toDate() : v;
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function reload() {
  treasury.loadFirstPage();
}
function loadMore() {
  treasury.loadNextPage();
}

onMounted(() => treasury.loadFirstPage());
</script>
