<template>
  <v-dialog v-model="dialog" max-width="1000px" scrollable>
    <WiDialogFrame :title="`Донати${donationGoal?.title ? ': ' + donationGoal.title : ''}`" icon="mdi-account-cash">
      <template #header-actions>
        <v-btn icon="mdi-close" variant="text" @click="close" aria-label="Закрити" />
      </template>

        <div class="donation-summary-stats">
          <div>Донатерів: <span class="font-weight-medium">{{ sortedDonations.length }}</span></div>
          <div>Транзакцій: <span class="font-weight-medium"> {{ donationStore.donations.length }}</span></div>
          <div>Всього зібрано: <span class="font-weight-bold">{{ donationsTotal }}</span></div>
        </div>

        <WiEmptyState v-if="sortedDonations.length === 0" title="Поки немає донатів на цю ціль" icon="mdi-account-cash-outline" />

        <v-list v-else density="comfortable" class="donation-list" border lines="two">
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
      <template #actions>
        <v-spacer />
        <WiActionButton variant="text" tone="muted" @click="close">Закрити</WiActionButton>
      </template>
    </WiDialogFrame>
  </v-dialog>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useDonationsStore } from '@/store/donationStore.js'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiDialogFrame from '@/components/ui/WiDialogFrame.vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'

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

<style scoped>
.donation-summary-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
  color: var(--wi-text-muted);
  font-size: 0.86rem;
}

.donation-summary-stats span {
  color: var(--wi-text);
}

.donation-list {
  border-color: var(--wi-border) !important;
  border-radius: var(--wi-radius-sm) !important;
  background: rgba(12, 8, 4, 0.28) !important;
}

@media (max-width: 640px) {
  .donation-summary-stats {
    grid-template-columns: 1fr;
    gap: 5px;
  }
}
</style>
