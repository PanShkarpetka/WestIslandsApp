<template>
  <v-container>
    <v-card class="pa-4 mb-4" elevation="2">
      <div class="text-h5 mb-3">Crafting Mastery</div>

      <v-row>
        <v-col cols="12" md="4">
          <v-select v-model="selectedHeroId" :items="heroOptions" label="Hero" hide-details="auto" />
        </v-col>
        <v-col cols="12" md="4">
          <v-select v-model="calculator.itemSlug" :items="itemOptions" label="Calculator item" hide-details="auto" />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field v-model.number="calculator.amount" type="number" min="1" label="Amount to craft" hide-details="auto" />
        </v-col>
      </v-row>
    </v-card>

    <v-row class="mb-2">
      <v-col cols="12" md="3" v-for="card in summaryCards" :key="card.label">
        <v-card variant="tonal" class="pa-3">
          <div class="text-caption">{{ card.label }}</div>
          <div class="text-h6">{{ card.value }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="pa-4 mb-4" variant="outlined">
      <div class="text-h6 mb-3">Category progress</div>
      <v-row>
        <v-col v-for="category in categoryRows" :key="category.key" cols="12" md="6">
          <CraftingProgressBar
            :label="`${category.name} • ${category.discountPercent.toFixed(2)}%`"
            :value="category.current"
            :max="category.max"
            color="blue"
          />
        </v-col>
      </v-row>

      <div class="text-h6 mt-4 mb-3">Subcategory progress</div>
      <v-row>
        <v-col v-for="subcategory in subcategoryRows" :key="subcategory.key" cols="12" md="6">
          <CraftingProgressBar
            :label="`${subcategory.category} / ${subcategory.name} • ${subcategory.discountPercent.toFixed(2)}%`"
            :value="subcategory.current"
            :max="subcategory.max"
            color="deep-purple"
          />
        </v-col>
      </v-row>
    </v-card>

    <CraftActionForm
      v-if="isAdmin"
      class="mb-4"
      :heroes="heroes"
      :items="craftItems"
      :default-hero-id="selectedHeroId"
      @saved="loadData"
    />

    <v-card class="pa-4 mb-4" variant="outlined">
      <div class="text-h6 mb-3">Future craft discount calculator</div>
      <div v-if="calculatorResult">
        <v-row dense>
          <v-col cols="12" md="3">Component price per unit: {{ formatNumber(calculatorResult.componentPrice) }}</v-col>
          <v-col cols="12" md="3">Base total component price: {{ formatNumber(calculatorResult.baseTotalComponentPrice) }}</v-col>
          <v-col cols="12" md="3">Category discount: {{ calculatorResult.categoryDiscount.toFixed(2) }}%</v-col>
          <v-col cols="12" md="3">Subcategory discount: {{ calculatorResult.subcategoryDiscount.toFixed(2) }}%</v-col>
          <v-col cols="12" md="3">Specialization discount: {{ calculatorResult.specializationDiscount.toFixed(2) }}%</v-col>
          <v-col cols="12" md="3">Total discount: {{ calculatorResult.totalDiscount.toFixed(1) }} / 25%</v-col>
          <v-col cols="12" md="3">Discounted unit price: {{ formatNumber(calculatorResult.discountedUnitComponentPrice) }}</v-col>
          <v-col cols="12" md="3">Final total component price: {{ formatNumber(calculatorResult.finalTotalComponentPrice) }}</v-col>
          <v-col cols="12" md="3">Weight: {{ selectedItem?.weight ?? '—' }}</v-col>
          <v-col cols="12" md="3">Days to craft: {{ selectedItem?.craftDays ?? 0 }}</v-col>
          <v-col cols="12" md="3">DC: {{ selectedItem?.dc ?? 0 }}</v-col>
        </v-row>
      </div>
    </v-card>

    <v-card class="pa-4" variant="outlined">
      <div class="text-h6 mb-3">Item progress</div>
      <v-table density="compact">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Subcategory</th>
            <th>Crafted</th>
            <th>Category progress</th>
            <th>Subcategory progress</th>
            <th>Item mastery</th>
            <th>Total discount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in craftRows" :key="row.item.slug">
            <td>{{ row.item.name }}</td>
            <td>{{ row.item.category }}</td>
            <td>{{ row.item.subcategory }}</td>
            <td>{{ row.progress.craftedAmount }}</td>
            <td>
              <CraftingProgressBar
                label="Category progress"
                :value="row.progress.categoryContribution"
                :max="100"
                color="blue"
                :capped="row.progress.categoryCapped"
                capped-hint="This item already gave its maximum category progress"
              />
            </td>
            <td>
              <CraftingProgressBar
                label="Subcategory progress"
                :value="row.progress.subcategoryContribution"
                :max="100"
                color="deep-purple"
                :capped="row.progress.subcategoryCapped"
                capped-hint="This item already gave its maximum subcategory progress"
              />
            </td>
            <td>
              <CraftingProgressBar
                label="Item mastery"
                :value="row.progress.specializationProgress"
                :max="100"
                color="amber"
                :capped="row.progress.specializationCapped"
                capped-hint="Item mastery maxed"
              />
            </td>
            <td>{{ row.discount.totalDiscount.toFixed(2) }}%</td>
            <td>
              <div v-if="row.progress.categoryCapped" class="text-caption">Craft another item from this category to progress further</div>
              <div v-if="row.progress.subcategoryCapped" class="text-caption">Craft another item from this subcategory to progress further</div>
              <v-chip v-if="row.progress.specializationCapped" size="x-small" color="amber" variant="tonal">Item mastery maxed</v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
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

const calculator = reactive({ itemSlug: '', amount: 1 });

const heroOptions = computed(() => heroes.value.map((hero) => ({ title: hero.name, value: hero.id })));
const itemOptions = computed(() => craftItems.value.map((item) => ({ title: item.name, value: item.slug })));

const selectedHero = computed(() => heroes.value.find((hero) => hero.id === selectedHeroId.value) || null);
const selectedItem = computed(() => craftItems.value.find((item) => item.slug === calculator.itemSlug) || null);

const normalizedCrafting = computed(() => {
  return recalculateHeroCrafting(selectedHero.value?.crafting || getEmptyCraftingState(), craftItems.value);
});

const categoryRows = computed(() =>
  Object.entries(normalizedCrafting.value.categoryProgress)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.name.localeCompare(b.name)),
);

const subcategoryRows = computed(() =>
  Object.entries(normalizedCrafting.value.subcategoryProgress)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
);

const craftRows = computed(() =>
  getSortedCraftRows(normalizedCrafting.value, craftItems.value).map((row) => ({
    ...row,
    discount: getItemDiscountBreakdown(normalizedCrafting.value, row.item),
  })),
);

const summaryCards = computed(() => {
  const rows = craftRows.value;
  const cappedCategory = rows.filter((row) => row.progress.categoryCapped).length;
  const cappedSubcategory = rows.filter((row) => row.progress.subcategoryCapped).length;
  const cappedSpecialization = rows.filter((row) => row.progress.specializationCapped).length;
  const highestDiscount = rows.reduce((acc, row) => Math.max(acc, row.discount.totalDiscount), 0);

  return [
    { label: 'Total items crafted', value: normalizedCrafting.value.summary.totalItemsCrafted || 0 },
    { label: 'Capped item-category rows', value: cappedCategory },
    { label: 'Capped item-subcategory rows', value: cappedSubcategory },
    { label: 'Maxed item masteries', value: cappedSpecialization },
    { label: 'Highest discount item', value: `${highestDiscount.toFixed(1)} / 25%` },
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

onMounted(loadData);
</script>
