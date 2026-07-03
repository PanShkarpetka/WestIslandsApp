<template>
  <v-container class="donations-page">
    <WiPageHeader title="Цілі зборів" icon="mdi-hand-coin">
      <template #actions>
        <WiActionButton v-if="isLoggedIn" prepend-icon="mdi-plus" @click="createNewGoal">
          Новий збір
        </WiActionButton>
      </template>
    </WiPageHeader>

    <WiPanel v-if="!sortedGoals.length">
      <WiEmptyState title="Поки що немає цілей зборів" icon="mdi-hand-coin-outline" />
    </WiPanel>

    <v-row v-else>
      <v-col v-for="goal in sortedGoals" :key="goal.id" cols="12" md="6" lg="4">
        <DonationGoalCard
          :goal="goal"
          :isAdmin="isAdmin"
          :isLoggedIn="isLoggedIn"
          :nickname="nickname"
          @click="openDonors(goal)"
        />
      </v-col>
    </v-row>

  </v-container>
  <DonationsSummaryDialog
      v-model:visible="donorsVisible"
      :donationGoal="selectedGoal"
  />
  <DonationGoalCreateDialog
      v-model="showCreate"
      :preset="{ createdBy: nickname }"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useDonationGoalStore } from '@/store/donationGoalStore'
import { useUserStore } from '@/store/userStore'
import DonationGoalCard from '@/components/DonationGoalCard.vue'
import DonationsSummaryDialog from '@/components/DonationsSummaryDialog.vue'
import DonationGoalCreateDialog from '@/components/DonationGoalCreateDialog.vue'
import {storeToRefs} from "pinia";
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiPageHeader from '@/components/ui/WiPageHeader.vue'
import WiPanel from '@/components/ui/WiPanel.vue'

const userStore = useUserStore()
const donationGoalStore = useDonationGoalStore()
const isAdmin = computed(() => userStore.isAdmin ?? false)
const isLoggedIn = computed(() => userStore.isLoggedIn ?? false)
const nickname = computed(() => userStore.nickname || '')
const donorsVisible = ref(false)
const selectedGoal = ref(null)
const showCreate = ref(false)
const { goals } = storeToRefs(donationGoalStore)

onMounted(() => {
  donationGoalStore.subscribeToGoals()
})
onUnmounted(() => {
  donationGoalStore.stop()
})

const sortedGoals = computed(() => {
  const isComplete = g =>
      g != null && g.targetAmount != null && g.currentAmount === g.targetAmount;

  return [...goals.value].sort((a, b) => {
    const aDone = isComplete(a);
    const bDone = isComplete(b);

    if (aDone !== bDone) return aDone ? 1 : -1;

    if (a.treasury === true && b.treasury !== true) return -1;
    if (a.treasury !== true && b.treasury === true) return 1;

    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
});

function createNewGoal() {
  showCreate.value = true
}

const openDonors = (goal) => {
  selectedGoal.value = goal
  donorsVisible.value = true
}
</script>
<style scoped>
.donations-page {
  padding-top: 24px;
  padding-bottom: 40px;
}
</style>
