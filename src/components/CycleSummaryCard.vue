<template>
  <div class="cycle-card">
    <v-icon class="cycle-card__icon" size="22">mdi-anchor</v-icon>

    <div class="cycle-card__section">
      <span class="cycle-card__label">{{ title }}</span>
      <span class="cycle-card__value">{{ currentStartDateLabel }}</span>
    </div>

    <div class="cycle-card__sep" />

    <div class="cycle-card__section">
      <span class="cycle-card__label">Тривалість попереднього циклу</span>
      <span class="cycle-card__value">{{ previousDurationLabel }}</span>
    </div>

    <div class="cycle-card__chips">
      <div v-if="season" class="cycle-card__season" :class="`cycle-card__season--${season.id}`">
        <v-icon size="18">{{ season.icon }}</v-icon>
        <span>{{ season.label }}</span>
      </div>

      <button
        v-if="weather"
        type="button"
        class="cycle-card__weather"
        :class="{ 'cycle-card__weather--clickable': canViewWeatherForecast }"
        :disabled="!canViewWeatherForecast"
        @click="openWeatherForecast"
      >
        <v-icon size="18">{{ weather.icon }}</v-icon>
        <span>Погода: {{ weather.title }}</span>
      </button>

      <slot name="chips" />
    </div>

    <v-dialog v-model="weatherDialogOpen" max-width="760">
      <v-card>
        <div class="cycle-card__dialog-header">
          <div>
            <div class="cycle-card__dialog-kicker">Прогноз погоди</div>
            <h3>Тиждень вперед</h3>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="weatherDialogOpen = false" />
        </div>

        <v-card-text>
          <div class="cycle-card__forecast-list">
            <article v-for="day in weatherForecast" :key="`${day.dayOffset}-${day.weatherId}`" class="cycle-card__forecast-day">
              <v-icon class="cycle-card__forecast-icon" size="22">{{ day.icon }}</v-icon>
              <div class="cycle-card__forecast-main">
                <div class="cycle-card__forecast-title">
                  <span>{{ day.date }}</span>
                  <strong>{{ day.title }}</strong>
                </div>
                <p>{{ day.summary }}</p>
                <small>{{ formatWeatherEffects(day.effects) }}</small>
              </div>
            </article>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="tonal" @click="weatherDialogOpen = false">Закрити</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Поточний цикл' },
  currentStartDate: { type: String, default: '' },
  previousCycleDuration: { type: String, default: '' },
  season: { type: Object, default: null },
  weather: { type: Object, default: null },
  weatherForecast: { type: Array, default: () => [] },
  canViewWeatherForecast: { type: Boolean, default: false },
})

const currentStartDateLabel = computed(() => props.currentStartDate || '—')
const previousDurationLabel = computed(() => props.previousCycleDuration || 'невідомо')
const weatherDialogOpen = ref(false)

function openWeatherForecast() {
  if (!props.canViewWeatherForecast) return
  weatherDialogOpen.value = true
}

function formatSigned(value) {
  const n = Number(value || 0)
  if (!n) return ''
  return n > 0 ? `+${n}` : String(n)
}

function formatMultiplier(value, label) {
  const n = Number(value || 1)
  if (n === 1) return ''
  const percent = Math.round((n - 1) * 100)
  return `${label} ${percent > 0 ? '+' : ''}${percent}%`
}

function formatWeatherEffects(effects = {}) {
  const parts = []
  const dc = formatSigned(effects.dcModifier)
  if (dc) parts.push(`DC ${dc}`)
  const sum = effects.sumModifier?.label
  if (sum && sum !== '0') parts.push(`сума ${sum}`)
  const fishValue = formatMultiplier(effects.fishValueMultiplier, 'ціна')
  if (fishValue) parts.push(fishValue)
  const treasure = Number(effects.treasureChanceMultiplier || 1)
  if (treasure !== 1) parts.push(`скарби x${treasure}`)
  return parts.length ? `Ефект: ${parts.join(', ')}` : 'Ефект: без змін'
}
</script>

<style scoped>
.cycle-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: var(--wi-surface);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
}

.cycle-card__icon {
  color: var(--wi-gold);
  flex-shrink: 0;
}

.cycle-card__sep {
  width: 1px;
  height: 28px;
  background: var(--wi-border);
  flex-shrink: 0;
}

.cycle-card__section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cycle-card__label {
  color: var(--wi-text-muted);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  line-height: 1;
}

.cycle-card__value {
  color: var(--wi-text);
  font-size: 0.9rem;
  font-family: 'Cinzel', serif;
  line-height: 1.3;
}

.cycle-card__chips {
  margin-left: auto;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.cycle-card__season {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(200, 150, 42, 0.34);
  border-radius: 999px;
  color: var(--wi-gold);
  background: rgba(200, 150, 42, 0.1);
  font-family: var(--wi-font-heading);
  font-size: 0.78rem;
  line-height: 1;
  white-space: nowrap;
}

.cycle-card__weather {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(58, 96, 128, 0.45);
  border-radius: 999px;
  color: var(--wi-text);
  background: rgba(58, 96, 128, 0.14);
  font-family: var(--wi-font-heading);
  font-size: 0.78rem;
  line-height: 1;
  white-space: nowrap;
}

.cycle-card__weather--clickable {
  cursor: pointer;
}

.cycle-card__weather--clickable:hover {
  border-color: var(--wi-gold);
  color: var(--wi-gold-light);
}

.cycle-card__weather:disabled {
  cursor: default;
  opacity: 1;
}

.cycle-card__season--winter {
  color: var(--wi-sea);
  border-color: rgba(58, 96, 128, 0.45);
  background: rgba(58, 96, 128, 0.16);
}

.cycle-card__season--spring {
  color: var(--wi-success);
  border-color: rgba(90, 138, 60, 0.42);
  background: rgba(90, 138, 60, 0.14);
}

.cycle-card__season--summer {
  color: var(--wi-gold-light);
}

.cycle-card__season--autumn {
  color: var(--wi-copper);
  border-color: rgba(123, 79, 46, 0.48);
  background: rgba(123, 79, 46, 0.16);
}

@media (max-width: 760px) {
  .cycle-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .cycle-card__season {
    margin-left: 0;
  }

  .cycle-card__chips {
    margin-left: 0;
  }
}

.cycle-card__dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 12px;
}

.cycle-card__dialog-kicker {
  color: var(--wi-text-muted);
  font-family: var(--wi-font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cycle-card__dialog-header h3 {
  margin: 4px 0 0;
  color: var(--wi-gold);
  font-family: var(--wi-font-heading);
  font-size: 1.15rem;
}

.cycle-card__forecast-list {
  display: grid;
  gap: 10px;
}

.cycle-card__forecast-day {
  display: flex;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(90, 62, 32, 0.45);
}

.cycle-card__forecast-day:last-child {
  border-bottom: 0;
}

.cycle-card__forecast-icon {
  color: var(--wi-gold);
  flex: 0 0 auto;
  margin-top: 2px;
}

.cycle-card__forecast-main {
  min-width: 0;
}

.cycle-card__forecast-title {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--wi-text);
  font-family: var(--wi-font-heading);
  line-height: 1.25;
}

.cycle-card__forecast-title span {
  color: var(--wi-text-muted);
}

.cycle-card__forecast-main p {
  margin: 4px 0;
  color: var(--wi-text);
  font-size: 0.88rem;
  line-height: 1.35;
}

.cycle-card__forecast-main small {
  color: var(--wi-text-muted);
  font-size: 0.78rem;
}
</style>
