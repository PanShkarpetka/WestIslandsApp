<template>
  <v-container class="buildings-page">
    <WiPageHeader
      title="Мапа острова"
      icon="mdi-map"
    >
      <template #actions>
        <WiActionButton
          :href="legendKeeperMapUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="tonal"
          tone="sea"
          prepend-icon="mdi-open-in-new"
        >
          Відкрити мапу
        </WiActionButton>
      </template>
    </WiPageHeader>

    <WiPanel
      class="legendkeeper-panel"
      flush
    >
      <div class="legendkeeper-frame-wrap">
        <WiEmptyState
          v-if="!mapLoaded"
          class="map-loading-state"
          title="Завантажуємо мапу"
          text="Якщо вбудована мапа не відкриється, скористайтеся кнопкою відкриття у LegendKeeper."
          icon="mdi-map-clock"
        />
        <iframe
          class="legendkeeper-frame"
          :class="{ 'legendkeeper-frame--loaded': mapLoaded }"
          :src="legendKeeperMapUrl"
          title="Мапа острова West Islands у LegendKeeper"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
          @load="mapLoaded = true"
        />
      </div>
    </WiPanel>

  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import WiActionButton from '@/components/ui/WiActionButton.vue'
import WiEmptyState from '@/components/ui/WiEmptyState.vue'
import WiPageHeader from '@/components/ui/WiPageHeader.vue'
import WiPanel from '@/components/ui/WiPanel.vue'

const legendKeeperMapUrl = 'https://www.legendkeeper.com/p/cma2mu1j719h60zl9frefc3wl/o3dmcy3m'
const mapLoaded = ref(false)
</script>

<style scoped>
.buildings-page {
  padding-top: 24px;
  padding-bottom: 40px;
}

.legendkeeper-panel {
  margin-bottom: 20px;
}

.legendkeeper-frame-wrap {
  position: relative;
  min-height: 620px;
  background: #0a0f0c;
}

.legendkeeper-frame {
  display: block;
  width: 100%;
  height: min(74vh, 820px);
  min-height: 620px;
  border: 0;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.legendkeeper-frame--loaded {
  opacity: 1;
}

.map-loading-state {
  position: absolute;
  inset: 16px;
  z-index: 1;
  min-height: auto;
  background: rgba(16, 21, 18, 0.92);
}

@media (max-width: 760px) {
  .legendkeeper-frame-wrap,
  .legendkeeper-frame {
    min-height: 520px;
  }
}
</style>
