<template>
  <v-container class="crafting-page pb-8">
    <WiPageHeader
      title="Майстерність крафту"
      subtitle="Прогрес категорій, підкатегорій, спеціалізації та розрахунок ціни компонентів для вибраного персонажа."
      icon="mdi-anvil"
    >
      <template #actions>
        <WiActionButton tone="sea" variant="tonal" prepend-icon="mdi-refresh" @click="loadData">Оновити</WiActionButton>
        <WiActionButton
          v-if="canSubmitCraftRequest"
          tone="success"
          variant="tonal"
          prepend-icon="mdi-file-document-plus"
          @click="requestDialog = true"
        >
          Подати крафт
        </WiActionButton>
        <WiActionButton
          v-if="isAdmin"
          prepend-icon="mdi-hammer"
          @click="craftDialog = true"
        >
          Додати крафт
        </WiActionButton>
      </template>
    </WiPageHeader>

    <WiDataToolbar>
      <div class="crafting-control crafting-control--hero">
        <v-select
            v-model="selectedHeroId"
            :items="heroOptions"
            label="Персонаж"
            prepend-inner-icon="mdi-account"
            hide-details
            density="comfortable"
        />
      </div>
      <div class="crafting-control crafting-control--switch">
        <v-switch
            v-model="showUncraftedItems"
            color="info"
            inset
            hide-details
            label="Показати предмети, які ще не були вироблені персонажем"
        />
      </div>
      <template #summary>
        <v-chip color="success" variant="tonal" size="large">
          Сумарна знижка: {{ highestDiscountLabel }}
        </v-chip>
      </template>
    </WiDataToolbar>

    <WiPanel v-if="canSubmitCraftRequest" title="Мої заявки на крафт" icon="mdi-file-document-plus" class="mb-5">
      <template #actions>
        <v-chip v-if="pendingPlayerRequestCount" color="warning" variant="tonal" size="small">
          Очікують: {{ pendingPlayerRequestCount }}
        </v-chip>
      </template>
        <v-alert v-if="craftRequestListError" type="error" variant="tonal" class="mb-3">
          {{ craftRequestListError }}
        </v-alert>
        <v-alert v-if="craftRequestCancelSuccess" type="success" variant="tonal" class="mb-3">
          {{ craftRequestCancelSuccess }}
        </v-alert>

        <v-table v-if="playerCraftRequests.length" density="comfortable" class="request-table">
          <thead>
            <tr>
              <th>Статус</th>
              <th>Предмет</th>
              <th>Кількість</th>
              <th>Днів</th>
              <th>Подано</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="request in playerCraftRequests" :key="request.id">
              <td>
                <v-chip :color="getRequestStatusMeta(request.status).color" variant="tonal" size="small">
                  {{ getRequestStatusMeta(request.status).label }}
                </v-chip>
              </td>
              <td>
                <div class="font-weight-medium">{{ request.itemName || request.itemSlug }}</div>
              </td>
              <td>{{ request.amountCrafted }}</td>
              <td>{{ request.craftDaysSpent }}</td>
              <td>{{ formatRequestDate(request.createdAt) }}</td>
              <td class="text-right">
                <v-btn
                  v-if="request.status === 'pending'"
                  color="error"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-close-circle-outline"
                  :loading="cancellingRequestId === request.id"
                  @click="cancelPlayerCraftRequest(request)"
                >
                  Скасувати
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-alert v-else type="info" variant="tonal">
          Після подачі заявки її статус з'явиться тут.
        </v-alert>
    </WiPanel>

    <v-row class="mb-5" dense>
      <v-col cols="12" md="6" lg="3" v-for="card in summaryCards" :key="card.label">
        <WiMetricCard :label="card.label" :value="card.value" :note="card.subtext" />
      </v-col>
    </v-row>

    <v-row dense class="mb-5">
      <v-col cols="12" lg="7">
        <WiPanel title="Прогрес крафту персонажа" icon="mdi-chart-line" class="mb-5">
          <template #actions>
            <v-chip color="success" variant="tonal">
              {{ selectedHero?.name || 'Не вибрано' }}
            </v-chip>
          </template>
            <WiSectionHeader title="Прогрес категорії" />
            <v-row>
              <v-col v-for="category in categoryRows" :key="category.key" cols="12" md="6">
                <CraftingProgressBar
                  :label="`${category.name} • ${category.discountPercent.toFixed(2)}%`"
                  :value="category.current"
                  :max="category.max"
                  color="info"
                />
              </v-col>
            </v-row>

            <WiSectionHeader title="Прогрес підкатегорії" class="mt-4" />
            <v-row>
              <v-col v-for="subcategory in subcategoryRows" :key="subcategory.key" cols="12" md="6">
                <CraftingProgressBar
                  :label="`${subcategory.category} / ${subcategory.name} • ${subcategory.discountPercent.toFixed(2)}%`"
                  :value="subcategory.current"
                  :max="subcategory.max"
                  color="info"
                />
              </v-col>
            </v-row>
        </WiPanel>
      </v-col>

      <v-col cols="12" lg="5">
        <WiPanel title="Найпопулярніші вироби" icon="mdi-star-four-points" class="mb-5" flush>
          <v-list density="comfortable" class="bg-transparent">
            <v-list-item
              v-for="row in craftedHighlights"
              :key="`highlight-${row.item.slug}`"
              :title="row.item.name"
              :subtitle="`${row.item.category} / ${row.item.subcategory}`"
            >
              <template #append>
                <v-chip size="small" color="info" variant="tonal">{{ row.progress.craftedAmount }}</v-chip>
              </template>
            </v-list-item>
            <v-list-item v-if="!craftedHighlights.length" title="Вироби відсутні" subtitle="Надайте майстру список виробів" />
          </v-list>
        </WiPanel>

        <WiPanel
          title="Калькулятор крафту"
          subtitle="Швидкий підрахунок фінальної ціни компонентів з врахуванням майстерності."
          icon="mdi-calculator"
        >
            <v-row dense>
              <v-col cols="12" md="6">
                <v-select
                  v-model="calculator.itemSlug"
                  :items="itemOptions"
                  label="Предмет"
                  density="comfortable"
                  hide-details
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="calculator.amount"
                  type="number"
                  min="1"
                  label="Кількість"
                  density="comfortable"
                  hide-details
                />
              </v-col>
            </v-row>

            <v-sheet class="calc-sheet mt-4 pa-4" rounded="lg" border>
              <div class="d-flex justify-space-between mb-2">
                <span>Ціна компонентів</span>
                <strong>{{ formatNumber(calculatorResult?.componentPrice) }}</strong>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>Знижка від категорії</span>
                <strong>{{ calculatorResult?.categoryDiscount?.toFixed(2) || '0.00' }}%</strong>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>Знижка від підкатегорії</span>
                <strong>{{ calculatorResult?.subcategoryDiscount?.toFixed(2) || '0.00' }}%</strong>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>Знижка від спеціалізації</span>
                <strong>{{ calculatorResult?.specializationDiscount?.toFixed(2) || '0.00' }}%</strong>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>Сумарна знижка</span>
                <v-chip color="success" size="small" variant="tonal">
                  {{ calculatorResult?.totalDiscount?.toFixed(1) || '0.0' }} / 25%
                </v-chip>
              </div>
              <v-divider class="my-3" />
              <div class="d-flex justify-space-between mb-2">
                <span>Ціна компонентів зі знижкою</span>
                <strong>{{ formatNumber(calculatorResult?.discountedUnitComponentPrice) }}</strong>
              </div>
              <div class="d-flex justify-space-between mb-2">
                <span>Кількість</span>
                <strong>{{ calculatorResult?.amount || 0 }}</strong>
              </div>
              <div class="d-flex justify-space-between text-h6 font-weight-bold mt-3">
                <span>Фінальна ціна</span>
                <span class="text-success">{{ formatNumber(calculatorResult?.finalTotalComponentPrice) }}</span>
              </div>
              <div class="text-caption text-medium-emphasis mt-3">
                Днів: {{ craftDaysTotal }} • СК: {{ selectedItem?.dc ?? 0 }}
              </div>
            </v-sheet>
        </WiPanel>
      </v-col>
    </v-row>

    <v-expansion-panels variant="accordion" class="mb-4">
      <v-expansion-panel>
        <v-expansion-panel-title>
          Прогрес майстерності крафту предметів ({{ visibleCraftRows.length }} рядків)
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th>Предмет</th>
                <th>Вироблено</th>
                <th>Категорія</th>
                <th>Підкатегорія</th>
                <th>Спеціалізація</th>
                <th>Сумарна знижка</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleCraftRows" :key="row.item.slug">
                <td>
                  <div class="font-weight-medium">{{ row.item.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ row.item.category }} / {{ row.item.subcategory }}</div>
                </td>
                <td>{{ row.progress.craftedAmount }}</td>
                <td>
                  <CraftingProgressBar
                    label="Категорія"
                    :value="row.progress.categoryContribution"
                    :max="100"
                    color="info"
                    :capped="row.progress.categoryCapped"
                    capped-hint="Прогрес цього предмета в даній категорії досягнув максимуму"
                  />
                </td>
                <td>
                  <CraftingProgressBar
                    label="Підкатегорія"
                    :value="row.progress.subcategoryContribution"
                    :max="100"
                    color="info"
                    :capped="row.progress.subcategoryCapped"
                    capped-hint="Прогрес цього предмета в даній підкатегорії досягнув максимуму"
                  />
                </td>
                <td>
                  <CraftingProgressBar
                    label="Майстерність предмета"
                    :value="row.progress.specializationProgress"
                    :max="100"
                    color="amber"
                    :capped="row.progress.specializationCapped"
                    capped-hint="Досягнуто максимальний рівень майстерності"
                  />
                </td>
                <td>{{ row.discount.totalDiscount.toFixed(2) }}%</td>
                <td>
                  <div v-if="row.progress.categoryCapped" class="text-caption">Для подальшого прогресу категорії виробляйте інші предмети з цієї категорії</div>
                  <div v-if="row.progress.subcategoryCapped" class="text-caption">Для подальшого прогресу підкатегорії виробляйте інші предмети з цієї підкатегорії</div>
                  <v-chip v-if="row.progress.specializationCapped" size="x-small" color="amber" variant="tonal">Досягнуто максимальної майстерності</v-chip>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-dialog
      v-model="craftDialog"
      max-width="860"
      scrim="rgba(6, 12, 32, 0.78)"
    >
      <CraftActionForm
        :heroes="heroes"
        :items="craftItems"
        :default-hero-id="selectedHeroId"
        mode="admin"
        @saved="onCraftSaved"
      />
    </v-dialog>

    <v-dialog
      v-model="requestDialog"
      max-width="860"
      scrim="rgba(6, 12, 32, 0.78)"
    >
      <CraftActionForm
        :heroes="heroes"
        :items="craftItems"
        :default-hero-id="userStore.heroId"
        :locked-hero-id="userStore.heroId"
        mode="request"
        @saved="onCraftRequestSaved"
      />
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import CraftingProgressBar from '@/components/crafting/CraftingProgressBar.vue';
import CraftActionForm from '@/components/crafting/CraftActionForm.vue';
import WiActionButton from '@/components/ui/WiActionButton.vue';
import WiDataToolbar from '@/components/ui/WiDataToolbar.vue';
import WiMetricCard from '@/components/ui/WiMetricCard.vue';
import WiPageHeader from '@/components/ui/WiPageHeader.vue';
import WiPanel from '@/components/ui/WiPanel.vue';
import WiSectionHeader from '@/components/ui/WiSectionHeader.vue';
import {
  cancelCraftingRequest,
  getEmptyCraftingState,
  loadCraftItems,
  loadHeroesForCrafting,
  subscribeHeroCraftingRequests,
} from '@/services/craftingService';
import {
  calculateFutureCraftPrice,
  getItemDiscountBreakdown,
  getSortedCraftRows,
  recalculateHeroCrafting,
} from '@/utils/crafting/craftingCalculations';
import { useUserStore } from '@/store/userStore';

const userStore = useUserStore();
const isAdmin = computed(() => userStore.isAdmin ?? false);
const canSubmitCraftRequest = computed(() => userStore.isHeroUser && !isAdmin.value);

const heroes = ref([]);
const craftItems = ref([]);
const selectedHeroId = ref('');
const craftDialog = ref(false);
const requestDialog = ref(false);
const showUncraftedItems = ref(false);
const playerCraftRequests = ref([]);
const craftRequestListError = ref('');
const craftRequestCancelSuccess = ref('');
const cancellingRequestId = ref('');
let stopPlayerCraftRequests = null;

const calculator = reactive({ itemSlug: '', amount: 1 });

const heroOptions = computed(() => heroes.value.map((hero) => ({ title: hero.name, value: hero.id })));
const itemOptions = computed(() => craftItems.value.map((item) => ({ title: item.name, value: item.slug })));

const selectedHero = computed(() => heroes.value.find((hero) => hero.id === selectedHeroId.value) || null);
const selectedItem = computed(() => craftItems.value.find((item) => item.slug === calculator.itemSlug) || null);

const normalizedCrafting = computed(() =>
  recalculateHeroCrafting(selectedHero.value?.crafting || getEmptyCraftingState(), craftItems.value),
);

const categoryRows = computed(() =>
  Object.entries(normalizedCrafting.value.categoryProgress)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.progressPercent - a.progressPercent),
);

const subcategoryRows = computed(() =>
  Object.entries(normalizedCrafting.value.subcategoryProgress)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.progressPercent - a.progressPercent),
);

const craftRows = computed(() =>
  getSortedCraftRows(normalizedCrafting.value, craftItems.value).map((row) => ({
    ...row,
    discount: getItemDiscountBreakdown(normalizedCrafting.value, row.item),
  })),
);

const visibleCraftRows = computed(() =>
  showUncraftedItems.value ? craftRows.value : craftRows.value.filter((row) => row.progress.craftedAmount > 0),
);

const craftedHighlights = computed(() =>
  craftRows.value
    .filter((row) => row.progress.craftedAmount > 0)
    .slice(0, 6),
);

const highestDiscount = computed(() =>
  craftRows.value.reduce((acc, row) => Math.max(acc, row.discount.totalDiscount), 0),
);

const highestDiscountLabel = computed(() => `${highestDiscount.value.toFixed(1)} / 25%`);
const pendingPlayerRequestCount = computed(() =>
  playerCraftRequests.value.filter((request) => request.status === 'pending').length,
);
const craftDaysTotal = computed(() => (selectedItem.value?.craftDays ?? 0) * (calculatorResult.value?.amount ?? 0));

const summaryCards = computed(() => {
  const rows = craftRows.value;
  const cappedCategory = rows.filter((row) => row.progress.categoryCapped).length;
  const cappedSubcategory = rows.filter((row) => row.progress.subcategoryCapped).length;
  const cappedSpecialization = rows.filter((row) => row.progress.specializationCapped).length;

  return [
    {
      label: 'Всього створено',
      value: normalizedCrafting.value.summary.totalItemsCrafted || 0,
      subtext: 'Усі творіння вибраного персонажа',
    },
    {
      label: 'Найкраща знижка',
      value: `${highestDiscount.value.toFixed(1)}%`,
      subtext: 'Максимальна знижка',
    },
    {
      label: 'Прокачані категорії',
      value: cappedCategory,
      subtext: 'Кількість предметів, які досягнули максимуму прогресу категорії',
    },
    {
      label: 'Прокачані підкатегорії',
      value: cappedSubcategory,
      subtext: 'Кількість предметів, які досягнули максимуму прогресу підкатегорії',
    },
    {
      label: 'Майстерність',
      value: cappedSpecialization,
      subtext: 'Кількість предметів, які досягнули максимуму в майстерності',
    },
  ];
});

const calculatorResult = computed(() => {
  if (!selectedItem.value) return null;
  return calculateFutureCraftPrice(normalizedCrafting.value, selectedItem.value, calculator.amount);
});

function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

function getTimestampMillis(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'number') return value;
  return 0;
}

function formatRequestDate(value) {
  const millis = getTimestampMillis(value);
  if (!millis) return '—';
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(millis));
}

function getRequestStatusMeta(status) {
  if (status === 'approved') return { label: 'Підтверджено', color: 'success' };
  if (status === 'rejected') return { label: 'Відхилено', color: 'error' };
  if (status === 'cancelled') return { label: 'Скасовано', color: 'grey' };
  return { label: 'Очікує адміна', color: 'warning' };
}

async function loadData() {
  const [loadedHeroes, loadedItems] = await Promise.all([loadHeroesForCrafting(), loadCraftItems()]);
  heroes.value = loadedHeroes;
  craftItems.value = loadedItems;

  if (!loadedHeroes.some((hero) => hero.id === selectedHeroId.value)) {
    selectedHeroId.value = userStore.heroId && loadedHeroes.some((hero) => hero.id === userStore.heroId)
      ? userStore.heroId
      : loadedHeroes[0]?.id || '';
  }
  if (!calculator.itemSlug && loadedItems.length) {
    calculator.itemSlug = loadedItems[0].slug;
  }
}

async function onCraftSaved() {
  craftDialog.value = false;
  await loadData();
}

async function onCraftRequestSaved() {
  requestDialog.value = false;
}

function subscribePlayerRequests() {
  stopPlayerCraftRequests?.();
  stopPlayerCraftRequests = null;
  craftRequestListError.value = '';
  playerCraftRequests.value = [];

  if (!canSubmitCraftRequest.value || !userStore.heroId) return;

  stopPlayerCraftRequests = subscribeHeroCraftingRequests(
    userStore.heroId,
    (requests) => {
      playerCraftRequests.value = requests;
    },
  );
}

async function cancelPlayerCraftRequest(request) {
  if (!request?.id || request.status !== 'pending') return;

  craftRequestListError.value = '';
  craftRequestCancelSuccess.value = '';
  cancellingRequestId.value = request.id;

  try {
    await cancelCraftingRequest({
      requestId: request.id,
      heroId: userStore.heroId,
      cancelledBy: userStore.nickname || null,
    });
    craftRequestCancelSuccess.value = 'Заявку скасовано.';
  } catch (error) {
    console.error('[crafting] failed to cancel request', error);
    craftRequestListError.value = error?.message || 'Не вдалося скасувати заявку.';
  } finally {
    cancellingRequestId.value = '';
  }
}

watch(() => [canSubmitCraftRequest.value, userStore.heroId], subscribePlayerRequests, { immediate: true });

onMounted(loadData);
onBeforeUnmount(() => stopPlayerCraftRequests?.());
</script>

<style scoped>
.crafting-page {
  padding-top: 24px;
}

.crafting-control {
  min-width: 220px;
}

.crafting-control--hero {
  flex: 0 1 360px;
}

.crafting-control--switch {
  flex: 1 1 360px;
}

/* ── Calculator result sheet ─────────────────────────────────── */
.calc-sheet {
  background: rgba(8, 5, 2, 0.65) !important;
  border-color: var(--wi-border) !important;
  font-family: var(--wi-font-body);
  color: var(--wi-text);
}

.calc-sheet strong { color: var(--wi-gold); }

.calc-sheet :deep(.v-divider) { border-color: var(--wi-border) !important; }

/* ── Expansion panel (items table) ──────────────────────────── */
:deep(.v-expansion-panels) {
  border: 1px solid var(--wi-border);
  border-radius: 12px !important;
  overflow: hidden;
}

:deep(.v-expansion-panel) {
  border-radius: 12px !important;
}

:deep(.v-expansion-panel-title) {
  font-family: var(--wi-font-heading);
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wi-gold);
  background: rgba(14, 9, 4, 0.9);
  border-radius: 12px !important;
  padding: 16px 20px;
}

:deep(.v-expansion-panel--active .v-expansion-panel-title) {
  border-radius: 12px 12px 0 0 !important;
}

:deep(.v-expansion-panel-text__wrapper) {
  background: rgba(10, 6, 2, 0.85);
  padding: 16px 20px;
}

:deep(.v-expansion-panel-text .v-table thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.68rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase;
  color: var(--wi-text-muted) !important;
  background: #1a1108 !important;
  border-bottom: 1px solid var(--wi-border) !important;
}

:deep(.v-expansion-panel-text .v-table tbody tr td) {
  color: var(--wi-text);
  font-family: var(--wi-font-body);
  border-bottom: 1px solid rgba(90, 62, 32, 0.25) !important;
  background: transparent !important;
}

.request-table {
  background: transparent !important;
}

/* ── List (top crafted items) ────────────────────────────────── */
.crafting-page :deep(.v-list-item-title) {
  font-family: var(--wi-font-body);
  color: var(--wi-text);
}

.crafting-page :deep(.v-list-item-subtitle) {
  font-family: var(--wi-font-body);
  color: var(--wi-text-muted);
}

.crafting-page :deep(.v-divider) { border-color: var(--wi-border) !important; }

@media (max-width: 760px) {
  .crafting-control {
    width: 100%;
  }
}
</style>
