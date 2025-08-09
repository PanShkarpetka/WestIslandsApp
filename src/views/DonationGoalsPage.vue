<template>
  <v-container>
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">Цілі зборів</h1>
      </v-col>
      <v-col cols="12" sm="6" class="text-sm-end" v-if="isAdmin">
        <v-btn color="primary" @click="createNewGoal">
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
            @edit="editGoal"
            @delete="deleteGoal"
        />
      </div>
    </div>

    <DonationGoalDialog
        v-model:visible="dialogVisible"
        :goal="selectedGoal"
        @saved="onSaved"
    />
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useDonationGoalStore } from '../store/donationGoalStore'
import { useUserStore } from '../store/userStore'
import DonationGoalCard from '../components/DonationGoalCard.vue'
import DonationGoalDialog from '../components/DonationGoalDialog.vue'

const userStore = useUserStore()
const donationGoalStore = useDonationGoalStore()

const isAdmin = userStore.isAdmin;
const isLoggedIn = userStore.isLoggedIn;
const dialogVisible = ref(false)
const selectedGoal = ref(null)

onMounted(() => {
  donationGoalStore.subscribeToGoals()
})

const sortedGoals = computed(() => {
  const goals = Array.isArray(donationGoalStore.goals) ? donationGoalStore.goals.slice() : []
  return goals.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
})

function createNewGoal() {
  selectedGoal.value = null
  dialogVisible.value = true
}

function editGoal(goal) {
  selectedGoal.value = { ...goal }
  dialogVisible.value = true
}

function deleteGoal(goal) {
  donationGoalStore.deleteGoal(goal.id)
}

function onSaved() {
  dialogVisible.value = false
  selectedGoal.value = null
}
</script>
<style scoped>
.donation-goal-wrapper {
  margin-bottom: 20px;
}
</style>