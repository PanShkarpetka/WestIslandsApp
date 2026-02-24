<template>
  <v-container class="py-6">
    <div class="d-flex justify-space-between align-center mb-4 flex-wrap ga-3">
      <div>
        <h1 class="text-h5 font-weight-bold">Guilds</h1>
        <div class="text-medium-emphasis">Guild treasury management and withdrawal access rules.</div>
      </div>
      <v-btn v-if="user.isAdmin" color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">Add guild</v-btn>
    </div>

    <v-alert v-if="store.error" type="error" variant="tonal" class="mb-4">{{ store.error }}</v-alert>

    <v-row>
      <v-col v-for="guild in visibleGuilds" :key="guild.id" cols="12" md="6">
        <v-card elevation="2" rounded="xl">
          <v-card-title class="d-flex justify-space-between align-start ga-2">
            <div>
              <div class="text-h6">{{ guild.assets?.name || guild.id }}</div>
              <div class="text-caption text-medium-emphasis">Leader: {{ guild.assets?.leader || 'Unknown' }}</div>
            </div>
            <v-chip color="amber" variant="tonal">{{ formatAmount(guild.assets?.treasure || 0) }} 🪙</v-chip>
          </v-card-title>

          <v-card-text>
            <div class="text-body-2 mb-2"><b>Short name:</b> {{ guild.assets?.shortName || '-' }}</div>
            <div class="text-body-2"><b>Withdraw user:</b> {{ guild.assets?.withdrawUsername || '-' }}</div>
          </v-card-text>

          <v-card-actions class="px-4 pb-4">
            <v-btn color="success" variant="flat" prepend-icon="mdi-cash-plus" @click="openTransaction(guild, 'deposit')">Add gold</v-btn>
            <v-btn color="warning" variant="flat" prepend-icon="mdi-cash-minus" @click="openTransaction(guild, 'withdraw')">Extract gold</v-btn>
            <v-spacer />
            <v-btn v-if="user.isAdmin" variant="text" prepend-icon="mdi-pencil" @click="openEditDialog(guild)">Edit</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="showGuildDialog" max-width="640">
      <v-card rounded="xl">
        <v-card-title>{{ editMode ? 'Edit guild' : 'Create guild' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="guildForm.name" label="Guild name" variant="outlined" class="mb-2" />
          <v-text-field v-model="guildForm.shortName" label="Short name" variant="outlined" class="mb-2" />
          <v-text-field v-model="guildForm.leader" label="Leader" variant="outlined" class="mb-2" />
          <v-checkbox v-model="guildForm.visibleToAll" label="Visible to all users" density="compact" />
          <v-text-field v-model="guildForm.withdrawUsername" label="Withdraw username" variant="outlined" class="mb-2" />
          <v-text-field v-model="guildForm.withdrawPassword" label="Withdraw password" variant="outlined" type="password" class="mb-2" />
          <v-text-field v-model.number="guildForm.treasure" type="number" min="0" step="0.01" label="Initial treasure" variant="outlined" />
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
        <v-card-title>{{ txMode === 'deposit' ? 'Add gold' : 'Extract gold' }} · {{ selectedGuild?.assets?.name }}</v-card-title>
        <v-card-text>
          <v-text-field v-model.number="txAmount" label="Gold amount" type="number" min="0.01" step="0.01" variant="outlined" class="mb-2" />
          <v-textarea v-model="txComment" label="Comment" rows="2" auto-grow variant="outlined" class="mb-2" />
          <v-text-field
            v-if="txMode === 'withdraw' && !user.isAdmin"
            v-model="txPassword"
            label="Guild password"
            type="password"
            variant="outlined"
          />
          <v-alert v-if="txError" type="error" density="comfortable" class="mt-3">{{ txError }}</v-alert>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" :loading="txLoading" @click="submitTransaction">Confirm</v-btn>
          <v-btn variant="text" @click="showTxDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useGuildStore } from '@/store/guildStore';
import { useUserStore } from '@/store/userStore';
import { formatAmount } from '@/utils/formatters';

const store = useGuildStore();
const user = useUserStore();

const showGuildDialog = ref(false);
const showTxDialog = ref(false);
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

const visibleGuilds = computed(() =>
  store.guilds.filter((guild) => {
    if (user.isAdmin) return true;
    if (guild.assets?.visibleToAll) return true;
    return guild.assets?.withdrawUsername === user.nickname;
  }),
);

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
    name: guild.assets?.name || '',
    shortName: guild.assets?.shortName || '',
    leader: guild.assets?.leader || '',
    treasure: guild.assets?.treasure || 0,
    visibleToAll: guild.assets?.visibleToAll !== false,
    withdrawUsername: guild.assets?.withdrawUsername || '',
    withdrawPassword: guild.assets?.withdrawPassword || '',
  };
  formError.value = '';
  showGuildDialog.value = true;
}

async function saveGuild() {
  formError.value = '';
  if (!guildForm.value.name.trim()) {
    formError.value = 'Guild name is required.';
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
    txError.value = 'Please login first.';
    return;
  }

  const amount = Number(txAmount.value);
  if (!amount || amount <= 0) {
    txError.value = 'Amount must be greater than zero.';
    return;
  }

  if (txMode.value === 'withdraw' && !hasWithdrawAccess(selectedGuild.value, txPassword.value)) {
    txError.value = 'Invalid withdrawal credentials for this guild.';
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
  const username = guild?.assets?.withdrawUsername || '';
  const guildPassword = guild?.assets?.withdrawPassword || '';
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

onMounted(async () => {
  await store.ensureDefaults();
  store.subscribeGuilds();
});

onBeforeUnmount(() => {
  store.unsubscribeGuilds();
});
</script>
