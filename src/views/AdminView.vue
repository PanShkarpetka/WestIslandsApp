<template>
  <v-container class="admin-page pb-8">
    <v-card class="admin-card pa-6" elevation="0">
      <v-card-title class="admin-title text-h5">Адмін панель</v-card-title>

      <v-divider class="my-4" />

      <v-card-title class="text-h6">Керування циклами</v-card-title>
      <v-alert v-if="cycleError" type="error" variant="tonal" class="mb-4">{{ cycleError }}</v-alert>
      <v-alert v-if="cycleSuccess" type="success" variant="tonal" class="mb-4">{{ cycleSuccess }}</v-alert>
      <v-form class="mb-6">
        <FaerunDatePicker
          v-model="cycleForm.startedDate"
          label="Початок нового циклу"
          placeholder="Оберіть дату початку"
        />
        <v-text-field
          v-model.number="cycleDaysInput"
          label="Або вкажіть кількість днів циклу"
          type="number"
          min="1"
          density="comfortable"
          hide-details="auto"
          class="my-3"
        />
        <v-text-field
          :model-value="cycleDurationLabel"
          label="Тривалість попереднього циклу"
          density="comfortable"
          hide-details="auto"
          readonly
          class="mb-3"
        />
        <v-textarea
          v-model="cycleForm.notes"
          label="Нотатки до дії"
          auto-grow
          rows="2"
          density="comfortable"
          hide-details="auto"
          class="mb-3"
        />
        <v-btn color="primary" prepend-icon="mdi-play-circle-outline" :loading="cycleSaving" @click="createCycle">
          Почати новий цикл
        </v-btn>
        <v-btn
          color="secondary"
          prepend-icon="mdi-telegram"
          :loading="religionSummaryLoading"
          :disabled="!previousCompletedCycle"
          class="ml-3"
          @click="generateReligionCycleSummary"
        >
          Підсумок релігій
        </v-btn>
      </v-form>

      <v-divider class="my-4" />

      <v-card-title class="text-h6">Виправити дати циклу</v-card-title>
      <v-alert v-if="editCycleError" type="error" variant="tonal" class="mb-4">{{ editCycleError }}</v-alert>
      <v-alert v-if="editCycleSuccess" type="success" variant="tonal" class="mb-4">{{ editCycleSuccess }}</v-alert>
      <v-form class="mb-6">
        <v-select
          v-model="editCycleId"
          :items="allCyclesForSelect"
          item-title="label"
          item-value="id"
          label="Оберіть цикл"
          density="comfortable"
          hide-details="auto"
          class="mb-3"
          clearable
          @update:model-value="onEditCycleSelected"
        />
        <template v-if="editCycleId">
          <FaerunDatePicker
            v-model="editCycleForm.startedAt"
            label="Початок циклу"
            placeholder="Дата початку"
            class="mb-3"
          />
          <FaerunDatePicker
            v-model="editCycleForm.finishedAt"
            label="Кінець циклу (залиште порожнім якщо цикл ще не завершено)"
            placeholder="Дата завершення"
            class="mb-3"
          />
          <v-btn
            color="warning"
            prepend-icon="mdi-calendar-edit"
            :loading="editCycleSaving"
            @click="saveCycleDates"
          >
            Зберегти дати
          </v-btn>
        </template>
      </v-form>

      <v-divider class="my-4" />

      <v-card-title class="text-h6">Герої</v-card-title>
      <v-alert v-if="heroError" type="error" variant="tonal" class="mb-4">{{ heroError }}</v-alert>
      <v-alert v-if="heroSuccess" type="success" variant="tonal" class="mb-4">{{ heroSuccess }}</v-alert>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-subtitle-1 mb-3">Додати нового героя</div>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="newHeroForm.name" label="Ім'я героя" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="newHeroForm.religionId"
              :items="religionOptions"
              label="Релігія"
              hide-details="auto"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="newHeroForm.dndbeyondCharacterId"
              label="dndbeyondCharacterId"
              hide-details="auto"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-end">
            <v-btn color="primary" prepend-icon="mdi-account-plus" :loading="heroSaving" @click="createHero">
              Додати героя
            </v-btn>
          </v-col>
        </v-row>
      </v-card>

      <v-data-table
        :headers="heroHeaders"
        :items="heroRows"
        :items-per-page="10"
        class="elevation-1 mb-2"
        density="compact"
      >
        <template #item.name="{ item }">
          <span class="text-body-2">{{ item.name }}</span>
        </template>
        <template #item.religionName="{ item }">
          {{ item.religionName || '—' }}
        </template>
        <template #item.downtimeAvailable="{ item }">
          <v-chip size="small" :color="item.downtimeAvailable ? 'warning' : 'success'" variant="tonal">
            {{ item.downtimeAvailable ? 'Дія не виконана' : 'Дія виконана' }}
          </v-chip>
        </template>
        <template #item.inactive="{ item }">
          <v-chip size="small" :color="item.inactive ? 'error' : 'success'" variant="tonal">
            {{ item.inactive ? 'Неактивний' : 'Активний' }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn size="small" variant="text" color="primary" @click="openHeroEditor(item)">Редагувати</v-btn>
        </template>
      </v-data-table>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-3">
          <div class="text-subtitle-1">Історія балансів героїв (знімки)</div>
          <v-select
            v-model="snapshotHistoryLimit"
            :items="snapshotHistoryLimitOptions"
            label="Кількість останніх знімків"
            density="comfortable"
            hide-details
            style="max-width: 260px;"
          />
        </div>

        <v-alert
          v-if="!snapshotColumns.length"
          type="info"
          variant="tonal"
          density="comfortable"
        >
          Немає даних знімків балансів для відображення.
        </v-alert>

        <v-table v-else density="compact" class="snapshot-history-table">
          <thead>
            <tr>
              <th class="text-left">Герой</th>
              <th v-for="snapshot in snapshotColumns" :key="snapshot.key" class="text-left">
                <div>{{ snapshot.label }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatSnapshotDateTime(snapshot.syncedAt) }}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in heroSnapshotRows" :key="`snapshot-row-${row.heroId}`">
              <td class="font-weight-medium">{{ row.heroName }}</td>
              <td v-for="snapshot in snapshotColumns" :key="`${row.heroId}-${snapshot.key}`">
                <template v-if="row.entriesByKey[snapshot.key]">
                  <div v-for="currency in currencyKeys" :key="`${row.heroId}-${snapshot.key}-${currency}`">
                    {{ formatCurrencyLabel(currency) }}: {{ row.entriesByKey[snapshot.key].balance[currency] }}
                  </div>
                  <div
                    v-for="currency in currencyKeys"
                    :key="`${row.heroId}-${snapshot.key}-${currency}-delta`"
                    class="text-caption"
                    :class="deltaClass(row.entriesByKey[snapshot.key].balanceDelta[currency])"
                  >
                    Δ {{ formatCurrencyLabel(currency) }}:
                    {{ formatDelta(row.entriesByKey[snapshot.key].balanceDelta[currency]) }}
                  </div>
                </template>
                <span v-else class="text-medium-emphasis">—</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-card variant="tonal" class="pa-3 mb-4">
        <div class="text-subtitle-2 mb-2">Зведення по кампанії (усі герої)</div>
        <div class="text-body-2 mb-1">
          Поточні баланси:
          GP {{ heroBalanceTotals.totalBalance.gp }},
          SP {{ heroBalanceTotals.totalBalance.sp }},
          CP {{ heroBalanceTotals.totalBalance.cp }},
          EP {{ heroBalanceTotals.totalBalance.ep }},
          PP {{ heroBalanceTotals.totalBalance.pp }}
        </div>
        <div class="text-body-2">
          Сума дельт:
          <span :class="deltaClass(heroBalanceTotals.totalDelta.gp)">GP {{ formatDelta(heroBalanceTotals.totalDelta.gp) }}</span>,
          <span :class="deltaClass(heroBalanceTotals.totalDelta.sp)">SP {{ formatDelta(heroBalanceTotals.totalDelta.sp) }}</span>,
          <span :class="deltaClass(heroBalanceTotals.totalDelta.cp)">CP {{ formatDelta(heroBalanceTotals.totalDelta.cp) }}</span>,
          <span :class="deltaClass(heroBalanceTotals.totalDelta.ep)">EP {{ formatDelta(heroBalanceTotals.totalDelta.ep) }}</span>,
          <span :class="deltaClass(heroBalanceTotals.totalDelta.pp)">PP {{ formatDelta(heroBalanceTotals.totalDelta.pp) }}</span>
        </div>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-subtitle-1 mb-3">Import D&amp;D Beyond Balance Snapshot</div>
        <v-alert
          v-if="snapshotImportState.error"
          type="error"
          variant="tonal"
          density="comfortable"
          class="mb-3"
        >
          {{ snapshotImportState.error }}
        </v-alert>
        <v-textarea
          v-model="snapshotImportState.rawInput"
          label="Snapshot JSON"
          auto-grow
          rows="6"
          density="comfortable"
          hide-details="auto"
          class="mb-3"
        />
        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-btn color="primary" prepend-icon="mdi-eye-outline" @click="previewSnapshotImport">Preview Import</v-btn>
          <v-btn
            color="success"
            prepend-icon="mdi-content-save-edit-outline"
            :loading="snapshotImportState.applying"
            :disabled="applyImportDisabled"
            @click="applySnapshotImport"
          >
            Apply Import
          </v-btn>
          <v-btn variant="text" prepend-icon="mdi-close-circle-outline" @click="clearSnapshotImport">Clear</v-btn>
        </div>

        <v-card v-if="snapshotImportState.preview" variant="tonal" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Preview summary</div>
          <v-row dense>
            <v-col cols="6" md="2">Total rows: {{ snapshotImportState.preview.summary.totalRows }}</v-col>
            <v-col cols="6" md="2">Valid rows: {{ snapshotImportState.preview.summary.validRows }}</v-col>
            <v-col cols="6" md="2">Matched: {{ snapshotImportState.preview.summary.matchedRows }}</v-col>
            <v-col cols="6" md="2">Unmatched: {{ snapshotImportState.preview.summary.unmatchedRows }}</v-col>
            <v-col cols="6" md="2">Missing heroes: {{ snapshotImportState.preview.summary.missingHeroesFromSnapshot }}</v-col>
            <v-col cols="6" md="2">Invalid rows: {{ snapshotImportState.preview.summary.invalidRows }}</v-col>
          </v-row>
          <v-alert
            v-if="snapshotImportState.preview.duplicateCharacterIds.length"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mt-3"
          >
            Duplicate characterId rows found ({{ snapshotImportState.preview.duplicateCharacterIds.join(', ') }}).
            Resolve duplicates before apply.
          </v-alert>
        </v-card>

        <v-card v-if="snapshotImportState.preview?.matched.length" variant="outlined" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Matched heroes</div>
          <v-expansion-panels variant="accordion" density="compact">
            <v-expansion-panel
              v-for="row in snapshotImportState.preview.matched"
              :key="`${row.heroId}-${row.dndbeyondCharacterId}`"
            >
              <v-expansion-panel-title>
                <div class="d-flex flex-wrap ga-2 align-center">
                  <span>{{ row.heroName }}</span>
                  <span class="text-medium-emphasis">({{ row.dndbeyondCharacterId }})</span>
                  <span class="font-weight-medium">
                    current: {{ row.currentBalance ? `${row.currentBalance.gp} gp` : 'No previous balance' }}
                    → new: {{ row.newBalance.gp }} gp
                  </span>
                  <span :class="deltaClass(row.delta.gp)">({{ formatDelta(row.delta.gp) }})</span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="text-body-2">
                  GP: {{ row.newBalance.gp }} ({{ formatDelta(row.delta.gp) }})<br />
                  SP: {{ row.newBalance.sp }} ({{ formatDelta(row.delta.sp) }})<br />
                  CP: {{ row.newBalance.cp }} ({{ formatDelta(row.delta.cp) }})<br />
                  EP: {{ row.newBalance.ep }} ({{ formatDelta(row.delta.ep) }})<br />
                  PP: {{ row.newBalance.pp }} ({{ formatDelta(row.delta.pp) }})
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>

        <v-card v-if="snapshotImportState.preview?.unmatched.length" variant="outlined" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Unmatched snapshot rows</div>
          <v-list density="compact">
            <v-list-item v-for="row in snapshotImportState.preview.unmatched" :key="`u-${row.characterId}`">
              <v-list-item-title>{{ row.characterId }} — new: {{ row.balance.gp }} gp</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card v-if="snapshotImportState.preview?.invalid.length" variant="outlined" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Invalid rows</div>
          <v-list density="compact">
            <v-list-item v-for="row in snapshotImportState.preview.invalid" :key="`i-${row.index}-${row.reason}`">
              <v-list-item-title>Row {{ row.index + 1 }}: {{ row.reason }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card v-if="snapshotImportState.preview?.missingHeroesFromSnapshot.length" variant="outlined" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Heroes missing from snapshot</div>
          <v-list density="compact">
            <v-list-item
              v-for="row in snapshotImportState.preview.missingHeroesFromSnapshot"
              :key="`m-${row.heroId}`"
            >
              <v-list-item-title>{{ row.heroName }} ({{ row.dndbeyondCharacterId }})</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <v-alert
          v-if="snapshotImportState.applySummary"
          type="success"
          variant="tonal"
          density="comfortable"
        >
          Updated: {{ snapshotImportState.applySummary.updatedCount }},
          failed: {{ snapshotImportState.applySummary.failedCount }},
          unmatched: {{ snapshotImportState.applySummary.unmatchedCount }},
          skipped: {{ snapshotImportState.applySummary.skippedCount }}.
        </v-alert>
      </v-card>

      <v-dialog v-model="heroEditDialog" max-width="560">
        <v-card>
          <v-card-title class="text-h6">Редагування героя</v-card-title>
          <v-card-text>
            <v-text-field v-model="editHeroForm.name" label="Ім'я героя" class="mb-2" />
            <v-select
              v-model="editHeroForm.religionId"
              :items="religionOptions"
              label="Релігія"
              class="mb-2"
            />
            <v-text-field
              v-model="editHeroForm.dndbeyondCharacterId"
              label="dndbeyondCharacterId"
              class="mb-2"
            />
            <v-switch v-model="editHeroForm.downtimeAvailable" label="Дія не виконана" inset color="warning" />
            <v-switch v-model="editHeroForm.inactive" label="Неактивний герой" inset color="error" />
            <v-text-field
              v-model="editHeroForm.password"
              label="Пароль гравця (залиште порожнім для відключення входу)"
              type="password"
              class="mb-2"
              hint="Встановіть пароль, щоб герой міг входити як гравець"
              persistent-hint
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="heroEditDialog = false">Скасувати</v-btn>
            <v-btn color="primary" :loading="heroSaving" @click="saveHero">Зберегти</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>



      <v-divider class="my-4" />

      <!-- Trade Goods -->
      <v-card-title class="text-h6">Торгові товари</v-card-title>
      <v-alert v-if="goodsError" type="error" variant="tonal" class="mb-4">{{ goodsError }}</v-alert>
      <v-alert v-if="goodsSuccess" type="success" variant="tonal" class="mb-4">{{ goodsSuccess }}</v-alert>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-subtitle-1 mb-3">Додати товар</div>
        <v-row>
          <v-col cols="12" md="5">
            <v-text-field v-model="newGoodForm.name" label="Назва товару" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="newGoodForm.unit" label="Одиниця виміру (напр. barrel, шт.)" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="3" class="d-flex align-end">
            <v-btn color="primary" prepend-icon="mdi-package-variant-plus" :loading="goodsSaving" @click="createGood">
              Додати
            </v-btn>
          </v-col>
        </v-row>
      </v-card>

      <v-data-table
        :headers="goodsHeaders"
        :items="goodsRows"
        :items-per-page="20"
        class="elevation-1 mb-4"
        density="compact"
      >
        <template #item.actions="{ item }">
          <v-btn size="small" variant="text" color="primary" @click="openGoodsEditor(item)">Редагувати</v-btn>
          <v-btn size="small" variant="text" color="error" @click="deleteGood(item)">Видалити</v-btn>
        </template>
      </v-data-table>

      <v-dialog v-model="goodsEditDialog" max-width="420">
        <v-card>
          <v-card-title class="text-h6">Редагування товару</v-card-title>
          <v-card-text>
            <v-text-field v-model="editGoodForm.name" label="Назва товару" class="mb-2" />
            <v-text-field v-model="editGoodForm.unit" label="Одиниця виміру" class="mb-2" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="goodsEditDialog = false">Скасувати</v-btn>
            <v-btn color="primary" :loading="goodsSaving" @click="saveGood">Зберегти</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-divider class="my-4" />

      <v-card-title class="text-h6">Crafting</v-card-title>
      <CraftActionForm
        class="mb-4"
        :heroes="heroRows"
        :items="craftItemsForAdmin"
        :default-hero-id="selectedHeroIdForCrafting"
        @saved="refreshCraftingAdminData"
      />

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

  <v-dialog v-model="showReligionSummaryDialog" max-width="620">
    <v-card>
      <div class="pa-4" style="border-bottom: 1px solid var(--wi-border)">
        <span class="wi-heading text-h6">Підсумок релігійних дій циклу</span>
      </div>
      <v-card-text class="pt-4">
        <v-textarea
          v-model="religionSummaryText"
          rows="14"
          auto-grow
          variant="outlined"
          hide-details
        />
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn prepend-icon="mdi-content-copy" color="primary" @click="copyReligionSummary">
          {{ religionSummaryCopied ? 'Скопійовано!' : 'Копіювати' }}
        </v-btn>
        <v-btn @click="showReligionSummaryDialog = false">Закрити</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, nextTick } from 'vue';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { DEFAULT_YEAR, diffInDays, normalizeFaerunDate, parseFaerunDate } from 'faerun-date';
import { formatFaerunDate } from '@/utils/faerun-date.js';
import { db } from '../services/firebase';
import FaerunDatePicker from '@/components/FaerunDatePicker.vue';
import { useIslandStore } from '@/store/islandStore';
import { usePopulationStore } from '@/store/populationStore';
import { createNewCycleWithEffects } from '@/services/cycleService';
import CraftActionForm from '@/components/crafting/CraftActionForm.vue';
import { loadCraftItems } from '@/services/craftingService';
import { DEFAULT_ISLAND_ID } from '@/config/constants.js';
import { aggregateReligionActions, buildReligionSummaryText } from '@/utils/religionSummary.js';

const logEntries = ref([]);
const cycleSaving = ref(false);
const cycleError = ref('');
const cycleSuccess = ref('');
const latestCycle = ref(null);
const previousCompletedCycle = ref(null);
const allCycles = ref([]);
const editCycleId = ref(null);
const editCycleForm = reactive({ startedAt: null, finishedAt: null });
const editCycleSaving = ref(false);
const editCycleError = ref('');
const editCycleSuccess = ref('');
const religionSummaryText = ref('');
const showReligionSummaryDialog = ref(false);
const religionSummaryLoading = ref(false);
const religionSummaryCopied = ref(false);
const islandStore = useIslandStore();
const populationStore = usePopulationStore();
const cycleForm = reactive({
  startedDate: null,
  notes: '',
});
const cycleDaysInput = ref(null);
let _daysUpdatingDate = false;
let _dateUpdatingDays = false;

watch(cycleDaysInput, (days) => {
  if (_dateUpdatingDays) return
  const n = Number(days)
  if (!n || n < 1) return
  const previousStart = parseFaerunDate(latestCycle.value?.startedAt)
  if (!previousStart) return
  _daysUpdatingDate = true
  const totalDays = previousStart.month * 30 + (previousStart.day - 1) + (n - 1)
  cycleForm.startedDate = {
    day: (totalDays % 30) + 1,
    month: Math.floor(totalDays / 30) % 12,
    year: previousStart.year + Math.floor(totalDays / 360),
  }
  nextTick(() => { _daysUpdatingDate = false })
})

watch(() => cycleForm.startedDate, (date) => {
  if (_daysUpdatingDate) return
  const start = normalizeFaerunDate(date)
  const previousStart = parseFaerunDate(latestCycle.value?.startedAt)
  if (!start || !previousStart) return
  const diff = diffInDays(previousStart, start)
  if (diff !== null && diff > 0) {
    _dateUpdatingDays = true
    cycleDaysInput.value = diff
    nextTick(() => { _dateUpdatingDays = false })
  }
})

const heroes = ref([]);
const religions = ref([]);
const clergyRows = ref([]);
const heroBalanceSyncLogs = ref([]);
const heroSaving = ref(false);
const heroError = ref('');
const heroSuccess = ref('');
const heroEditDialog = ref(false);
const selectedHeroId = ref('');
const snapshotImportState = reactive({
  rawInput: '',
  preview: null,
  error: '',
  applying: false,
  applySummary: null,
});

// ── Trade goods ──────────────────────────────────────────────────────────────
const goodsList = ref([]);
const goodsSaving = ref(false);
const goodsError = ref('');
const goodsSuccess = ref('');
const goodsEditDialog = ref(false);
const selectedGoodId = ref('');
const newGoodForm = reactive({ name: '', unit: '' });
const editGoodForm = reactive({ name: '', unit: '' });
let stopGoods = null;

const goodsHeaders = [
  { title: 'Назва', key: 'name' },
  { title: 'Одиниця', key: 'unit' },
  { title: '', key: 'actions', sortable: false },
];

const goodsRows = computed(() =>
  goodsList.value.map((g) => ({ id: g.id, name: g.name, unit: g.unit || '—' }))
);

function openGoodsEditor(item) {
  selectedGoodId.value = item.id;
  editGoodForm.name = item.name;
  editGoodForm.unit = item.unit === '—' ? '' : item.unit;
  goodsEditDialog.value = true;
}

async function createGood() {
  goodsError.value = '';
  goodsSuccess.value = '';
  const name = newGoodForm.name.trim();
  if (!name) { goodsError.value = 'Вкажіть назву товару.'; return; }
  goodsSaving.value = true;
  try {
    await addDoc(collection(db, 'goods'), { name, unit: newGoodForm.unit.trim() });
    newGoodForm.name = '';
    newGoodForm.unit = '';
    goodsSuccess.value = 'Товар додано.';
  } catch (e) {
    console.error('[admin] Failed to create good', e);
    goodsError.value = 'Не вдалося додати товар.';
  } finally {
    goodsSaving.value = false;
  }
}

async function saveGood() {
  goodsError.value = '';
  const name = editGoodForm.name.trim();
  if (!selectedGoodId.value || !name) { goodsError.value = 'Вкажіть назву.'; return; }
  goodsSaving.value = true;
  try {
    await setDoc(doc(db, 'goods', selectedGoodId.value), { name, unit: editGoodForm.unit.trim() }, { merge: true });
    goodsEditDialog.value = false;
    goodsSuccess.value = 'Товар оновлено.';
  } catch (e) {
    console.error('[admin] Failed to save good', e);
    goodsError.value = 'Не вдалося зберегти товар.';
  } finally {
    goodsSaving.value = false;
  }
}

async function deleteGood(item) {
  goodsError.value = '';
  goodsSuccess.value = '';
  try {
    await deleteDoc(doc(db, 'goods', item.id));
    goodsSuccess.value = `Товар "${item.name}" видалено.`;
  } catch (e) {
    console.error('[admin] Failed to delete good', e);
    goodsError.value = 'Не вдалося видалити товар.';
  }
}

const craftItemsForAdmin = ref([]);
const selectedHeroIdForCrafting = ref('');

const newHeroForm = reactive({
  name: '',
  religionId: '',
  dndbeyondCharacterId: '',
});

const editHeroForm = reactive({
  name: '',
  religionId: '',
  dndbeyondCharacterId: '',
  downtimeAvailable: true,
  inactive: false,
  password: '',
});

let stopHeroes = null;
let stopReligions = null;
let stopClergy = null;
let stopHeroBalanceSyncLogs = null;

const headers = [
  { title: 'Час', key: 'timestamp' },
  { title: 'Користувач', key: 'user' },
  { title: 'Дія', key: 'action' },
];

const heroHeaders = [
  { title: 'Герой', key: 'name' },
  { title: 'Релігія', key: 'religionName' },
  { title: 'Статус дії', key: 'downtimeAvailable' },
  { title: 'Стан героя', key: 'inactive' },
  { title: '', key: 'actions', sortable: false },
];

const snapshotHistoryLimitOptions = [
  { title: '5 знімків', value: 5 },
  { title: '10 знімків', value: 10 },
  { title: '20 знімків', value: 20 },
  { title: '50 знімків', value: 50 },
];
const snapshotHistoryLimit = ref(5);
const currencyKeys = ['cp', 'sp', 'gp', 'ep', 'pp'];

const religionOptions = computed(() =>
  religions.value.map((item) => ({
    title: item.name,
    value: item.id,
  })),
);

const clergyByHeroId = computed(() => {
  const map = new Map();
  for (const row of clergyRows.value) {
    if (row.heroId) map.set(row.heroId, row);
  }
  return map;
});

const religionById = computed(() => {
  const map = new Map();
  for (const religion of religions.value) {
    map.set(religion.id, religion);
  }
  return map;
});

const heroRows = computed(() =>
  heroes.value
    .map((hero) => {
      const clergy = clergyByHeroId.value.get(hero.id) || null;
      const religionId = clergy?.religionId || '';

      return {
        ...hero,
        religionId,
        religionName: religionById.value.get(religionId)?.name || '—',
        clergyId: clergy?.id || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA')),
);

const applyImportDisabled = computed(() => {
  const preview = snapshotImportState.preview;
  if (!preview) return true;
  if (snapshotImportState.applying) return true;
  if (preview.duplicateCharacterIds.length) return true;
  return preview.matched.length === 0;
});

const snapshotColumns = computed(() => {
  const timelineMap = new Map();

  for (const row of heroBalanceSyncLogs.value) {
    if (!row.syncedAt || !row.snapshotGroupKey) continue;
    if (!timelineMap.has(row.snapshotGroupKey)) {
      timelineMap.set(row.snapshotGroupKey, {
        key: row.snapshotGroupKey,
        syncedAt: row.syncedAt,
      });
      continue;
    }

    const existing = timelineMap.get(row.snapshotGroupKey);
    if (row.syncedAt.toMillis() > existing.syncedAt.toMillis()) {
      timelineMap.set(row.snapshotGroupKey, {
        ...existing,
        syncedAt: row.syncedAt,
      });
    }
  }

  return [...timelineMap.values()]
    .sort((a, b) => b.syncedAt.toMillis() - a.syncedAt.toMillis())
    .slice(0, snapshotHistoryLimit.value)
    .map((item, index) => ({
      ...item,
      label: `Знімок ${index + 1}`,
    }));
});

const heroSnapshotRows = computed(() => {
  const entriesByHeroId = new Map();
  const allowedKeys = new Set(snapshotColumns.value.map((item) => item.key));

  for (const row of heroBalanceSyncLogs.value) {
    if (!row.heroId || !row.snapshotGroupKey || !allowedKeys.has(row.snapshotGroupKey)) continue;

    if (!entriesByHeroId.has(row.heroId)) {
      entriesByHeroId.set(row.heroId, {
        heroId: row.heroId,
        heroName: row.heroName || row.heroId,
        entriesByKey: {},
      });
    }

    const heroRow = entriesByHeroId.get(row.heroId);
    const existingEntry = heroRow.entriesByKey[row.snapshotGroupKey];
    if (!existingEntry || row.syncedAt?.toMillis?.() > existingEntry.syncedAt?.toMillis?.()) {
      heroRow.entriesByKey[row.snapshotGroupKey] = row;
    }
    if (!heroRow.heroName && row.heroName) {
      heroRow.heroName = row.heroName;
    }
  }

  return heroRows.value
    .map((hero) => entriesByHeroId.get(hero.id) || {
      heroId: hero.id,
      heroName: hero.name || hero.id,
      entriesByKey: {},
    })
    .sort((a, b) => a.heroName.localeCompare(b.heroName, 'uk-UA'));
});

const heroBalanceTotals = computed(() => {
  const totalBalance = { cp: 0, sp: 0, gp: 0, ep: 0, pp: 0 };
  const totalDelta = { cp: 0, sp: 0, gp: 0, ep: 0, pp: 0 };

  for (const hero of heroRows.value) {
    const normalizedBalance = normalizeBalance(hero.balance || {});
    const normalizedDelta = normalizeBalance(hero.balanceDelta || {});
    totalBalance.cp += normalizedBalance.cp;
    totalBalance.sp += normalizedBalance.sp;
    totalBalance.gp += normalizedBalance.gp;
    totalBalance.ep += normalizedBalance.ep;
    totalBalance.pp += normalizedBalance.pp;
    totalDelta.cp += normalizedDelta.cp;
    totalDelta.sp += normalizedDelta.sp;
    totalDelta.gp += normalizedDelta.gp;
    totalDelta.ep += normalizedDelta.ep;
    totalDelta.pp += normalizedDelta.pp;
  }

  return { totalBalance, totalDelta };
});

const cycleDurationLabel = computed(() => {
  const start = normalizeFaerunDate(cycleForm.startedDate);
  const previousCycleStart = parseFaerunDate(latestCycle.value?.startedAt);

  if (!start || !previousCycleStart) return 'Тривалість буде розрахована автоматично';

  const diff = diffInDays(previousCycleStart, start);
  if (diff === null) return 'Тривалість буде розрахована автоматично';
  if (diff <= 0) return 'Дата початку нового циклу має бути пізнішою за попередній';

  return `${diff} днів`;
});

async function loadLatestCycle() {
  const cyclesRef = collection(db, 'cycles');
  const latestCycleQuery = query(cyclesRef, orderBy('createdAt', 'desc'), limit(2));
  const snapshot = await getDocs(latestCycleQuery);
  latestCycle.value = snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
  previousCompletedCycle.value = snapshot.docs[1] ? { id: snapshot.docs[1].id, ...snapshot.docs[1].data() } : null;
}

async function loadAllCycles() {
  const snapshot = await getDocs(query(collection(db, 'cycles'), orderBy('createdAt', 'desc')));
  allCycles.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const allCyclesForSelect = computed(() =>
  allCycles.value.map((c) => ({
    id: c.id,
    label: c.startedAt && c.finishedAt
      ? `${c.startedAt} — ${c.finishedAt}`
      : c.startedAt
        ? `з ${c.startedAt} (поточний)`
        : c.id,
  })),
);

function onEditCycleSelected(id) {
  editCycleError.value = '';
  editCycleSuccess.value = '';
  if (!id) { editCycleForm.startedAt = null; editCycleForm.finishedAt = null; return; }
  const cycle = allCycles.value.find((c) => c.id === id);
  editCycleForm.startedAt = cycle?.startedAt ? parseFaerunDate(cycle.startedAt) : null;
  editCycleForm.finishedAt = cycle?.finishedAt ? parseFaerunDate(cycle.finishedAt) : null;
}

async function saveCycleDates() {
  editCycleError.value = '';
  editCycleSuccess.value = '';
  const normalizedStart = normalizeFaerunDate(editCycleForm.startedAt);
  if (!normalizedStart) { editCycleError.value = 'Вкажіть дату початку циклу.'; return; }
  const normalizedEnd = editCycleForm.finishedAt ? normalizeFaerunDate(editCycleForm.finishedAt) : null;

  editCycleSaving.value = true;
  try {
    const updates = { startedAt: formatFaerunDate(normalizedStart) };
    if (normalizedEnd) {
      updates.finishedAt = formatFaerunDate(normalizedEnd);
      const diff = diffInDays(normalizedStart, normalizedEnd);
      updates.duration = diff > 0 ? diff : null;
    } else {
      updates.finishedAt = null;
      updates.duration = null;
    }
    await updateDoc(doc(db, 'cycles', editCycleId.value), updates);
    editCycleSuccess.value = 'Дати циклу оновлено.';
    await loadLatestCycle();
    await loadAllCycles();
  } catch (error) {
    console.error('[admin] Failed to update cycle dates', error);
    editCycleError.value = 'Не вдалося оновити дати циклу.';
  } finally {
    editCycleSaving.value = false;
  }
}

function suggestNextCycleDate() {
  const previousCycleStart = parseFaerunDate(latestCycle.value?.startedAt);
  if (!previousCycleStart) {
    const now = new Date();
    return {
      day: now.getUTCDate(),
      month: now.getUTCMonth(),
      year: DEFAULT_YEAR,
    };
  }

  const totalDays = previousCycleStart.month * 30 + (previousCycleStart.day - 1) + 7;
  const normalizedMonth = ((totalDays % 360) + 360) % 360;
  const yearShift = Math.floor(totalDays / 360);
  return {
    day: (normalizedMonth % 30) + 1,
    month: Math.floor(normalizedMonth / 30),
    year: previousCycleStart.year + yearShift,
  };
}

async function createCycle() {
  cycleError.value = '';
  cycleSuccess.value = '';

  if (!normalizeFaerunDate(cycleForm.startedDate)) {
    cycleError.value = 'Вкажіть початок циклу.';
    return;
  }

  cycleSaving.value = true;
  try {
    await createNewCycleWithEffects({
      startedDate: cycleForm.startedDate,
      notes: cycleForm.notes,
      islandId: islandStore.currentId || DEFAULT_ISLAND_ID,
      population: populationStore.totalPopulation,
      populationItems: populationStore.items || [],
    });
    cycleSuccess.value = 'Новий цикл успішно створено.';
    cycleForm.notes = '';
    await loadLatestCycle();
    cycleForm.startedDate = suggestNextCycleDate();
    cycleDaysInput.value = null;
  } catch (error) {
    console.error('[admin] Failed to create cycle', error);
    cycleError.value = 'Не вдалося створити новий цикл.';
  } finally {
    cycleSaving.value = false;
  }
}

async function generateReligionCycleSummary() {
  if (!previousCompletedCycle.value) return;

  religionSummaryLoading.value = true;
  try {
    const heroNameById = new Map(heroes.value.map((h) => [h.id, h.name]));
    const religionNameById = new Map(religions.value.map((r) => [r.id, r.name]));
    const cycleId = previousCompletedCycle.value.id;

    const actionsSnap = await getDocs(
      query(collection(db, 'religion-actions'), where('cycleId', '==', cycleId))
    );

    const actions = actionsSnap.docs.map((docSnap) => docSnap.data());
    const { faithByHero, followersByReligion, shieldDefenses, shieldsBrokenNames } =
      aggregateReligionActions(actions, heroNameById, religionNameById);

    religionSummaryText.value = buildReligionSummaryText({
      faithByHero,
      followersByReligion,
      shieldDefenses,
      shieldsBrokenNames,
      newCycleDate: latestCycle.value?.startedAt || '',
    });
    showReligionSummaryDialog.value = true;
  } catch (e) {
    console.error('[admin] Failed to generate religion summary', e);
  } finally {
    religionSummaryLoading.value = false;
  }
}

async function copyReligionSummary() {
  if (!religionSummaryText.value) return;
  await navigator.clipboard.writeText(religionSummaryText.value);
  religionSummaryCopied.value = true;
  setTimeout(() => { religionSummaryCopied.value = false; }, 2000);
}

function subscribeHeroData() {
  stopHeroes = onSnapshot(collection(db, 'heroes'), (snapshot) => {
    heroes.value = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};

      return {
        id: docSnap.id,
        name: data.name || data.heroName || data.nickname || docSnap.id,
        dndbeyondCharacterId: data.dndbeyondCharacterId || '',
        balance: data.balance || null,
        balanceDelta: data.balanceDelta || null,
        downtimeAvailable: data.downtimeAvailable !== false,
        inactive: Boolean(data.inactive),
        password: data.password || '',
      };
    });
  });

  stopReligions = onSnapshot(collection(db, 'religions'), (snapshot) => {
    religions.value = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data()?.name || docSnap.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'));
  });

  stopClergy = onSnapshot(collection(db, 'clergy'), (snapshot) => {
    clergyRows.value = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      const heroRefPath = data.hero?.path || '';
      const religionRefPath = data.religion?.path || '';

      return {
        id: docSnap.id,
        heroId: heroRefPath.split('/')[1] || '',
        religionId: religionRefPath.split('/')[1] || '',
      };
    });
  });

  stopHeroBalanceSyncLogs = onSnapshot(
    query(collection(db, 'hero-balance-sync-logs'), orderBy('syncedAt', 'desc'), limit(1000)),
    (snapshot) => {
      heroBalanceSyncLogs.value = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() || {};
        const syncedAt = data.syncedAt || null;
        const source = data.source || '';

        return {
          id: docSnap.id,
          heroId: data.heroId || '',
          heroName: data.heroName || '',
          syncedAt,
          source,
          snapshotGroupKey: buildSnapshotGroupKey(syncedAt, source),
          balance: normalizeBalance(data.balance || {}),
          balanceDelta: normalizeBalance(data.balanceDelta || {}),
        };
      });
    },
  );
}

function normalizeBalance(balance) {
  return {
    cp: Number(balance?.cp ?? 0) || 0,
    sp: Number(balance?.sp ?? 0) || 0,
    gp: Number(balance?.gp ?? 0) || 0,
    ep: Number(balance?.ep ?? 0) || 0,
    pp: Number(balance?.pp ?? 0) || 0,
  };
}

function formatCurrencyLabel(currency) {
  return String(currency || '').toUpperCase();
}

function computeDelta(oldBalance, newBalance) {
  const oldB = normalizeBalance(oldBalance || {});
  const newB = normalizeBalance(newBalance || {});
  return {
    cp: newB.cp - oldB.cp,
    sp: newB.sp - oldB.sp,
    gp: newB.gp - oldB.gp,
    ep: newB.ep - oldB.ep,
    pp: newB.pp - oldB.pp,
  };
}

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

function deltaClass(value) {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-error';
  return 'text-medium-emphasis';
}

function clearSnapshotImport() {
  snapshotImportState.rawInput = '';
  snapshotImportState.preview = null;
  snapshotImportState.error = '';
  snapshotImportState.applySummary = null;
}

async function previewSnapshotImport() {
  snapshotImportState.error = '';
  snapshotImportState.applySummary = null;

  let parsed;
  try {
    parsed = JSON.parse(snapshotImportState.rawInput);
  } catch (error) {
    snapshotImportState.preview = null;
    snapshotImportState.error = 'Snapshot JSON is invalid.';
    return;
  }

  if (!Array.isArray(parsed)) {
    snapshotImportState.preview = null;
    snapshotImportState.error = 'Snapshot root must be an array.';
    return;
  }

  const invalid = [];
  const validRows = [];
  const counts = new Map();

  parsed.forEach((row, index) => {
    if (!row || typeof row !== 'object') {
      invalid.push({ index, reason: 'Row must be an object.' });
      return;
    }

    const characterId = typeof row.characterId === 'string' ? row.characterId.trim() : '';
    if (!characterId) {
      invalid.push({ index, reason: 'characterId must be a non-empty string.' });
      return;
    }

    if (row.status !== 'success') {
      invalid.push({ index, reason: 'status must be "success".' });
      return;
    }

    if (!row.balance || typeof row.balance !== 'object') {
      invalid.push({ index, reason: 'balance must be an object.' });
      return;
    }

    const normalizedBalance = normalizeBalance(row.balance);
    validRows.push({
      index,
      characterId,
      rawCharacterId: row.characterId,
      balance: normalizedBalance,
    });
    counts.set(characterId, (counts.get(characterId) || 0) + 1);
  });

  const duplicateCharacterIds = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([characterId]) => characterId);

  if (duplicateCharacterIds.length) {
    validRows.forEach((row) => {
      if (duplicateCharacterIds.includes(row.characterId)) {
        invalid.push({
          index: row.index,
          reason: `Duplicate characterId "${row.characterId}" detected.`,
        });
      }
    });
  }

  const usableRows = validRows.filter((row) => !duplicateCharacterIds.includes(row.characterId));
  const heroByCharacterId = new Map(
    heroes.value
      .filter((hero) => typeof hero.dndbeyondCharacterId === 'string' && hero.dndbeyondCharacterId !== '')
      .map((hero) => [hero.dndbeyondCharacterId, hero]),
  );

  const matched = [];
  const unmatched = [];
  const snapshotCharacterIds = new Set();

  usableRows.forEach((row) => {
    snapshotCharacterIds.add(row.characterId);
    const hero = heroByCharacterId.get(row.characterId);
    if (!hero) {
      unmatched.push({
        characterId: row.characterId,
        rawCharacterId: row.rawCharacterId,
        balance: row.balance,
      });
      return;
    }

    const currentBalance = hero.balance && typeof hero.balance === 'object' ? normalizeBalance(hero.balance) : null;
    matched.push({
      heroId: hero.id,
      heroName: hero.name || hero.id,
      dndbeyondCharacterId: hero.dndbeyondCharacterId,
      currentBalance,
      newBalance: row.balance,
      delta: computeDelta(currentBalance || {}, row.balance),
      rawCharacterId: row.rawCharacterId,
    });
  });

  const missingHeroesFromSnapshot = heroes.value
    .filter(
      (hero) =>
        typeof hero.dndbeyondCharacterId === 'string' &&
        hero.dndbeyondCharacterId !== '' &&
        !snapshotCharacterIds.has(hero.dndbeyondCharacterId),
    )
    .map((hero) => ({
      heroId: hero.id,
      heroName: hero.name || hero.id,
      dndbeyondCharacterId: hero.dndbeyondCharacterId,
    }))
    .sort((a, b) => a.heroName.localeCompare(b.heroName, 'uk-UA'));

  snapshotImportState.preview = {
    summary: {
      totalRows: parsed.length,
      validRows: usableRows.length,
      matchedRows: matched.length,
      unmatchedRows: unmatched.length,
      invalidRows: invalid.length,
      missingHeroesFromSnapshot: missingHeroesFromSnapshot.length,
    },
    matched,
    unmatched,
    invalid: invalid.sort((a, b) => a.index - b.index),
    duplicateCharacterIds,
    missingHeroesFromSnapshot,
  };
}

async function applySnapshotImport() {
  if (applyImportDisabled.value) return;

  snapshotImportState.applying = true;
  snapshotImportState.error = '';
  snapshotImportState.applySummary = null;

  const preview = snapshotImportState.preview;
  const syncedAt = Timestamp.now();
  let updatedCount = 0;
  let failedCount = 0;
  const failures = [];

  try {
    for (const row of preview.matched) {
      const heroRef = doc(db, 'heroes', row.heroId);
      const payload = {
        balance: row.newBalance,
        balanceDelta: row.delta,
        balanceSyncedAt: syncedAt,
        balanceSyncStatus: 'manual_import',
        balanceSyncError: null,
        balanceSyncSource: 'manual_snapshot_import',
      };
      if (row.currentBalance) {
        payload.previousBalance = row.currentBalance;
      }

      try {
        await updateDoc(heroRef, payload);
        await addDoc(collection(db, 'hero-balance-sync-logs'), {
          heroId: row.heroId,
          heroName: row.heroName,
          dndbeyondCharacterId: row.dndbeyondCharacterId,
          syncedAt,
          source: 'manual_snapshot_import',
          balance: row.newBalance,
          previousBalance: row.currentBalance || null,
          balanceDelta: row.delta,
          rawCharacterId: row.rawCharacterId,
        });
        updatedCount += 1;
      } catch (error) {
        console.error('[admin] Failed to apply snapshot row', row, error);
        failedCount += 1;
        failures.push(`${row.heroName} (${row.dndbeyondCharacterId})`);
      }
    }

    snapshotImportState.applySummary = {
      updatedCount,
      failedCount,
      unmatchedCount: preview.unmatched.length,
      skippedCount: preview.invalid.length + preview.missingHeroesFromSnapshot.length,
    };

    if (failures.length) {
      snapshotImportState.error = `Some hero updates failed: ${failures.join(', ')}`;
    } else {
      heroSuccess.value = `Manual snapshot import updated ${updatedCount} heroes.`;
    }
  } finally {
    snapshotImportState.applying = false;
  }
}

function openHeroEditor(hero) {
  selectedHeroId.value = hero.id;
  editHeroForm.name = hero.name;
  editHeroForm.religionId = hero.religionId;
  editHeroForm.dndbeyondCharacterId = hero.dndbeyondCharacterId || '';
  editHeroForm.downtimeAvailable = hero.downtimeAvailable;
  editHeroForm.inactive = hero.inactive;
  editHeroForm.password = hero.password || '';
  heroEditDialog.value = true;
}

async function createHero() {
  heroError.value = '';
  heroSuccess.value = '';

  const name = newHeroForm.name.trim();
  if (!name) {
    heroError.value = 'Вкажіть імʼя героя.';
    return;
  }
  if (!newHeroForm.religionId) {
    heroError.value = 'Оберіть релігію для героя.';
    return;
  }
  const dndbeyondCharacterId = newHeroForm.dndbeyondCharacterId.trim();

  heroSaving.value = true;
  try {
    const religionRef = doc(db, 'religions', newHeroForm.religionId);
    await runTransaction(db, async (transaction) => {
      const heroRef = doc(collection(db, 'heroes'));
      const clergyRef = doc(collection(db, 'clergy'));

      transaction.set(heroRef, {
        name,
        dndbeyondCharacterId,
        downtimeAvailable: true,
        inactive: false,
        createdAt: serverTimestamp(),
      });

      transaction.set(clergyRef, {
        hero: heroRef,
        religion: religionRef,
        faith: 0,
        faithMax: 0,
        createdAt: serverTimestamp(),
      });
    });

    newHeroForm.name = '';
    newHeroForm.religionId = '';
    newHeroForm.dndbeyondCharacterId = '';
    heroSuccess.value = 'Героя створено, духовенство додано автоматично.';
  } catch (error) {
    console.error('[admin] Failed to create hero', error);
    heroError.value = 'Не вдалося створити героя.';
  } finally {
    heroSaving.value = false;
  }
}

async function saveHero() {
  heroError.value = '';
  heroSuccess.value = '';

  const name = editHeroForm.name.trim();
  if (!selectedHeroId.value) {
    heroError.value = 'Не вдалося визначити героя для редагування.';
    return;
  }
  if (!name) {
    heroError.value = 'Вкажіть імʼя героя.';
    return;
  }
  if (!editHeroForm.religionId) {
    heroError.value = 'Оберіть релігію для героя.';
    return;
  }
  const dndbeyondCharacterId = editHeroForm.dndbeyondCharacterId.trim();

  heroSaving.value = true;
  try {
    const heroRef = doc(db, 'heroes', selectedHeroId.value);
    const currentHero = heroRows.value.find((item) => item.id === selectedHeroId.value);
    const targetReligionRef = doc(db, 'religions', editHeroForm.religionId);

    await runTransaction(db, async (transaction) => {
      const heroUpdates = {
        name,
        dndbeyondCharacterId,
        downtimeAvailable: editHeroForm.downtimeAvailable,
        inactive: editHeroForm.inactive,
        updatedAt: serverTimestamp(),
      };
      const trimmedPassword = editHeroForm.password.trim();
      if (trimmedPassword) {
        heroUpdates.password = trimmedPassword;
      }
      transaction.update(heroRef, heroUpdates);

      if (currentHero?.clergyId) {
        transaction.update(doc(db, 'clergy', currentHero.clergyId), {
          religion: targetReligionRef,
        });
      } else {
        const clergyRef = doc(collection(db, 'clergy'));
        transaction.set(clergyRef, {
          hero: heroRef,
          religion: targetReligionRef,
          faith: 0,
          faithMax: 0,
          createdAt: serverTimestamp(),
        });
      }
    });

    heroEditDialog.value = false;
    heroSuccess.value = 'Дані героя оновлено.';
  } catch (error) {
    console.error('[admin] Failed to save hero', error);
    heroError.value = 'Не вдалося оновити героя.';
  } finally {
    heroSaving.value = false;
  }
}

async function refreshCraftingAdminData() {
  craftItemsForAdmin.value = await loadCraftItems();
}

watch(heroRows, (rows) => {
  if (!selectedHeroIdForCrafting.value && rows.length) {
    selectedHeroIdForCrafting.value = rows[0].id;
  }
}, { immediate: true });

onMounted(async () => {
  populationStore.startListening(islandStore.currentId || DEFAULT_ISLAND_ID);
  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  logEntries.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  await loadLatestCycle();
  await loadAllCycles();
  cycleForm.startedDate = suggestNextCycleDate();
  subscribeHeroData();
  stopGoods = onSnapshot(query(collection(db, 'goods'), orderBy('name')), (snap) => {
    goodsList.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
  await refreshCraftingAdminData();
});

onBeforeUnmount(() => {
  populationStore.stopListening();
  stopHeroes?.();
  stopReligions?.();
  stopClergy?.();
  stopHeroBalanceSyncLogs?.();
  stopGoods?.();
});

function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) return '-';
  const date = timestamp.toDate();
  return date.toLocaleString('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatSnapshotDateTime(timestamp) {
  if (!timestamp?.toDate) return '—';
  const date = timestamp.toDate();
  return date.toLocaleString('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function buildSnapshotGroupKey(timestamp, source) {
  if (!timestamp?.toMillis) return '';
  const minuteBucket = Math.floor(timestamp.toMillis() / 60000);
  return `snapshot-${source || 'unknown_source'}-${minuteBucket}`;
}
</script>

<style scoped>
/* ── Main card ───────────────────────────────────────────────── */
.admin-card {
  background: linear-gradient(135deg, rgba(14,9,4,0.9), rgba(26,17,8,0.85)) !important;
  border: 1px solid var(--wi-border) !important;
}

/* ── Titles ──────────────────────────────────────────────────── */
.admin-title {
  font-family: var(--wi-font-heading) !important;
  font-size: 1.3rem !important;
  color: var(--wi-gold) !important;
  letter-spacing: 0.04em;
  padding-bottom: 4px;
}

.admin-card :deep(.v-card-title.text-h6) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
  color: var(--wi-text-muted) !important;
  padding-top: 4px;
}

/* ── Dividers ────────────────────────────────────────────────── */
.admin-card :deep(.v-divider) {
  border-color: var(--wi-border) !important;
  opacity: 1;
}

/* ── Inner cards (outlined / tonal) ─────────────────────────── */
.admin-card :deep(.v-card[class*="pa-"]:not(.admin-card)),
.admin-card :deep(.v-card--variant-outlined),
.admin-card :deep(.v-card--variant-tonal) {
  background: rgba(6, 4, 1, 0.55) !important;
  border-color: var(--wi-border) !important;
}

.admin-card :deep(.v-card .text-subtitle-1),
.admin-card :deep(.v-card .text-subtitle-2) {
  font-family: var(--wi-font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

/* ── Data tables ─────────────────────────────────────────────── */
.admin-card :deep(.v-data-table thead tr th),
.admin-card :deep(.v-table thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.68rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: var(--wi-text-muted) !important;
  background: #1a1108 !important;
  border-bottom: 1px solid var(--wi-border) !important;
}

.admin-card :deep(.v-data-table tbody tr td),
.admin-card :deep(.v-table tbody tr td) {
  color: var(--wi-text) !important;
  font-family: var(--wi-font-body) !important;
  border-bottom: 1px solid rgba(90, 62, 32, 0.2) !important;
  background: transparent !important;
}

.admin-card :deep(.v-data-table-footer) {
  font-family: var(--wi-font-body);
  color: var(--wi-text-muted);
  border-top: 1px solid var(--wi-border);
}

/* ── Snapshot history table ──────────────────────────────────── */
.snapshot-history-table { overflow-x: auto; }

/* ── Dialog card ─────────────────────────────────────────────── */
:deep(.v-overlay .v-card) {
  background: linear-gradient(135deg, rgba(14,9,4,0.98), rgba(26,17,8,0.95)) !important;
  border: 1px solid var(--wi-border) !important;
}

:deep(.v-overlay .v-card-title) {
  font-family: var(--wi-font-heading) !important;
  color: var(--wi-gold) !important;
  letter-spacing: 0.04em;
}

/* ── Expansion panels (snapshot import preview) ──────────────── */
.admin-card :deep(.v-expansion-panels) {
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  overflow: hidden;
}

.admin-card :deep(.v-expansion-panel-title) {
  font-family: var(--wi-font-body);
  color: var(--wi-text);
  background: rgba(10,6,2,0.7);
}

.admin-card :deep(.v-expansion-panel-text__wrapper) {
  background: rgba(6,4,1,0.6);
  font-family: var(--wi-font-body);
  color: var(--wi-text);
}
</style>
