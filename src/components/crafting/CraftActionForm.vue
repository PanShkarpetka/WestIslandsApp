<template>
  <v-card class="pa-4 craft-action-card" elevation="10">
    <div class="text-h6 mb-3">Register craft action</div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-2">{{ error }}</v-alert>
    <v-alert v-if="success" type="success" variant="tonal" class="mb-2">{{ success }}</v-alert>

    <v-row>
      <v-col cols="12" md="4">
        <v-select v-model="form.heroId" :items="heroOptions" label="Hero" />
      </v-col>
      <v-col cols="12" md="4">
        <v-select v-model="form.itemSlug" :items="itemOptions" label="Item" />
      </v-col>
      <v-col cols="12" md="2">
        <v-text-field v-model.number="form.amount" type="number" min="1" label="Amount" />
      </v-col>
      <v-col cols="12" md="2" class="d-flex align-end">
        <v-btn color="primary" block :loading="saving" @click="submit">Submit</v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { registerCraftAction } from '@/services/craftingService';
import { useUserStore } from '@/store/userStore';

const props = defineProps({
  heroes: { type: Array, required: true },
  items: { type: Array, required: true },
  defaultHeroId: { type: String, default: '' },
});

const emit = defineEmits(['saved']);
const userStore = useUserStore();

const form = reactive({ heroId: '', itemSlug: '', amount: 1 });
const error = ref('');
const success = ref('');
const saving = ref(false);

const heroOptions = computed(() => props.heroes.map((hero) => ({ title: hero.name, value: hero.id })));
const itemOptions = computed(() => props.items.map((item) => ({ title: item.name, value: item.slug })));

watch(
  () => props.defaultHeroId,
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

  saving.value = true;
  try {
    await registerCraftAction({
      heroId: form.heroId,
      itemSlug: form.itemSlug,
      amountCrafted: Number(form.amount),
      craftItems: props.items,
      createdBy: userStore.nickname || null,
    });
    success.value = 'Craft action registered.';
    emit('saved');
  } catch (err) {
    console.error('[crafting] register failed', err);
    error.value = 'Failed to register craft action.';
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
