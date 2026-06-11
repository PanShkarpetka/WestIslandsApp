<template>
  <v-card class="pa-4 craft-action-card" elevation="10">
    <div class="text-h6 mb-3">{{ title }}</div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-2">{{ error }}</v-alert>
    <v-alert v-if="success" type="success" variant="tonal" class="mb-2">{{ success }}</v-alert>

    <v-row>
      <v-col cols="12" md="4">
        <v-select v-model="form.heroId" :items="heroOptions" label="Hero" :disabled="heroLocked" />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="form.itemSlug" :items="itemOptions" label="Item" />
      </v-col>
      <v-col cols="12" :md="isRequestMode ? 2 : 2">
        <v-text-field v-model.number="form.amount" type="number" min="1" label="Amount" />
      </v-col>
      <v-col v-if="isRequestMode" cols="12" md="2">
        <v-text-field v-model.number="form.daysSpent" type="number" min="1" label="Зайняло днів" />
      </v-col>
      <v-col cols="12" :md="isRequestMode ? 12 : 2" class="d-flex align-end">
        <v-btn color="primary" block :loading="saving" @click="submit">{{ submitLabel }}</v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { registerCraftAction, submitCraftingRequest } from '@/services/craftingService';
import { useUserStore } from '@/store/userStore';

const props = defineProps({
  heroes: { type: Array, required: true },
  items: { type: Array, required: true },
  defaultHeroId: { type: String, default: '' },
  mode: { type: String, default: 'admin' },
  lockedHeroId: { type: String, default: '' },
});

const emit = defineEmits(['saved']);
const userStore = useUserStore();

const form = reactive({ heroId: '', itemSlug: '', amount: 1, daysSpent: 1 });
const error = ref('');
const success = ref('');
const saving = ref(false);

const heroOptions = computed(() => props.heroes.map((hero) => ({ title: hero.name, value: hero.id })));
const itemOptions = computed(() => props.items.map((item) => ({ title: item.name, value: item.slug })));
const isRequestMode = computed(() => props.mode === 'request');
const heroLocked = computed(() => isRequestMode.value && !!props.lockedHeroId);
const title = computed(() => (isRequestMode.value ? 'Подати заявку на крафт' : 'Register craft action'));
const submitLabel = computed(() => (isRequestMode.value ? 'Подати заявку' : 'Submit'));

watch(
  () => props.defaultHeroId,
  (value) => {
    if (props.lockedHeroId) form.heroId = props.lockedHeroId;
    else if (value) form.heroId = value;
  },
  { immediate: true },
);

watch(
  () => props.lockedHeroId,
  (value) => {
    if (value) form.heroId = value;
  },
  { immediate: true },
);

watch(
  () => props.items,
  (value) => {
    if (!form.itemSlug && value?.length) form.itemSlug = value[0].slug;
  },
  { immediate: true },
);

async function submit() {
  error.value = '';
  success.value = '';

  if (!form.heroId || !form.itemSlug) {
    error.value = 'Hero and item are required.';
    return;
  }

  if (!Number(form.amount) || Number(form.amount) <= 0) {
    error.value = 'Amount crafted must be greater than 0.';
    return;
  }

  if (isRequestMode.value && (!Number(form.daysSpent) || Number(form.daysSpent) <= 0)) {
    error.value = 'Вкажіть кількість днів більше нуля.';
    return;
  }

  saving.value = true;
  try {
    if (isRequestMode.value) {
      const hero = props.heroes.find((row) => row.id === form.heroId);
      await submitCraftingRequest({
        heroId: form.heroId,
        heroName: hero?.name || userStore.nickname || form.heroId,
        itemSlug: form.itemSlug,
        amountCrafted: Number(form.amount),
        craftDaysSpent: Number(form.daysSpent),
        craftItems: props.items,
        createdBy: userStore.nickname || null,
      });
      success.value = 'Заявку подано. Крафт зарахується після підтвердження адміна.';
    } else {
      await registerCraftAction({
        heroId: form.heroId,
        itemSlug: form.itemSlug,
        amountCrafted: Number(form.amount),
        craftItems: props.items,
        createdBy: userStore.nickname || null,
      });
      success.value = 'Craft action registered.';
    }
    emit('saved');
  } catch (err) {
    console.error('[crafting] register failed', err);
    error.value = isRequestMode.value ? 'Не вдалося подати заявку.' : 'Failed to register craft action.';
  } finally {
    saving.value = false;
  }
}
</script>


<style scoped>
.craft-action-card {
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid rgba(20, 37, 84, 0.16);
  backdrop-filter: none;
}
</style>
