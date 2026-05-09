<template>
  <v-container class="donations-page">
    <div class="donations-header">
      <div class="donations-title">
        <v-icon class="mr-2" size="20">mdi-hand-coin</v-icon>
        Цілі зборів
      </div>
      <v-btn v-if="isLoggedIn" class="add-bounty-btn" prepend-icon="mdi-plus" @click="createNewGoal">
        Новий збір
      </v-btn>
    </div>

    <div v-if="!sortedGoals.length" class="donations-empty">
      <v-icon class="mr-2" size="16">mdi-anchor</v-icon>
      Поки що немає цілей…
    </div>

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

const userStore = useUserStore()
const donationGoalStore = useDonationGoalStore()
const isAdmin = userStore.isAdmin;
const isLoggedIn = userStore.isLoggedIn;
const nickname = userStore.nickname;
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
.donations-page { padding-bottom: 16px; }

.donations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.donations-title {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-heading);
  font-size: 1.1rem;
  letter-spacing: 0.06em;
  color: var(--wi-gold);
}

.add-bounty-btn {
  font-family: var(--wi-font-heading) !important;
  letter-spacing: 0.07em !important;
  background: linear-gradient(180deg, #d4a233 0%, #a07020 100%) !important;
  color: #1a1209 !important;
  border: 1px solid var(--wi-gold-light) !important;
  font-size: 0.8rem !important;
}

.add-bounty-btn :deep(.v-btn__overlay) { opacity: 0 !important; }

.donations-empty {
  display: flex;
  align-items: center;
  font-family: var(--wi-font-body);
  font-style: italic;
  color: var(--wi-text-muted);
  padding: 24px 0;
}
</style>
