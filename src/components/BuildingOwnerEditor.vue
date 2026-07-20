<template>
  <section class="owner-admin-editor">
    <div class="owner-admin-title">
      <v-icon size="16">mdi-account-key</v-icon>
      Власник будівлі
    </div>
    <div class="owner-admin-fields">
      <v-select
        v-model="localOwnerType"
        :items="ownerTypeOptions"
        label="Тип власника"
        density="compact"
        hide-details="auto"
        @update:modelValue="localOwnerId = ''"
      />
      <v-select
        v-model="localOwnerId"
        :items="ownerOptions"
        item-title="name"
        item-value="id"
        :label="localOwnerType === 'guild' ? 'Гільдія-власник' : 'Герой-власник'"
        density="compact"
        hide-details="auto"
      />
      <WiActionButton
        size="small"
        prepend-icon="mdi-content-save"
        :loading="saving"
        :disabled="!localOwnerId"
        @click="saveOwner"
      >
        Зберегти власника
      </WiActionButton>
    </div>
    <v-alert v-if="error" type="error" density="compact" variant="tonal" class="mt-2">{{ error }}</v-alert>
    <v-alert v-if="success" type="success" density="compact" variant="tonal" class="mt-2">{{ success }}</v-alert>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import { useHeroesStore } from '@/store/heroesStore.js'
import { useGuildStore } from '@/store/guildStore.js'
import { useIslandStore } from '@/store/islandStore.js'

const props = defineProps({
  buildingKey: { type: String, required: true },
  buildingEntry: { type: Object, required: true },
})

const heroesStore = useHeroesStore()
const guildStore = useGuildStore()
const islandStore = useIslandStore()
const localOwnerType = ref('hero')
const localOwnerId = ref('')
const saving = ref(false)
const error = ref('')
const success = ref('')

const ownerType = computed(() => props.buildingEntry.ownerType
  || (props.buildingEntry.ownerGuildId ? 'guild' : 'hero'))
const ownerId = computed(() => props.buildingEntry.ownerId
  || props.buildingEntry.ownerGuildId
  || props.buildingEntry.ownerHeroId
  || '')
const ownerTypeOptions = [
  { title: 'Герой', value: 'hero' },
  { title: 'Гільдія', value: 'guild' },
]
const ownerOptions = computed(() => localOwnerType.value === 'guild'
  ? guildStore.guilds.map(guild => ({ id: guild.id, name: guild.name || guild.id }))
  : heroesStore.heroes
    .filter(hero => !hero.inactive)
    .map(hero => ({ id: hero.id, name: hero.name || hero.id })))

watch(() => [ownerType.value, ownerId.value], ([type, id]) => {
  localOwnerType.value = type
  localOwnerId.value = id
  error.value = ''
  success.value = ''
}, { immediate: true })

async function saveOwner() {
  if (saving.value || !localOwnerId.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await islandStore.updateYieldBuildingOwner(props.buildingKey, {
      ownerType: localOwnerType.value,
      ownerId: localOwnerId.value,
    })
    success.value = 'Власника збережено. Будівля відображатиметься у списку героя або гільдії.'
  } catch (saveError) {
    error.value = saveError?.message || 'Не вдалося зберегти власника.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.owner-admin-editor {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid rgba(58, 96, 128, 0.45);
  border-radius: var(--wi-radius-sm);
  background: rgba(58, 96, 128, 0.08);
}
.owner-admin-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: var(--wi-sea);
  font-family: var(--wi-font-heading);
  font-size: 0.82rem;
}
.owner-admin-fields {
  display: grid;
  grid-template-columns: minmax(130px, 0.7fr) minmax(180px, 1fr) auto;
  gap: 10px;
  align-items: start;
}
@media (max-width: 700px) {
  .owner-admin-fields { grid-template-columns: 1fr; }
}
</style>
