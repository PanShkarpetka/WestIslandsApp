<template>
  <v-container class="py-6">
    <v-row justify="space-between" align="center" class="my-4">
      <v-col cols="12" sm="6">
        <h1 class="text-h5">
          Гільдії острова
        </h1>
      </v-col>
      <v-btn v-if="user.isAdmin" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">Добавити гільдію</v-btn>
    </v-row>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">{{ store.error }}</v-alert>

    <v-row>
      <v-col v-for="guild in visibleGuilds" :key="guild.id" cols="12" md="6">
        <v-card
          elevation="2"
          rounded="xl"
          :class="{
            'guild-card-clickable': canViewGuildLogs(guild),
            'guild-card-negative': isNegativeGuild(guild),
          }"
          @click="openGuildLogs(guild)"
        >
          <v-card-title class="guild-card-title d-flex justify-space-between align-start ga-2">
            <div class="guild-title-text">
              <div class="text-h6">{{ guild.name || guild.id }}</div>
              <div class="text-caption text-medium-emphasis">Лідер: {{ guild.leader || 'Невідомий' }}</div>
            </div>
            <v-chip
              class="guild-balance-chip"
              :color="isNegativeGuild(guild) ? 'error' : 'amber'"
              variant="tonal"
            >
              {{ formatAmount(guild.treasure || 0) }} 🪙
            </v-chip>
          </v-card-title>

          <v-card-text>
            <div class="text-body-2 mb-2"><b>Коротка назва:</b> {{ guild.shortName || '-' }}</div>
            <div class="text-body-2"><b>Має доступ:</b> {{ guild.withdrawUsername || '-' }}</div>
            <div v-if="canViewGuildLogs(guild)" class="text-caption text-medium-emphasis mt-3">
              Натисніть на картку, щоб переглянути журнал операцій.
            </div>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn color="success" variant="flat" prepend-icon="mdi-cash-plus" @click.stop="openTransaction(guild, 'deposit')">Внести кошти</v-btn>
            <v-btn color="warning" variant="flat" prepend-icon="mdi-cash-minus" @click.stop="openTransaction(guild, 'withdraw')">Зняти кошти</v-btn>
            <v-spacer />
            <v-btn v-if="user.isAdmin" variant="text" prepend-icon="mdi-pencil" @click.stop="openEditDialog(guild)"></v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showGuildDialog" max-width="640">
      <v-card rounded="xl">
        <v-card-title>{{ editMode ? 'Змінити гільдію' : 'Створити гільдію' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="guildForm.name" label="Назва гільдії" variant="outlined" class="mb-2" />
          <v-text-field v-model="guildForm.shortName" label="Коротке ім'я" variant="outlined" class="mb-2" />
          <v-text-field v-model="guildForm.leader" label="Лідер" variant="outlined" class="mb-2" />
          <v-checkbox v-model="guildForm.visibleToAll" label="Видима для всіх" density="compact" />
          <v-text-field v-model="guildForm.withdrawUsername" label="Має доступ" variant="outlined" class="mb-2" />
          <v-text-field v-model="guildForm.withdrawPassword" label="Пароль для доступу" variant="outlined" type="password" class="mb-2" />
          <v-text-field v-model.number="guildForm.treasure" type="number" min="0" step="0.01" label="Початковий баланс" variant="outlined" />
          <v-alert v-if="formError" type="error" density="comfortable" class="mt-3">{{ formError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="saveGuild">Save</v-btn>
          <v-btn variant="text" @click="showGuildDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTxDialog" max-width="560">
      <v-card rounded="xl">
        <v-card-title>{{ txMode === 'deposit' ? 'Внести кошти' : 'Зняти кошти' }} · {{ selectedGuild?.name }}</v-card-title>
        <v-card-text>
          <v-text-field v-model.number="txAmount" label="Баланс золота" type="number" min="0.01" step="0.01" variant="outlined" class="mb-2" />
          <v-textarea v-model="txComment" label="Коментар" rows="2" auto-grow variant="outlined" class="mb-2" />
          <v-text-field
            v-if="txMode === 'withdraw' && !user.isAdmin"
            v-model="txPassword"
            label="Пароль гільдії"
            type="password"
            variant="outlined"
          />
          <v-alert v-if="txError" type="error" density="comfortable" class="mt-3">{{ txError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" :loading="txLoading" @click="submitTransaction">Прийняти</v-btn>
          <v-btn variant="text" @click="showTxDialog = false">Відмінити</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showLogsDialog" max-width="860">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between ga-3">
          <div>Журнал операцій · {{ logsGuild?.name || logsGuild?.id }}</div>
          <v-btn variant="text" prepend-icon="mdi-refresh" :loading="logsLoading" @click="reloadGuildLogs">Оновити</v-btn>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="logsError" type="error" density="comfortable" class="mb-3">{{ logsError }}</v-alert>

          <v-table v-if="guildLogs.length" density="comfortable">
            <thead>
              <tr>
                <th>Коли</th>
                <th>Хто</th>
                <th>Тип</th>
                <th class="text-right">Сума</th>
                <th>Коментар</th>
                <th class="text-right">Баланс після</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in guildLogs" :key="log.id">
                <td>{{ formatDate(log.createdAt) }}</td>
                <td>{{ log.userNickname || 'Невідомий' }}</td>
                <td>
                  <v-chip :color="log.type === 'deposit' ? 'green' : 'red'" size="small" variant="flat">
                    {{ log.type === 'deposit' ? 'Внесок' : 'Зняття' }}
                  </v-chip>
                </td>
                <td class="text-right">
                  <span :class="log.amount >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ log.amount >= 0 ? '+' : '' }}{{ formatAmount(log.amount || 0) }}
                  </span>
                </td>
                <td class="text-truncate" style="max-width: 280px" :title="log.comment">{{ log.comment || '—' }}</td>
                <td class="text-right">{{ formatAmount(log.treasureAfter || 0) }}</td>
              </tr>
            </tbody>
          </v-table>

          <div v-else-if="!logsLoading" class="text-medium-emphasis">Журнал поки що порожній.</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showLogsDialog = false">Закрити</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Timestamp } from 'firebase/firestore';
import { useGuildStore } from '@/store/guildStore';
import { useUserStore } from '@/store/userStore';
import { formatAmount } from '@/utils/formatters';

const store = useGuildStore();
const user = useUserStore();

const showGuildDialog = ref(false);
const showTxDialog = ref(false);
const showLogsDialog = ref(false);
const editMode = ref(false);
const editingGuildId = ref('');
const formError = ref('');

const guildForm = ref(defaultGuildForm());

const selectedGuild = ref(null);
const txMode = ref('deposit');
const txAmount = ref(null);
const txComment = ref('');
const txPassword = ref('');
const txError = ref('');
const txLoading = ref(false);

const logsGuild = ref(null);
const guildLogs = ref([]);
const logsLoading = ref(false);
const logsError = ref('');

const visibleGuilds = computed(() =>
  store.guilds.filter((guild) => {
    if (user.isAdmin) return true;
    if (guild.visibleToAll) return true;
    return user.canAccessGuild(guild.id);
  }),
);

function canViewGuildLogs(guild) {
  if (!guild) return false;
  if (user.isAdmin) return true;
  return user.canAccessGuild(guild.id);
}

function isNegativeGuild(guild) {
  return Number(guild?.treasure || 0) < 0;
}

async function openGuildLogs(guild) {
  if (!canViewGuildLogs(guild)) return;

  logsGuild.value = guild;
  guildLogs.value = [];
  logsError.value = '';
  showLogsDialog.value = true;
  await reloadGuildLogs();
}

async function reloadGuildLogs() {
  if (!logsGuild.value?.id) return;

  logsLoading.value = true;
  logsError.value = '';
  try {
    guildLogs.value = await store.getGuildLogs(logsGuild.value.id);
  } catch (error) {
    logsError.value = error?.message || String(error);
  } finally {
    logsLoading.value = false;
  }
}

function openCreateDialog() {
  editMode.value = false;
  editingGuildId.value = '';
  guildForm.value = defaultGuildForm();
  formError.value = '';
  showGuildDialog.value = true;
}

function openEditDialog(guild) {
  editMode.value = true;
  editingGuildId.value = guild.id;
  guildForm.value = {
    name: guild.name || '',
    shortName: guild.shortName || '',
    leader: guild.leader || '',
    treasure: guild.treasure || 0,
    visibleToAll: guild.visibleToAll !== false,
    withdrawUsername: guild.withdrawUsername || '',
    withdrawPassword: guild.withdrawPassword || '',
  };
  formError.value = '';
  showGuildDialog.value = true;
}

async function saveGuild() {
  formError.value = '';
  if (!guildForm.value.name.trim()) {
    formError.value = `Назва гільдії обов'язкова`;
    return;
  }

  try {
    if (editMode.value) {
      await store.updateGuild(editingGuildId.value, guildForm.value);
    } else {
      await store.addGuild(guildForm.value);
    }
    showGuildDialog.value = false;
  } catch (error) {
    formError.value = error?.message || String(error);
  }
}

function openTransaction(guild, mode) {
  selectedGuild.value = guild;
  txMode.value = mode;
  txAmount.value = null;
  txComment.value = '';
  txPassword.value = '';
  txError.value = '';
  showTxDialog.value = true;
}

async function submitTransaction() {
  txError.value = '';
  if (!user.isLoggedIn) {
    txError.value = 'Спершу потрібно авторизуватися';
    return;
  }

  const amount = Number(txAmount.value);
  if (!amount || amount <= 0) {
    txError.value = 'Число має бути більший нуля.';
    return;
  }

  if (txMode.value === 'withdraw' && !hasWithdrawAccess(selectedGuild.value, txPassword.value)) {
    txError.value = `Хибне ім'я користувача.`;
    return;
  }

  txLoading.value = true;
  try {
    if (txMode.value === 'withdraw') {
      await store.withdraw({
        guildId: selectedGuild.value.id,
        amount,
        comment: txComment.value,
        actor: { nickname: user.nickname },
      });
    } else {
      await store.deposit({
        guildId: selectedGuild.value.id,
        amount,
        comment: txComment.value,
        actor: { nickname: user.nickname },
      });
    }

    showTxDialog.value = false;
  } catch (error) {
    txError.value = error?.message || String(error);
  } finally {
    txLoading.value = false;
  }
}

function hasWithdrawAccess(guild, password) {
  if (user.isAdmin) return true;
  const username = guild?.withdrawUsername || '';
  const guildPassword = guild?.withdrawPassword || '';
  return user.nickname === username && password === guildPassword;
}

function defaultGuildForm() {
  return {
    name: '',
    shortName: '',
    leader: '',
    treasure: 0,
    visibleToAll: true,
    withdrawUsername: '',
    withdrawPassword: '',
  };
}

function formatDate(value) {
  if (!value) return '—';
  const date = value instanceof Timestamp ? value.toDate() : value;
  return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

onMounted(async () => {
  store.subscribeGuilds();
});

onBeforeUnmount(() => {
  store.unsubscribeGuilds();
});
</script>

<style scoped>
.guild-card-clickable {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.guild-card-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
}

.guild-card-title {
  flex-wrap: wrap;
}

.guild-title-text {
  min-width: 0;
  flex: 1 1 220px;
}

.guild-balance-chip {
  margin-left: auto;
  max-width: 100%;
}

.guild-card-negative {
  border: 1px solid #d32f2f;
}

.guild-card-negative :deep(.v-card-title),
.guild-card-negative :deep(.v-card-text),
.guild-card-negative :deep(.v-card-title .text-medium-emphasis),
.guild-card-negative :deep(.v-card-text .text-medium-emphasis),
.guild-card-negative :deep(.v-card-text .text-body-2),
.guild-card-negative :deep(.v-card-text b) {
  color: #d32f2f !important;
}
</style>
