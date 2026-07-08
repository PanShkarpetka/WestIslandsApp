<template>
  <v-col cols="12" sm="6" md="4">
    <div class="ship-card" @click="openDetails">
      <!-- Ship image -->
      <div class="ship-image-wrapper">
        <img
          :src="ship.imageUrl || '/images/ships/ship-default.png'"
          class="ship-image"
          :alt="ship.name"
        />
        <!-- Hover description overlay -->
        <div v-if="ship.description" class="ship-hover-description">
          <p>{{ ship.description }}</p>
        </div>
      </div>

      <!-- Hull upgrades — top-left corner of image -->
      <div v-if="hullUpgradeIcons.length" class="equipment-badge-row equipment-badge-row--left">
        <v-tooltip
          v-for="(item, index) in hullUpgradeIcons"
          :key="`${item.type}-${index}`"
          location="bottom"
        >
          <template #activator="{ props }">
            <span class="equipment-badge" v-bind="props">
              <v-icon size="15">{{ item.icon }}</v-icon>
            </span>
          </template>
          {{ item.label }}
        </v-tooltip>
      </div>

      <!-- Weapons — top-right corner of image -->
      <div v-if="weaponIcons.length" class="equipment-badge-row equipment-badge-row--right">
        <v-tooltip
          v-for="(item, index) in weaponIcons"
          :key="`${item.type}-${index}`"
          location="bottom"
        >
          <template #activator="{ props }">
            <span class="equipment-badge" v-bind="props">
              <v-icon size="15">{{ item.icon }}</v-icon>
            </span>
          </template>
          {{ item.label }}
        </v-tooltip>
      </div>

      <!-- Info overlay at bottom of image -->
      <div class="ship-info">
        <div class="ship-name">{{ ship.name }}</div>

        <!-- Crew row -->
        <div class="ship-stats-row">
          <span class="stat-item">
            <v-icon size="14">mdi-account-group</v-icon>
            {{ ship.crewCurrent ?? '-' }}
          </span>
          <span class="stat-item">
            <v-icon size="14">mdi-arm-flex</v-icon>
            {{ ship.crewMin ?? '-' }}/{{ ship.crewMax ?? '-' }}
          </span>
          <span class="stat-item">
            <v-icon size="14">mdi-human-male</v-icon>
            {{ ship.passengerMax ?? '-' }}
          </span>
        </div>

        <!-- Hull dice -->
        <div class="hull-dice-row">
          <template v-if="(ship.hullDices || 5) <= 8">
            <v-icon
              v-for="i in (ship.hullDices || 5)"
              :key="i"
              size="16"
              :class="i <= (ship.hullDiceUsed || 0) ? 'dice-used' : 'dice-ok'"
            >mdi-cube-outline</v-icon>
          </template>
          <template v-else>
            <v-icon size="16" class="dice-ok">mdi-cube-outline</v-icon>
            <span class="hull-text">{{ ship.hullDices - ship.hullDiceUsed }}/{{ ship.hullDices }}</span>
          </template>
        </div>

        <!-- HP bar -->
        <div class="hp-bar-wrapper">
          <div
            class="hp-bar-fill"
            :class="hpColor"
            :style="{ width: hpPercent + '%' }"
          />
        </div>
        <div class="hp-label">
          <v-icon size="13" class="mr-1">mdi-heart</v-icon>
          {{ ship.currentHP }}/{{ ship.maxHP }} HP
        </div>

        <!-- Type / Speed / Size -->
        <div class="ship-meta-row">
          <span><strong>Тип:</strong> {{ ship.type }}</span>
          <span><strong>Хід:</strong> {{ ship.speedMax / 10 }} М/год</span>
          <span><strong>Розмір:</strong> {{ ship.size || '—' }}</span>
        </div>
      </div>

      <ShipDetailsDialog
        v-model:dialog="dialog"
        :ship="ship"
        :is-admin="isAdmin"
        @save="$emit('edit', $event)"
      />
    </div>
  </v-col>
</template>

<script setup>
import { ref, computed } from 'vue';
import ShipDetailsDialog from './ShipDetailsDialog.vue';

const props = defineProps({ ship: Object, isAdmin: Boolean });
const emit = defineEmits(['edit']);

const dialog = ref(false);
function openDetails() { dialog.value = true; }

const hpPercent = computed(() =>
  props.ship.maxHP ? Math.round((props.ship.currentHP / props.ship.maxHP) * 100) : 0
);

const WEAPON_MAP = {
  'cannon':           { icon: 'mdi-bomb',              label: 'Гармата' },
  'ballista':         { icon: 'mdi-bow-arrow',          label: 'Баліста' },
  'catapult':         { icon: 'mdi-bullseye-arrow',     label: 'Катапульта' },
  'salamander':       { icon: 'mdi-fire',               label: 'Саламандра' },
  'dragon head':      { icon: 'mdi-skull-crossbones',   label: 'Голова дракона' },
  'arcana-tillery':   { icon: 'mdi-auto-fix',           label: 'Аркана-артилерія' },
  'creature launcher':{ icon: 'mdi-paw',                label: 'Пускова істот' },
  'oar blade':        { icon: 'mdi-sword-cross',        label: 'Весловий клинок' },
  'auroch ram':       { icon: 'mdi-axe-battle',         label: 'Таран ауруха' },
};

const HULL_UPGRADE_MAP = {
  'spiked plates':   { icon: 'mdi-shield-sword', label: 'Шиповані плити' },
  'magic mesh':      { icon: 'mdi-spider-web',   label: 'Магічна сітка' },
  'spell shielding': { icon: 'mdi-shield-star',  label: 'Захист від чар' },
  'naval ram':       { icon: 'mdi-spear',        label: 'Таран' },
};

const weaponIcons = computed(() =>
  (props.ship.weaponSlots || [])
    .filter(w => w.type && WEAPON_MAP[w.type])
    .map(w => ({ type: w.type, ...WEAPON_MAP[w.type] }))
);

const hullUpgradeIcons = computed(() => {
  const hullUpgrades = Array.isArray(props.ship.hullUpgrades)
    ? props.ship.hullUpgrades
    : (props.ship.hullUpgrade ? [props.ship.hullUpgrade] : []);

  return hullUpgrades
    .filter(type => HULL_UPGRADE_MAP[type])
    .map(type => ({ type, ...HULL_UPGRADE_MAP[type] }));
});

const hpColor = computed(() => {
  if (hpPercent.value > 60) return 'hp-high';
  if (hpPercent.value > 30) return 'hp-mid';
  return 'hp-low';
});
</script>

<style scoped>
/* ── Card shell ─────────────────────────────────────────────── */
.ship-card {
  position: relative;
  background: var(--wi-surface);
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}

.ship-card:hover {
  transform: translateY(-4px) rotate(-0.4deg);
  box-shadow: 0 10px 32px rgba(0,0,0,0.65), 0 0 16px rgba(200,150,42,0.15);
  border-color: var(--wi-gold);
}

/* ── Image ──────────────────────────────────────────────────── */
.ship-image-wrapper {
  position: relative;
  width: 100%;
  height: 220px;
  background: linear-gradient(160deg, #0d1a26 0%, #1a2a1a 100%);
  overflow: hidden;
}

.ship-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.4s ease;
}

.ship-card:hover .ship-image {
  transform: scale(1.04);
}

/* ── Equipment badges ───────────────────────────────────────── */
.equipment-badge-row {
  position: absolute;
  top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1;
}

.equipment-badge-row--left {
  left: 8px;
}

.equipment-badge-row--right {
  right: 8px;
}

.equipment-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(10, 6, 2, 0.75);
  border: 1px solid var(--wi-gold);
  color: var(--wi-gold);
  backdrop-filter: blur(2px);
}

.equipment-badge .v-icon {
  color: var(--wi-gold) !important;
}

/* ── Hover description ──────────────────────────────────────── */
.ship-hover-description {
  position: absolute;
  inset: 0;
  background: rgba(10, 6, 2, 0.82);
  color: var(--wi-text);
  font-family: var(--wi-font-body);
  font-style: italic;
  font-size: 0.9rem;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  text-align: center;
  padding: 16px;
  overflow-y: auto;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.ship-card:hover .ship-hover-description {
  opacity: 1;
}

/* ── Info panel ─────────────────────────────────────────────── */
.ship-info {
  padding: 12px 14px 14px;
  background: linear-gradient(180deg, #1f1508 0%, #2c1e0f 100%);
  border-top: 1px solid var(--wi-border);
}

.ship-name {
  font-family: var(--wi-font-heading);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--wi-gold);
  letter-spacing: 0.06em;
  margin-bottom: 8px;
  text-shadow: 0 0 8px rgba(200,150,42,0.3);
}

/* ── Stats row ──────────────────────────────────────────────── */
.ship-stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 6px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.78rem;
  color: var(--wi-text-muted);
}

.stat-item .v-icon {
  color: var(--wi-text-muted);
}

/* ── Hull dice ──────────────────────────────────────────────── */
.hull-dice-row {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-bottom: 8px;
}

.dice-ok  { color: var(--wi-success) !important; }
.dice-used{ color: var(--wi-danger)  !important; }

.hull-text {
  font-size: 0.78rem;
  color: var(--wi-text-muted);
  margin-left: 4px;
}

/* ── HP bar ─────────────────────────────────────────────────── */
.hp-bar-wrapper {
  width: 100%;
  height: 6px;
  background: #1a1209;
  border-radius: 3px;
  border: 1px solid var(--wi-border);
  overflow: hidden;
  margin-bottom: 4px;
}

.hp-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.hp-high { background: linear-gradient(90deg, #3a6a28, var(--wi-success)); }
.hp-mid  { background: linear-gradient(90deg, #8a6a10, #c8a020); }
.hp-low  { background: linear-gradient(90deg, #6a1a1a, var(--wi-danger)); }

.hp-label {
  font-size: 0.75rem;
  color: var(--wi-text-muted);
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.hp-label .v-icon { color: var(--wi-danger) !important; }

/* ── Meta row ───────────────────────────────────────────────── */
.ship-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.75rem;
  color: var(--wi-text-muted);
  font-family: var(--wi-font-body);
}

.ship-meta-row strong {
  color: var(--wi-text);
}
</style>
