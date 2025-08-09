<template>
  <v-card
      class="pa-4 donation-card"
      variant="outlined"
  >
    <div class="d-flex justify-space-between align-center mb-2">
      <div>
        <div class="text-h6 font-weight-bold">{{ goal.title }}</div>
        <div class="text-caption text-grey">
          Створено: {{ goal.createdAt.toDate().toLocaleString() }} <br />
          Автор: <strong>{{ goal.createdBy || 'Невідомо' }}</strong>
        </div>
      </div>

      <v-chip color="primary" label size="small">
        <v-icon size="16" class="mr-1" v-if="iconByType">{{ iconByType }}</v-icon>
        {{ goal.type || 'other' }}
      </v-chip>
    </div>

    <div class="mb-2 text-body-2">{{ goal.description }}</div>

    <v-progress-linear
        :model-value="progress"
        color="green"
        height="8"
        rounded
        class="mb-1"
    />

    <div class="text-caption text-right font-mono">
      {{ goal.currentAmount }} / {{ goal.targetAmount }} ₴
    </div>

    <div v-if="goal.targetBuildingKey" class="text-caption mt-2">
      🏗 Потрібно для будівлі: <strong>{{ goal.targetBuildingKey }}</strong>
    </div>

    <v-card-actions v-if="isAdmin">
      <v-spacer />
      <v-btn size="small" icon @click="$emit('edit', goal)">
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
      <v-btn size="small" icon color="red" @click="$emit('delete', goal.id)">
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
// import bgUrl from '@/assets/donations/gold-bg.png'


const props = defineProps({
  goal: {
    type: Object,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
})

const progress = computed(() => {
  const current = Number(props.goal.currentAmount || 0)
  const target = Number(props.goal.targetAmount || 1)
  return Math.min(100, Math.floor((current / target) * 100))
})

function formatDate(date) {
  if (!date) return ''
  try {
    const parsed = new Date(date)
    return parsed.toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return date
  }
}

const iconByType = computed(() => {
  const type = props.goal.type || ''
  if (type === 'building') return 'mdi-office-building'
  if (type === 'upgrade') return 'mdi-arrow-up-bold'
  if (type === 'event') return 'mdi-calendar-star'
  return 'mdi-dots-horizontal'
})
</script>
<style scoped>
.donation-card{
  background-size: cover;
  background-position: center;
  position: relative; overflow: hidden; color:#fff;
}

.donation-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5) url('@/assets/donations/gold-bg.png') center/cover no-repeat;
  filter: blur(2px) brightness(0.8);
  z-index: 0;
}

.donation-card > *{ position:relative; z-index:1; }
</style>