<template>
  <v-dialog v-model="dialog" max-width="1000px" scrollable>
    <v-card rounded="xl" elevation="12">
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h6 font-weight-bold">
          Донати для{{ donationGoal?.title ? ': ' + donationGoal.title : '' }}
        </span>
        <v-btn icon variant="text" @click="close" aria-label="Закрити">✕</v-btn>
      </v-card-title>

      <v-card-text>
        <div class="d-flex align-center justify-space-between mb-3 text-body-2 text-medium-emphasis">
          <div>Донатерів: <span class="font-weight-medium">{{ sortedDonations.length }}</span></div>
          <div>Транзакцій: <span class="font-weight-medium"> {{ donationStore.donations.length }}</span></div>
          <div>Всього зібрано: <span class="font-weight-bold">{{ donationsTotal }}</span></div>
        </div>

        <div v-if="sortedDonations.length === 0" class="py-6 text-center text-medium-emphasis">
          Поки немає донатів на цю ціль.
        </div>

        <v-list v-else density="comfortable" class="rounded-lg" border lines="two">
          <v-list-item v-for="donation in sortedDonations" :key="donation.character">
            <template #title>
              <div class="text-body-1 font-weight-semibold text-truncate">
                {{ donation.character || 'Анонім' }}
              </div>
            </template>
            <template #append>
              <div class="text-right font-weight-bold">
                {{ donation.total }}
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn variant="flat" color="primary" @click="close">Закрити</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useDonationsStore } from '@/store/donationStore.js'

const props = defineProps({
  visible: { type: Boolean, default: false },
  donationGoal: { type: Object, default: null },
})
const emit = defineEmits(['update:visible'])

const donationStore = useDonationsStore()

const dialog = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v),
})

function close() { dialog.value = false }

let unsubscribe = null
function subscribe(id) {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
  if (id) {
    unsubscribe = donationStore.subscribeToDonationsByCharacter(id)
  }
}

onMounted(() => subscribe(props.donationGoal?.id))
onBeforeUnmount(() => { if (unsubscribe) unsubscribe() })
watch(() => props.donationGoal?.id, (id, oldId) => {
  if (id && id !== oldId) subscribe(id)
})

const sortedDonations = computed(() => donationStore.totalsByCharacter.slice())
const donationsTotal = computed(() =>
  donationStore.totalsByCharacter.slice().reduce((acc, d) => {
    acc += d.total
    return acc;
  }, 0)
)
</script>
