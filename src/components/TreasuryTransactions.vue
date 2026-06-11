<template>
  <div class="ledger">
    <div class="ledger-header">
      <div class="ledger-title">
        <v-icon class="mr-2" size="18">mdi-scroll-text</v-icon>
        Книга транзакцій
      </div>
      <v-btn size="small" variant="text" class="reload-btn" @click="reload" :loading="loading">
        <v-icon start size="14">mdi-refresh</v-icon>
        Оновити
      </v-btn>
    </div>

    <div class="ledger-table-wrap">
      <v-table class="ledger-table" density="comfortable">
        <thead>
          <tr>
            <th>Коли</th>
            <th>Хто</th>
            <th>Тип</th>
            <th class="text-right">Сума</th>
            <th>Коментар</th>
            <th class="text-right">Баланс</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tx" :key="t.id" class="ledger-row">
            <td class="ledger-date">{{ formatDate(t.createdAt) }}</td>
            <td class="ledger-who">{{ t.nickname || t.userId }}</td>
            <td>
              <span class="tx-type" :class="txTypeMeta(t).className">
                <v-icon size="13" class="mr-1">{{ txTypeMeta(t).icon }}</v-icon>
                {{ txTypeMeta(t).label }}
              </span>
            </td>
            <td class="text-right">
              <span :class="t.amount >= 0 ? 'amount-positive' : 'amount-negative'">
                {{ t.amount >= 0 ? '+' : '' }}{{ formatAmount(t.amount) }}
              </span>
            </td>
            <td class="ledger-comment">
              <v-tooltip location="top" max-width="320">
                <template #activator="{ props }">
                  <span v-bind="props" class="comment-truncated">{{ t.comment }}</span>
                </template>
                {{ t.comment }}
              </v-tooltip>
            </td>
            <td class="text-right ledger-balance-after">{{ formatAmount(t.balanceAfter) }}</td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <div class="ledger-footer">
      <v-btn variant="text" class="load-more-btn" @click="loadMore" :disabled="!hasMore || loading" :loading="loading">
        <v-icon start size="14">mdi-chevron-down</v-icon>
        {{ hasMore ? 'Завантажити ще' : 'Всі записи завантажено' }}
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue"
import { useTreasuryStore } from "@/store/treasuryStore"
import { Timestamp } from "firebase/firestore"
import { formatAmount } from "@/utils/formatters"
import { getTreasuryTransactionTypeMeta } from "@/utils/treasuryTransactions"

const treasury = useTreasuryStore()
const tx = computed(() => treasury.tx)
const loading = computed(() => treasury.loading)
const hasMore = computed(() => treasury.hasMore)

function formatDate(v) {
  if (!v) return "—"
  const d = v instanceof Timestamp ? v.toDate() : v
  return new Intl.DateTimeFormat("uk-UA", { dateStyle: "short", timeStyle: "short" }).format(d)
}

function reload() { treasury.loadFirstPage() }
function loadMore() { treasury.loadNextPage() }
function txTypeMeta(transaction) { return getTreasuryTransactionTypeMeta(transaction) }

onMounted(() => treasury.loadFirstPage())
</script>

<style scoped>
/* ── Ledger shell ───────────────────────────────────────────── */
.ledger {
  background: var(--wi-surface);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  overflow: hidden;
}

.ledger-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--wi-border);
  background: linear-gradient(180deg, #1f1508, #2c1e0f);
}

.ledger-title {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  color: var(--wi-gold);
}

.reload-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.05em !important;
}

/* ── Table ──────────────────────────────────────────────────── */
.ledger-table-wrap {
  overflow-x: auto;
}

.ledger-table {
  background: transparent !important;
}

.ledger-table :deep(thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase;
  color: var(--wi-text-muted) !important;
  border-bottom: 1px solid var(--wi-border) !important;
  background: #1a1108 !important;
  white-space: nowrap;
  padding: 10px 14px !important;
}

.ledger-row td {
  font-family: var(--wi-font-body);
  font-size: 0.85rem;
  color: var(--wi-text);
  border-bottom: 1px solid rgba(90, 62, 32, 0.4) !important;
  padding: 10px 14px !important;
  vertical-align: middle;
}

.ledger-row:nth-child(even) td {
  background: rgba(255,255,255,0.02);
}

.ledger-row:hover td {
  background: rgba(200,150,42,0.05) !important;
}

.ledger-date {
  white-space: nowrap;
  color: var(--wi-text-muted) !important;
  font-size: 0.78rem !important;
}

.ledger-who {
  font-style: italic;
  color: var(--wi-text-muted) !important;
}

/* Transaction type badge */
.tx-type {
  display: inline-flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
}

.tx-deposit {
  color: var(--wi-success);
  background: rgba(90, 138, 60, 0.15);
  border: 1px solid rgba(90, 138, 60, 0.3);
}

.tx-withdraw {
  color: var(--wi-danger);
  background: rgba(139, 42, 42, 0.15);
  border: 1px solid rgba(139, 42, 42, 0.3);
}

/* Amounts */
.amount-positive { color: var(--wi-success); font-weight: bold; }
.amount-negative { color: var(--wi-danger);  font-weight: bold; }

.ledger-comment {
  max-width: 260px;
  color: var(--wi-text-muted) !important;
  font-style: italic;
}

.comment-truncated {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: default;
}

.ledger-balance-after {
  font-family: var(--wi-font-number);
  font-size: 0.8rem;
  color: var(--wi-gold) !important;
  white-space: nowrap;
}

/* ── Footer ─────────────────────────────────────────────────── */
.ledger-footer {
  display: flex;
  justify-content: center;
  padding: 10px;
  border-top: 1px solid var(--wi-border);
  background: #1a1108;
}

.load-more-btn {
  color: var(--wi-text-muted) !important;
  font-family: var(--wi-font-heading) !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.07em !important;
}
</style>
