<template>
  <v-container class="crafting-page pb-8">
    <v-sheet class="hero-banner pa-5 pa-md-8 mb-5" rounded="xl">
      <div class="d-flex flex-column flex-md-row justify-space-between ga-4">
        <div>
          <h1 class="text-h3 font-weight-bold mb-2">Майстерність крафту</h1>
          <p class="text-body-1 text-medium-emphasis text-info mb-0">
            Панель прогресу для категорій, сабкатегорій, спеціалізації та розрахунку ціни компонентів.
          </p>
        </div>

        <div class="d-flex flex-wrap ga-2 align-start">
          <v-btn color="info" variant="tonal" prepend-icon="mdi-refresh" @click="loadData">Оновити</v-btn>
          <v-btn
            v-if="isAdmin"
            color="primary"
            prepend-icon="mdi-hammer"
            @click="craftDialog = true"
          >
            Додати крафт
          </v-btn>
        </div>
      </div>
    </v-sheet>

    <v-row dense class="mb-4">
      <v-col cols="12" md="6" lg="4">
        <v-select
            v-model="selectedHeroId"
            :items="heroOptions"
            label="Персонаж"
            prepend-inner-icon="mdi-account"
            hide-details
            density="comfortable"
            class="rounded-lg"
        />
      </v-col>
      <v-col cols="12" md="6" lg="4">
        <v-switch
            v-model="showUncraftedItems"
            color="info"
            inset
            hide-details
            label="Показати предмети, які ще не були вироблені персонажем"
        />
      </v-col>
      <v-col cols="12" lg="4" class="d-flex align-center justify-lg-end">
        <v-chip color="success" variant="tonal" size="large">
          Сумарна знижка: {{ highestDiscountLabel }}
        </v-chip>
      </v-col>
    </v-row>

    <v-row class="mb-2" dense>
      <v-col cols="12" md="6" lg="3" v-for="card in summaryCards" :key="card.label">
        <v-card class="metric-card" rounded="xl" variant="tonal">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">{{ card.label }}</div>
            <div class="text-h4 font-weight-bold my-1">{{ card.value }}</div>
            <div class="text-caption">{{ card.subtext }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row dense>
      <v-col cols="12" lg="7">
        <v-card rounded="xl" class="panel-card mb-4" elevation="2">
          <v-card-title class="d-flex justify-space-between align-center">
            <span>Прогрес крафту персонажа</span>
            <v-chip color="success" variant="tonal">
              {{ selectedHero?.name || 'Не вибрано' }}
            </v-chip>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <div class="text-subtitle-1 mb-1 font-weight-bold">Прогрес категорії</div>
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

            <div class="text-subtitle-1 mt-4 mb-1 font-weight-bold">Прогрес підкатегорії</div>
            <v-row>
              <v-col v-for="subcategory in subcategoryRows" :key="subcategory.key" cols="12" md="6">
                <CraftingProgressBar
                  :label="`${subcategory.category} / ${subcategory.name} • ${subcategory.discountPercent.toFixed(2)}%`"
                  :value="subcategory.current"
                  :max="subcategory.max"
                  color="deep-purple-accent-2"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="5">
        <v-card rounded="xl" class="panel-card mb-4" elevation="2">
          <v-card-title>Найпопулярніші вироби</v-card-title>
          <v-divider />
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
        </v-card>

        <v-card rounded="xl" class="panel-card" elevation="2">
          <v-card-title>Калькулятор крафту</v-card-title>
          <v-card-subtitle>Швидкий підрахунок фінальної ціни компонентів з врахуванням майстерності.</v-card-subtitle>
          <v-card-text>
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
                Days: {{ (selectedItem?.craftDays ?? 0) * (calculatorResult?.amount) }} • DC: {{ selectedItem?.dc ?? 0 }}
              </div>
            </v-sheet>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-expansion-panels variant="accordion" class="mb-4">
      <v-expansion-panel>
        <v-expansion-panel-title>
          Прогрес майстерності крафту предметів ({{ visibleCraftRows.length }} rows)
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
                    label="Category"
                    :value="row.progress.categoryContribution"
                    :max="100"
                    color="info"
                    :capped="row.progress.categoryCapped"
                    capped-hint="Прогрес цього предмета в даній категорії досягнув максимуму"
                  />
                </td>
                <td>
                  <CraftingProgressBar
                    label="Subcategory"
                    :value="row.progress.subcategoryContribution"
                    :max="100"
                    color="deep-purple-accent-2"
                    :capped="row.progress.subcategoryCapped"
                    capped-hint="Прогрес цього предмета в даній підкатегорії досягнув максимуму"
                  />
                </td>
                <td>
                  <CraftingProgressBar
                    label="Item mastery"
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

    <v-dialog v-model="craftDialog" max-width="860">
      <CraftActionForm
        :heroes="heroes"
        :items="craftItems"
        :default-hero-id="selectedHeroId"
        @saved="onCraftSaved"
      />
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import CraftingProgressBar from '@/components/crafting/CraftingProgressBar.vue';
import CraftActionForm from '@/components/crafting/CraftActionForm.vue';
import { loadCraftItems, loadHeroesForCrafting, getEmptyCraftingState } from '@/services/craftingService';
import {
  calculateFutureCraftPrice,
  getItemDiscountBreakdown,
  getSortedCraftRows,
  recalculateHeroCrafting,
} from '@/utils/crafting/craftingCalculations';
import { useUserStore } from '@/store/userStore';

const userStore = useUserStore();
const isAdmin = computed(() => userStore.isAdmin);

const heroes = ref([]);
const craftItems = ref([]);
const selectedHeroId = ref('');
const craftDialog = ref(false);
const showUncraftedItems = ref(false);

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

async function loadData() {
  const [loadedHeroes, loadedItems] = await Promise.all([loadHeroesForCrafting(), loadCraftItems()]);
  heroes.value = loadedHeroes;
  craftItems.value = loadedItems;

  if (!selectedHeroId.value && loadedHeroes.length) {
    selectedHeroId.value = loadedHeroes[0].id;
  }
  if (!calculator.itemSlug && loadedItems.length) {
    calculator.itemSlug = loadedItems[0].slug;
  }
}

async function onCraftSaved() {
  craftDialog.value = false;
  await loadData();
}

onMounted(loadData);
</script>

<style scoped>
.crafting-page {
  background: radial-gradient(circle at top, rgba(26, 69, 138, 0.25), rgba(6, 12, 32, 0.02) 40%);
}

.hero-banner {
  background: linear-gradient(135deg, rgba(7, 12, 33, 0.95) 0%, rgba(14, 29, 68, 0.92) 100%);
  color: #f5f8ff;
  border: 1px solid rgba(130, 164, 255, 0.25);
  box-shadow: 0 16px 40px rgba(8, 19, 56, 0.35);
}

.metric-card {
  backdrop-filter: blur(8px);
  border: 1px solid rgba(100, 125, 255, 0.2);
}

.panel-card {
  border: 1px solid rgba(130, 164, 255, 0.15);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 255, 0.98));
}

.calc-sheet {
  background: linear-gradient(180deg, rgba(242, 248, 255, 0.8), rgba(247, 250, 255, 0.95));
}
</style>
