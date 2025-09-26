<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">Цілі зборів</h1>
      </v-col>
      <v-col cols="12" sm="6" class="text-sm-end">
        <v-btn color="primary" @click="createNewGoal" :disabled="!isLoggedIn">
          <v-icon start>mdi-plus</v-icon>
          Додати збір
        </v-btn>
      </v-col>
    </v-row>

    <div v-if="!sortedGoals.length">Поки що немає цілей...</div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="goal in sortedGoals" :key="goal.id" class="donation-goal-wrapper">
        <DonationGoalCard
            :goal="goal"
            :isAdmin="isAdmin"
            :isLoggedIn="isLoggedIn"
            :nickname="nickname"
            @click="openDonors(goal)"
        />
      </div>
    </div>

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

    if (a.treasure === true && b.treasure !== true) return -1;
    if (a.treasure !== true && b.treasure === true) return 1;

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
.donation-goal-wrapper {
  margin-bottom: 20px;
}
</style>
