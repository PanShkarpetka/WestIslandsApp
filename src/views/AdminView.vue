<template>
  <v-container class="admin-page">
    <WiPageHeader title="Адмін-панель" icon="mdi-shield-account" />

    <v-card class="admin-card pa-6" elevation="0">
      <v-tabs v-model="adminTab" class="admin-tabs mb-4" color="primary" show-arrows>
        <v-tab value="cycles" prepend-icon="mdi-calendar-sync">Цикли</v-tab>
        <v-tab value="heroes" prepend-icon="mdi-account-group">Герої</v-tab>
        <v-tab value="assets" prepend-icon="mdi-package-variant">Ресурси</v-tab>
        <v-tab value="crafting" prepend-icon="mdi-anvil">Крафтинг</v-tab>
        <v-tab value="logs" prepend-icon="mdi-format-list-bulleted">Лог подій</v-tab>
      </v-tabs>

      <v-window v-model="adminTab" :touch="false" class="admin-tab-window">
        <v-window-item value="cycles">
      <v-card-title class="text-h6">Керування циклами</v-card-title>
      <v-alert v-if="cycleError" type="error" variant="tonal" class="mb-4">{{ cycleError }}</v-alert>
      <v-alert v-if="cycleSuccess" type="success" variant="tonal" class="mb-4">{{ cycleSuccess }}</v-alert>
      <v-form class="mb-6">
        <FaerunDatePicker
          v-model="cycleForm.startedDate"
          label="Початок нового циклу"
          placeholder="Оберіть дату початку"
        />
        <v-text-field
          v-model.number="cycleDaysInput"
          label="Або вкажіть кількість днів циклу"
          type="number"
          min="1"
          density="comfortable"
          hide-details="auto"
          class="my-3"
        />
        <v-text-field
          :model-value="cycleDurationLabel"
          label="Тривалість попереднього циклу"
          density="comfortable"
          hide-details="auto"
          readonly
          class="mb-3"
        />
        <v-textarea
          v-model="cycleForm.adventureTitle"
          label="Назва пригоди"
          auto-grow
          rows="2"
          :rules="[value => Boolean(String(value || '').trim()) || 'Вкажіть назву пригоди']"
          density="comfortable"
          hide-details="auto"
          class="mb-3"
        />
        <template v-if="latestCycle">
          <v-autocomplete
            v-model="cycleForm.participantHeroIds"
            :items="activeHeroOptions"
            item-title="name"
            item-value="id"
            label="Учасники пригоди"
            multiple
            chips
            closable-chips
            density="comfortable"
            hide-details="auto"
            class="mb-3"
          />
          <v-text-field
            v-model.number="cycleForm.expeditionDurationDays"
            label="Тривалість експедиції, днів (без 7 днів відпочинку)"
            type="number"
            min="1"
            step="1"
            density="comfortable"
            hide-details="auto"
            class="mb-3"
          />
          <div class="text-subtitle-1 mb-2">Екіпаж</div>
          <v-row v-for="(group, index) in cycleForm.crewGroups" :key="index" dense class="align-center mb-1">
            <v-col cols="12" md="5">
              <v-text-field v-model="group.role" label="Роль або група" density="comfortable" hide-details="auto" />
            </v-col>
            <v-col cols="5" md="2">
              <v-text-field v-model.number="group.count" label="Кількість" type="number" min="1" step="1" density="comfortable" hide-details="auto" />
            </v-col>
            <v-col cols="5" md="3">
              <v-text-field v-model.number="group.dailyRate" label="Зм за день кожному" type="number" min="0" step="0.01" density="comfortable" hide-details="auto" />
            </v-col>
            <v-col cols="2" md="2">
              <v-btn icon="mdi-delete-outline" variant="text" color="error" :disabled="cycleForm.crewGroups.length === 1" @click="removeCrewGroup(index)" />
            </v-col>
          </v-row>
          <v-btn variant="text" prepend-icon="mdi-plus" class="mb-3" @click="addCrewGroup">Додати групу</v-btn>
          <v-alert type="info" variant="tonal" density="comfortable" class="mb-3">
            {{ expeditionCostSummary }}
          </v-alert>
          <v-alert v-if="guildMembershipPaymentPreview.length" type="warning" variant="tonal" density="comfortable" class="mb-3">
            Внески гільдій:
            <span v-for="(entry, index) in guildMembershipPaymentPreview" :key="`${entry.guildId}:${entry.heroId}:${entry.ruleId}`">
              {{ index ? '; ' : '' }}{{ heroNameById.get(entry.heroId) || entry.heroId }} -> {{ entry.guildName }} / {{ entry.ruleTitle }}: {{ formatAmount(entry.amount) }} зм
            </span>
          </v-alert>
          <v-checkbox
            v-model="cycleForm.autoDeductCrewPayment"
            label="Автоматично списати оплату екіпажу порівну з учасників"
            density="comfortable"
            hide-details
            class="mb-3"
          />
        </template>
        <v-btn color="primary" prepend-icon="mdi-play-circle-outline" :loading="cycleSaving" @click="createCycle">
          Почати новий цикл
        </v-btn>
        <v-btn
          color="secondary"
          prepend-icon="mdi-telegram"
          :loading="religionSummaryLoading"
          :disabled="!previousCompletedCycle"
          class="ml-3"
          @click="generateReligionCycleSummary"
        >
          Підсумок релігій
        </v-btn>
      </v-form>

      <v-card-title class="text-h6">Експедиції</v-card-title>
      <v-alert v-if="autoIncomeError" type="error" variant="tonal" class="mb-3">{{ autoIncomeError }}</v-alert>
      <v-data-table
        :headers="expeditionHeaders"
        :items="expeditionRows"
        :items-per-page="10"
        density="compact"
        class="elevation-1 mb-6"
      >
        <template #item.participants="{ item }">{{ item.participants || 'Невідомо' }}</template>
        <template #item.durationDays="{ item }">{{ item.durationDays ?? 'Невідомо' }}</template>
        <template #item.totalCrewCount="{ item }">{{ item.totalCrewCount ?? 'Невідомо' }}</template>
        <template #item.totalCost="{ item }">
          <span>{{ item.totalCost == null ? 'Невідомо' : `${formatAmount(item.totalCost)} зм` }}</span>
          <v-icon
            v-if="item.paymentStatus"
            :icon="expeditionPaymentIcon(item.paymentStatus)"
            :color="expeditionPaymentColor(item.paymentStatus)"
            :title="expeditionPaymentTitle(item.paymentStatus)"
            size="small"
            class="ml-1"
          />
          <v-icon v-else icon="mdi-help-circle-outline" color="grey" title="Статус списання невідомий" size="small" class="ml-1" />
        </template>
        <template #item.actions="{ item }">
          <v-btn size="small" variant="text" color="primary" @click="openExpeditionEditor(item)">Редагувати</v-btn>
        </template>
        <template #item.autoIncomeStatus="{ item }">
          <div class="d-flex align-center ga-1 flex-wrap">
            <v-chip size="small" :color="autoIncomeStatusColor(item.autoIncomeStatus)" variant="tonal">
              <v-icon start size="14">{{ autoIncomeStatusIcon(item.autoIncomeStatus) }}</v-icon>
              {{ autoIncomeStatusLabel(item.autoIncomeStatus) }}
            </v-chip>
            <v-btn
              size="x-small"
              variant="text"
              color="secondary"
              :loading="autoIncomeRunningCycleId === item.id"
              :disabled="item.autoIncomeStatus === 'done'"
              @click="runAutoIncomeForCycle(item)"
            >
              Запустити
            </v-btn>
            <v-btn size="x-small" variant="text" color="info" :disabled="!item.autoIncomeLogs.length" @click="openAutoIncomeLog(item)">
              Журнал
            </v-btn>
          </div>
        </template>
      </v-data-table>

      <v-divider class="my-4" />

      <v-card-title class="text-h6">Виправити дати циклу</v-card-title>
      <v-alert v-if="editCycleError" type="error" variant="tonal" class="mb-4">{{ editCycleError }}</v-alert>
      <v-alert v-if="editCycleSuccess" type="success" variant="tonal" class="mb-4">{{ editCycleSuccess }}</v-alert>
      <v-form class="mb-6">
        <v-select
          v-model="editCycleId"
          :items="allCyclesForSelect"
          item-title="label"
          item-value="id"
          label="Оберіть цикл"
          density="comfortable"
          hide-details="auto"
          class="mb-3"
          clearable
          @update:model-value="onEditCycleSelected"
        />
        <template v-if="editCycleId">
          <FaerunDatePicker
            v-model="editCycleForm.startedAt"
            label="Початок циклу"
            placeholder="Дата початку"
            class="mb-3"
          />
          <FaerunDatePicker
            v-model="editCycleForm.finishedAt"
            label="Кінець циклу (залиште порожнім якщо цикл ще не завершено)"
            placeholder="Дата завершення"
            class="mb-3"
          />
          <v-btn
            color="warning"
            prepend-icon="mdi-calendar-edit"
            :loading="editCycleSaving"
            @click="saveCycleDates"
          >
            Зберегти дати
          </v-btn>
        </template>
      </v-form>

        </v-window-item>

        <v-window-item value="heroes">

      <v-card-title class="text-h6">Герої</v-card-title>
      <v-alert v-if="heroError" type="error" variant="tonal" class="mb-4">{{ heroError }}</v-alert>
      <v-alert v-if="heroSuccess" type="success" variant="tonal" class="mb-4">{{ heroSuccess }}</v-alert>

      <v-expansion-panels class="mb-4">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <div class="d-flex align-center ga-2">
              <v-icon icon="mdi-account-plus-outline" color="primary" />
              <span>Додати нового героя</span>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
        <v-row class="pt-2">
          <v-col cols="12" md="4">
            <v-text-field v-model="newHeroForm.name" label="Ім'я героя" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="newHeroForm.religionId"
              :items="religionOptions"
              label="Релігія"
              hide-details="auto"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="newHeroForm.dndbeyondCharacterId"
              label="dndbeyondCharacterId"
              hide-details="auto"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="newHeroForm.telegramId"
              label="Telegram ID або username"
              hide-details="auto"
              density="comfortable"
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-end">
            <v-btn color="primary" prepend-icon="mdi-account-plus" :loading="heroSaving" @click="createHero">
              Додати героя
            </v-btn>
          </v-col>
        </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-card variant="outlined" class="hero-workspace mb-4">
        <div class="hero-workspace__toolbar">
          <div>
            <div class="text-subtitle-1">Керування героями</div>
          </div>
          <div class="hero-workspace__filters">
            <v-text-field v-model="heroSearch" label="Пошук героя" prepend-inner-icon="mdi-magnify" density="compact" hide-details clearable />
            <v-select v-model="heroStatusFilter" :items="heroStatusOptions" label="Статус" density="compact" hide-details />
          </div>
        </div>
        <v-alert v-if="balanceError" type="error" variant="tonal" class="mx-4 mb-3">{{ balanceError }}</v-alert>
        <v-data-table
        :headers="heroWorkspaceHeaders"
        :items="heroWorkspaceRows"
        :search="heroSearch"
        :items-per-page="10"
        class="hero-workspace__table"
        density="compact"
      >
        <template #item.name="{ item }">
          <span class="text-body-2">{{ item.name }}</span>
        </template>
        <template #item.religionName="{ item }">
          {{ item.religionName || '—' }}
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" :color="item.inactive ? 'error' : 'success'" variant="tonal">
            {{ item.inactive ? 'Неактивний' : 'Активний' }}
          </v-chip>
          <div class="text-caption mt-1" :class="item.downtimeAvailable ? 'text-warning' : 'wi-muted-text'">
            {{ item.downtimeAvailable ? 'Дія очікує' : 'Дію виконано' }}
          </div>
        </template>
        <template #item.telegramId="{ item }">
          <span :class="item.telegramId ? '' : 'text-error'">{{ item.telegramId || 'Не привʼязано' }}</span>
        </template>
          <template #item.goldBalance="{ item }">
            <span class="font-weight-medium">{{ Number(item.goldBalance || 0).toFixed(2) }} зм</span>
        </template>
        <template #item.usedDays="{ item }">
          <div class="hero-days">
            <strong>Разом: {{ item.totalDays }}</strong>
            <span>Крафт: {{ item.craftingDays }} · Магія: {{ item.mageGuildDays }} · Релігія: {{ item.religionDays }}</span>
          </div>
        </template>
        <template #item.actions="{ item }">
          <div class="d-flex justify-end ga-1">
            <v-btn icon="mdi-pencil-outline" size="small" variant="text" color="primary" title="Редагувати профіль" @click="openHeroEditor(item)" />
            <v-btn icon="mdi-cash-edit" size="small" variant="text" color="primary" title="Змінити баланс" @click="openBalanceEditor(item)" />
          </div>
        </template>
      </v-data-table>
      </v-card>

      <div class="d-flex align-center ga-2 mb-3">
        <v-btn icon size="small" variant="text" @click="snapshotHistoryOpen = !snapshotHistoryOpen">
          <v-icon>{{ snapshotHistoryOpen ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>
        <div class="text-subtitle-1">Історія балансів героїв (знімки)</div>
      </div>
      <v-card v-show="snapshotHistoryOpen" variant="outlined" class="pa-4 mb-4">
        <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-3">
          <div class="text-subtitle-1">Історія балансів героїв (знімки)</div>
          <v-select
            v-model="snapshotHistoryLimit"
            :items="snapshotHistoryLimitOptions"
            label="Кількість останніх знімків"
            density="comfortable"
            hide-details
            style="max-width: 260px;"
          />
        </div>

        <v-alert
          v-if="!snapshotColumns.length"
          type="info"
          variant="tonal"
          density="comfortable"
        >
          Немає даних знімків балансів для відображення.
        </v-alert>

        <v-table v-else density="compact" class="snapshot-history-table">
          <thead>
            <tr>
              <th class="text-left">Герой</th>
              <th v-for="snapshot in snapshotColumns" :key="snapshot.key" class="text-left">
                <div>{{ snapshot.label }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatSnapshotDateTime(snapshot.syncedAt) }}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in heroSnapshotRows" :key="`snapshot-row-${row.heroId}`">
              <td class="font-weight-medium">{{ row.heroName }}</td>
              <td v-for="snapshot in snapshotColumns" :key="`${row.heroId}-${snapshot.key}`">
                <template v-if="row.entriesByKey[snapshot.key]">
                  <div v-for="currency in currencyKeys" :key="`${row.heroId}-${snapshot.key}-${currency}`">
                    {{ formatCurrencyLabel(currency) }}: {{ row.entriesByKey[snapshot.key].balance[currency] }}
                  </div>
                  <div
                    v-for="currency in currencyKeys"
                    :key="`${row.heroId}-${snapshot.key}-${currency}-delta`"
                    class="text-caption"
                    :class="deltaClass(row.entriesByKey[snapshot.key].balanceDelta[currency])"
                  >
                    Δ {{ formatCurrencyLabel(currency) }}:
                    {{ formatDelta(row.entriesByKey[snapshot.key].balanceDelta[currency]) }}
                  </div>
                </template>
                <span v-else class="text-medium-emphasis">—</span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-card variant="tonal" class="pa-3 mb-4">
        <div class="text-subtitle-2 mb-2">Зведення по кампанії (усі герої)</div>
        <div class="text-body-2 mb-1">
          Поточні баланси:
          GP {{ heroBalanceTotals.totalBalance.gp }},
          SP {{ heroBalanceTotals.totalBalance.sp }},
          CP {{ heroBalanceTotals.totalBalance.cp }},
          EP {{ heroBalanceTotals.totalBalance.ep }},
          PP {{ heroBalanceTotals.totalBalance.pp }}
        </div>
        <div class="text-body-2">
          Сума дельт:
          <span :class="deltaClass(heroBalanceTotals.totalDelta.gp)">GP {{ formatDelta(heroBalanceTotals.totalDelta.gp) }}</span>,
          <span :class="deltaClass(heroBalanceTotals.totalDelta.sp)">SP {{ formatDelta(heroBalanceTotals.totalDelta.sp) }}</span>,
          <span :class="deltaClass(heroBalanceTotals.totalDelta.cp)">CP {{ formatDelta(heroBalanceTotals.totalDelta.cp) }}</span>,
          <span :class="deltaClass(heroBalanceTotals.totalDelta.ep)">EP {{ formatDelta(heroBalanceTotals.totalDelta.ep) }}</span>,
          <span :class="deltaClass(heroBalanceTotals.totalDelta.pp)">PP {{ formatDelta(heroBalanceTotals.totalDelta.pp) }}</span>
        </div>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-subtitle-1 mb-3">Import D&amp;D Beyond Balance Snapshot</div>
        <v-alert
          v-if="snapshotImportState.error"
          type="error"
          variant="tonal"
          density="comfortable"
          class="mb-3"
        >
          {{ snapshotImportState.error }}
        </v-alert>
        <v-textarea
          v-model="snapshotImportState.rawInput"
          label="Snapshot JSON"
          auto-grow
          rows="6"
          density="comfortable"
          hide-details="auto"
          class="mb-3"
        />
        <div class="d-flex flex-wrap ga-2 mb-3">
          <v-btn color="primary" prepend-icon="mdi-eye-outline" @click="previewSnapshotImport">Preview Import</v-btn>
          <v-btn
            color="success"
            prepend-icon="mdi-content-save-edit-outline"
            :loading="snapshotImportState.applying"
            :disabled="applyImportDisabled"
            @click="applySnapshotImport"
          >
            Apply Import
          </v-btn>
          <v-btn variant="text" prepend-icon="mdi-close-circle-outline" @click="clearSnapshotImport">Clear</v-btn>
        </div>

        <v-card v-if="snapshotImportState.preview" variant="tonal" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Preview summary</div>
          <v-row dense>
            <v-col cols="6" md="2">Total rows: {{ snapshotImportState.preview.summary.totalRows }}</v-col>
            <v-col cols="6" md="2">Valid rows: {{ snapshotImportState.preview.summary.validRows }}</v-col>
            <v-col cols="6" md="2">Matched: {{ snapshotImportState.preview.summary.matchedRows }}</v-col>
            <v-col cols="6" md="2">Unmatched: {{ snapshotImportState.preview.summary.unmatchedRows }}</v-col>
            <v-col cols="6" md="2">Missing heroes: {{ snapshotImportState.preview.summary.missingHeroesFromSnapshot }}</v-col>
            <v-col cols="6" md="2">Invalid rows: {{ snapshotImportState.preview.summary.invalidRows }}</v-col>
          </v-row>
          <v-alert
            v-if="snapshotImportState.preview.duplicateCharacterIds.length"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mt-3"
          >
            Duplicate characterId rows found ({{ snapshotImportState.preview.duplicateCharacterIds.join(', ') }}).
            Resolve duplicates before apply.
          </v-alert>
        </v-card>

        <v-card v-if="snapshotImportState.preview?.matched.length" variant="outlined" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Matched heroes</div>
          <v-expansion-panels variant="accordion" density="compact">
            <v-expansion-panel
              v-for="row in snapshotImportState.preview.matched"
              :key="`${row.heroId}-${row.dndbeyondCharacterId}`"
            >
              <v-expansion-panel-title>
                <div class="d-flex flex-wrap ga-2 align-center">
                  <span>{{ row.heroName }}</span>
                  <span class="text-medium-emphasis">({{ row.dndbeyondCharacterId }})</span>
                  <span class="font-weight-medium">
                    current: {{ row.currentBalance ? `${row.currentBalance.gp} gp` : 'No previous balance' }}
                    → new: {{ row.newBalance.gp }} gp
                  </span>
                  <span :class="deltaClass(row.delta.gp)">({{ formatDelta(row.delta.gp) }})</span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="text-body-2">
                  GP: {{ row.newBalance.gp }} ({{ formatDelta(row.delta.gp) }})<br />
                  SP: {{ row.newBalance.sp }} ({{ formatDelta(row.delta.sp) }})<br />
                  CP: {{ row.newBalance.cp }} ({{ formatDelta(row.delta.cp) }})<br />
                  EP: {{ row.newBalance.ep }} ({{ formatDelta(row.delta.ep) }})<br />
                  PP: {{ row.newBalance.pp }} ({{ formatDelta(row.delta.pp) }})
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>

        <v-card v-if="snapshotImportState.preview?.unmatched.length" variant="outlined" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Unmatched snapshot rows</div>
          <v-list density="compact">
            <v-list-item v-for="row in snapshotImportState.preview.unmatched" :key="`u-${row.characterId}`">
              <v-list-item-title>{{ row.characterId }} — new: {{ row.balance.gp }} gp</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card v-if="snapshotImportState.preview?.invalid.length" variant="outlined" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Invalid rows</div>
          <v-list density="compact">
            <v-list-item v-for="row in snapshotImportState.preview.invalid" :key="`i-${row.index}-${row.reason}`">
              <v-list-item-title>Row {{ row.index + 1 }}: {{ row.reason }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <v-card v-if="snapshotImportState.preview?.missingHeroesFromSnapshot.length" variant="outlined" class="pa-3 mb-3">
          <div class="text-subtitle-2 mb-2">Heroes missing from snapshot</div>
          <v-list density="compact">
            <v-list-item
              v-for="row in snapshotImportState.preview.missingHeroesFromSnapshot"
              :key="`m-${row.heroId}`"
            >
              <v-list-item-title>{{ row.heroName }} ({{ row.dndbeyondCharacterId }})</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>

        <v-alert
          v-if="snapshotImportState.applySummary"
          type="success"
          variant="tonal"
          density="comfortable"
        >
          Updated: {{ snapshotImportState.applySummary.updatedCount }},
          failed: {{ snapshotImportState.applySummary.failedCount }},
          unmatched: {{ snapshotImportState.applySummary.unmatchedCount }},
          skipped: {{ snapshotImportState.applySummary.skippedCount }}.
        </v-alert>
      </v-card>

      <v-dialog v-model="heroEditDialog" max-width="560">
        <v-card>
          <v-card-title class="text-h6">Редагування героя</v-card-title>
          <v-card-text>
            <v-text-field v-model="editHeroForm.name" label="Ім'я героя" class="mb-2" />
            <v-select
              v-model="editHeroForm.religionId"
              :items="religionOptions"
              label="Релігія"
              class="mb-2"
            />
            <v-text-field
              v-model="editHeroForm.dndbeyondCharacterId"
              label="dndbeyondCharacterId"
              class="mb-2"
            />
            <v-text-field
              v-model="editHeroForm.telegramId"
              label="Telegram ID або username"
              class="mb-2"
            />
            <v-switch v-model="editHeroForm.downtimeAvailable" label="Дія не виконана" inset color="warning" />
            <v-switch v-model="editHeroForm.inactive" label="Неактивний герой" inset color="error" />
            <v-text-field
              v-model="editHeroForm.password"
              label="Пароль гравця"
              type="password"
              class="mb-2"
              hint="Якщо залишити порожнім, буде встановлено password"
              persistent-hint
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="heroEditDialog = false">Скасувати</v-btn>
            <v-btn color="primary" :loading="heroSaving" @click="saveHero">Зберегти</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="balanceEditDialog" max-width="420">
        <v-card>
          <v-card-title class="text-h6">Змінити баланс акаунта</v-card-title>
          <v-card-text>
            <p class="text-body-2 mb-3">
              Герой: <strong>{{ selectedBalanceHero?.name }}</strong>
            </p>
            <v-text-field
              v-model.number="balanceEditForm.goldBalance"
              label="Новий баланс (зм)"
              type="number"
              step="0.01"
              class="mb-2"
            />
            <v-textarea
              v-model="balanceEditForm.comment"
              label="Коментар для журналу"
              rows="2"
              auto-grow
              class="mb-2"
            />
            <v-alert v-if="balanceError" type="error" variant="tonal" density="compact">{{ balanceError }}</v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="balanceEditDialog = false">Скасувати</v-btn>
            <v-btn color="primary" :loading="balanceSaving" @click="saveHeroGoldBalance">Зберегти</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>



        </v-window-item>

        <v-window-item value="assets">

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="d-flex align-center mb-3">
          <div class="text-subtitle-1">Заявки на поповнення товарів</div>
          <v-chip v-if="pendingGoodsRequestRows.length" size="small" color="warning" variant="tonal" class="ml-2">
            {{ pendingGoodsRequestRows.length }}
          </v-chip>
          <v-spacer />
          <v-btn
            color="primary"
            :loading="goodsRequestReviewing"
            :disabled="!selectedApproveGoodsRequestIds.length && !selectedRejectGoodsRequestIds.length"
            @click="applyGoodsRequestReviews"
          >
            Застосувати рішення
          </v-btn>
        </div>
        <v-alert v-if="goodsRequestError" type="error" variant="tonal" density="compact" class="mb-3">{{ goodsRequestError }}</v-alert>
        <v-alert v-if="goodsRequestSuccess" type="success" variant="tonal" density="compact" class="mb-3">{{ goodsRequestSuccess }}</v-alert>
        <v-alert v-if="!pendingGoodsRequestRows.length" type="info" variant="tonal" density="compact">
          Немає заявок, що очікують розгляду.
        </v-alert>
        <v-data-table
          v-else
          :headers="goodsRequestHeaders"
          :items="pendingGoodsRequestRows"
          :items-per-page="20"
          density="compact"
          class="elevation-1"
        >
          <template #item.createdAt="{ item }">{{ formatTimestamp(item.createdAt) }}</template>
          <template #item.targetType="{ item }">{{ item.targetType === 'hero' ? 'Особистий' : 'Гільдія' }}</template>
          <template #item.goods="{ item }">{{ formatGoodsRequestItems(item) }}</template>
          <template #item.approve="{ item }">
            <v-checkbox-btn
              :model-value="selectedApproveGoodsRequestIds.includes(item.id)"
              color="success"
              @update:model-value="setGoodsRequestDecision(item.id, 'approve', $event)"
            />
          </template>
          <template #item.reject="{ item }">
            <v-checkbox-btn
              :model-value="selectedRejectGoodsRequestIds.includes(item.id)"
              color="error"
              @update:model-value="setGoodsRequestDecision(item.id, 'reject', $event)"
            />
          </template>
        </v-data-table>
      </v-card>

      <!-- Trade Goods -->
      <v-card-title class="text-h6">Торгові товари</v-card-title>
      <v-alert v-if="goodsError" type="error" variant="tonal" class="mb-4">{{ goodsError }}</v-alert>
      <v-alert v-if="goodsSuccess" type="success" variant="tonal" class="mb-4">{{ goodsSuccess }}</v-alert>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-subtitle-1 mb-3">Додати товар</div>
        <v-row>
          <v-col cols="12" md="5">
            <v-text-field v-model="newGoodForm.name" label="Назва товару" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="newGoodForm.unit" label="Одиниця виміру (напр. barrel, шт.)" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="3" class="d-flex align-end">
            <v-btn color="primary" prepend-icon="mdi-package-variant-plus" :loading="goodsSaving" @click="createGood">
              Додати
            </v-btn>
          </v-col>
        </v-row>
      </v-card>

      <v-data-table
        :headers="goodsHeaders"
        :items="goodsRows"
        :items-per-page="20"
        class="elevation-1 mb-4"
        density="compact"
      >
        <template #item.actions="{ item }">
          <v-btn size="small" variant="text" color="primary" @click="openGoodsEditor(item)">Редагувати</v-btn>
          <v-btn size="small" variant="text" color="error" @click="deleteGood(item)">Видалити</v-btn>
        </template>
      </v-data-table>

      <v-dialog v-model="goodsEditDialog" max-width="420">
        <v-card>
          <v-card-title class="text-h6">Редагування товару</v-card-title>
          <v-card-text>
            <v-text-field v-model="editGoodForm.name" label="Назва товару" class="mb-2" />
            <v-text-field v-model="editGoodForm.unit" label="Одиниця виміру" class="mb-2" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="goodsEditDialog = false">Скасувати</v-btn>
            <v-btn color="primary" :loading="goodsSaving" @click="saveGood">Зберегти</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-subtitle-1 mb-3">Товари на балансах персонажів і гільдій</div>
        <v-alert v-if="heroGoodsError" type="error" variant="tonal" class="mb-3">{{ heroGoodsError }}</v-alert>
        <v-alert v-if="heroGoodsSuccess" type="success" variant="tonal" class="mb-3">{{ heroGoodsSuccess }}</v-alert>
        <v-row class="mb-2">
          <v-col cols="12" md="3">
            <v-select v-model="heroGoodsForm.heroId" :items="heroOptions" label="Герой" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="3">
            <v-select v-model="heroGoodsForm.goodId" :items="goodOptions" label="Товар" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="2">
            <v-text-field v-model.number="heroGoodsForm.delta" label="Зміна" type="number" step="1" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="heroGoodsForm.comment" label="Коментар" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="1" class="d-flex align-end">
            <v-btn color="primary" :loading="heroGoodsSaving" @click="saveHeroGoodsAdjustment">Застосувати</v-btn>
          </v-col>
        </v-row>
        <v-data-table
          :headers="balanceGoodsHeaders"
          :items="balanceGoodsRows"
          :items-per-page="20"
          density="compact"
          class="elevation-1"
        >
          <template #item.qty="{ item }">
            <span class="font-weight-medium">{{ item.qty }}</span>
          </template>
          <template #item.actions="{ item }">
            <template v-if="item.targetType === 'hero'">
              <v-btn size="small" variant="text" color="primary" @click="prepareHeroGoodsAdjustment(item, 1)">+1</v-btn>
              <v-btn size="small" variant="text" color="error" @click="prepareHeroGoodsAdjustment(item, -1)">-1</v-btn>
            </template>
            <span v-else class="text-medium-emphasis">—</span>
          </template>
        </v-data-table>
      </v-card>

      <v-divider class="my-4" />

      <!-- Yield Buildings -->
      <v-card-title class="text-h6">Будівлі-постачальники</v-card-title>
      <v-alert v-if="yieldBuildingsError" type="error" variant="tonal" class="mb-4">{{ yieldBuildingsError }}</v-alert>
      <v-alert v-if="yieldBuildingsSuccess" type="success" variant="tonal" class="mb-4">{{ yieldBuildingsSuccess }}</v-alert>

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-subtitle-1 mb-3">Додати будівлю-постачальника</div>
        <v-row>
          <v-col cols="12" md="4">
            <v-text-field v-model="newYieldBuildingForm.name" label="Назва будівлі" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="newYieldBuildingForm.description" label="Опис (необов'язково)" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col cols="12" md="4">
            <v-select v-model="newYieldBuildingForm.incomeType" :items="yieldIncomeTypeOptions" label="Тип доходу" hide-details="auto" density="comfortable" />
          </v-col>
          <v-col v-if="newYieldBuildingForm.incomeType === 'owner-action'" cols="12">
            <div class="text-caption text-medium-emphasis mb-2">Спочатку створіть потрібні товари вище в розділі «Товари».</div>
            <v-row>
              <v-col cols="12" md="4"><v-text-field v-model.number="newYieldBuildingForm.actionCostGold" type="number" min="0.01" step="0.01" label="Вартість дії, зм" /></v-col>
              <v-col cols="12" md="4"><v-text-field v-model.number="newYieldBuildingForm.maxUsesPerCycle" type="number" min="1" step="1" label="Використань за цикл" /></v-col>
            </v-row>
            <div v-for="(variant, index) in newYieldBuildingForm.actionVariants" :key="variant.id" class="d-flex align-center ga-2 mb-2">
              <v-select v-model="variant.goodId" :items="goodOptions" label="Товар" density="compact" hide-details class="flex-grow-1" />
              <v-text-field v-model.number="variant.amount" type="number" min="1" step="1" label="Кількість" density="compact" hide-details style="max-width: 150px" />
              <v-btn icon="mdi-delete-outline" variant="text" color="error" :disabled="newYieldBuildingForm.actionVariants.length === 1" @click="removeYieldActionVariant(newYieldBuildingForm, index)" />
            </div>
            <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addYieldActionVariant(newYieldBuildingForm)">Додати варіант</v-btn>
          </v-col>
          <v-col cols="12" class="d-flex justify-end">
            <v-btn color="primary" prepend-icon="mdi-sprout" :loading="yieldBuildingsSaving" @click="createYieldBuilding">
              Додати
            </v-btn>
          </v-col>
        </v-row>
      </v-card>

      <v-data-table
        :headers="yieldBuildingsHeaders"
        :items="yieldBuildingRows"
        :items-per-page="20"
        class="elevation-1 mb-4"
        density="compact"
      >
        <template #item.actions="{ item }">
          <v-btn size="small" variant="text" color="primary" @click="openYieldBuildingEditor(item)">Редагувати</v-btn>
          <v-btn size="small" variant="text" color="error" @click="deleteYieldBuilding(item)">Видалити</v-btn>
        </template>
      </v-data-table>

      <v-dialog v-model="yieldBuildingEditDialog" max-width="680">
        <v-card>
          <v-card-title class="text-h6">Редагування будівлі-постачальника</v-card-title>
          <v-card-text>
            <v-text-field v-model="editYieldBuildingForm.name" label="Назва будівлі" class="mb-2" />
            <v-text-field v-model="editYieldBuildingForm.description" label="Опис" class="mb-2" />
            <v-select v-model="editYieldBuildingForm.incomeType" :items="yieldIncomeTypeOptions" label="Тип доходу" class="mb-2" />
            <template v-if="editYieldBuildingForm.incomeType === 'owner-action'">
              <v-alert type="info" density="compact" variant="tonal" class="mb-3">У списку доступні лише товари, вже створені в адмін-панелі.</v-alert>
              <v-text-field v-model.number="editYieldBuildingForm.actionCostGold" type="number" min="0.01" step="0.01" label="Вартість дії, зм" class="mb-2" />
              <v-text-field v-model.number="editYieldBuildingForm.maxUsesPerCycle" type="number" min="1" step="1" label="Використань за цикл" class="mb-2" />
              <div v-for="(variant, index) in editYieldBuildingForm.actionVariants" :key="variant.id" class="d-flex align-center ga-2 mb-2">
                <v-select v-model="variant.goodId" :items="goodOptions" label="Товар" density="compact" hide-details class="flex-grow-1" />
                <v-text-field v-model.number="variant.amount" type="number" min="1" step="1" label="Кількість" density="compact" hide-details style="max-width: 130px" />
                <v-btn icon="mdi-delete-outline" variant="text" color="error" :disabled="editYieldBuildingForm.actionVariants.length === 1" @click="removeYieldActionVariant(editYieldBuildingForm, index)" />
              </div>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addYieldActionVariant(editYieldBuildingForm)">Додати варіант</v-btn>
            </template>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="yieldBuildingEditDialog = false">Скасувати</v-btn>
            <v-btn color="primary" :loading="yieldBuildingsSaving" @click="saveYieldBuilding">Зберегти</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

        </v-window-item>

        <v-window-item value="crafting">

      <v-card-title class="text-h6">Crafting</v-card-title>
      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-3">
          <div class="text-subtitle-1">
            Заявки на крафт
            <v-chip v-if="pendingCraftRequestRows.length" size="small" color="warning" variant="tonal" class="ml-2">
              {{ pendingCraftRequestRows.length }}
            </v-chip>
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              color="success"
              prepend-icon="mdi-check"
              :disabled="!selectedApproveCraftRequestIds.length && !selectedRejectCraftRequestIds.length"
              :loading="craftRequestReviewing"
              @click="applyCraftRequestReviews"
            >
              Застосувати
            </v-btn>
          </div>
        </div>

        <v-alert v-if="craftRequestError" type="error" variant="tonal" class="mb-3">{{ craftRequestError }}</v-alert>
        <v-alert v-if="craftRequestSuccess" type="success" variant="tonal" class="mb-3">{{ craftRequestSuccess }}</v-alert>
        <v-alert
          v-if="!pendingCraftRequestRows.length"
          type="info"
          variant="tonal"
          density="comfortable"
        >
          Немає заявок на підтвердження.
        </v-alert>

        <v-data-table
          v-else
          :headers="craftRequestHeaders"
          :items="pendingCraftRequestRows"
          :items-per-page="10"
          class="elevation-1"
          density="compact"
        >
          <template #item.createdAt="{ item }">
            {{ formatTimestamp(item.createdAt) }}
          </template>
          <template #item.amountCrafted="{ item }">
            <span class="font-weight-medium">{{ item.amountCrafted }}</span>
          </template>
          <template #item.craftDaysSpent="{ item }">
            <span class="font-weight-medium">{{ item.craftDaysSpent }}</span>
          </template>
          <template #item.approve="{ item }">
            <v-checkbox-btn
              color="success"
              :model-value="selectedApproveCraftRequestIds.includes(item.id)"
              @update:model-value="setCraftRequestDecision(item.id, 'approve', $event)"
            />
          </template>
          <template #item.reject="{ item }">
            <v-checkbox-btn
              color="error"
              :model-value="selectedRejectCraftRequestIds.includes(item.id)"
              @update:model-value="setCraftRequestDecision(item.id, 'reject', $event)"
            />
          </template>
        </v-data-table>
      </v-card>

      <CraftActionForm
        class="mb-4"
        :heroes="heroRows"
        :items="craftItemsForAdmin"
        :default-hero-id="selectedHeroIdForCrafting"
        @saved="refreshCraftingAdminData"
      />

      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-3">
          <div class="text-subtitle-1">Лог крафту за теперішній цикл</div>
          <v-btn
            color="info"
            variant="tonal"
            prepend-icon="mdi-refresh"
            :loading="currentCycleCraftingLogLoading"
            @click="loadCurrentCycleCraftingLogs"
          >
            Оновити
          </v-btn>
        </div>
        <v-alert v-if="currentCycleCraftingLogError" type="error" variant="tonal" class="mb-3">
          {{ currentCycleCraftingLogError }}
        </v-alert>
        <v-alert
          v-if="!currentCycleId"
          type="info"
          variant="tonal"
          density="comfortable"
        >
          Немає активного циклу для журналу крафту.
        </v-alert>
        <v-data-table
          v-else
          :headers="currentCycleCraftingLogHeaders"
          :items="currentCycleCraftingLogRows"
          :items-per-page="10"
          class="elevation-1"
          density="compact"
        >
          <template #item.createdAt="{ item }">
            {{ formatTimestamp(item.createdAt) }}
          </template>
          <template #item.amountCrafted="{ item }">
            <span class="font-weight-medium">{{ item.amountCrafted }}</span>
          </template>
          <template #item.craftDaysSpent="{ item }">
            <span>{{ item.craftDaysSpent || '—' }}</span>
          </template>
        </v-data-table>
      </v-card>

        </v-window-item>

        <v-window-item value="logs">
      <v-card-title class="text-h6">Лог подій</v-card-title>
      <v-data-table
        :headers="headers"
        :items="logEntries"
        :items-per-page="10"
        class="elevation-1"
        density="compact"
      >
        <template #item.timestamp="{ item }">
          {{ formatTimestamp(item.timestamp) }}
        </template>
      </v-data-table>

        </v-window-item>
      </v-window>
    </v-card>
  </v-container>

  <v-dialog v-model="expeditionEditDialog" max-width="760">
    <v-card>
      <div class="pa-4" style="border-bottom: 1px solid var(--wi-border)">
        <span class="wi-heading text-h6">Редагувати експедицію</span>
      </div>
      <v-card-text class="pt-4">
        <v-alert v-if="expeditionEditError" type="error" variant="tonal" class="mb-3">{{ expeditionEditError }}</v-alert>
        <div class="text-subtitle-1 mb-3">{{ expeditionEditForm.adventureTitle }}</div>
        <v-autocomplete
          v-model="expeditionEditForm.participantHeroIds"
          :items="editableExpeditionHeroOptions"
          item-title="name"
          item-value="id"
          label="Учасники пригоди"
          multiple chips closable-chips
          density="comfortable"
          hide-details="auto"
          class="mb-3"
        />
        <v-text-field v-model.number="expeditionEditForm.durationDays" label="Тривалість експедиції, днів" type="number" min="1" step="1" density="comfortable" hide-details="auto" class="mb-3" />
        <div class="text-subtitle-1 mb-2">Екіпаж</div>
        <v-row v-for="(group, index) in expeditionEditForm.crewGroups" :key="index" dense class="align-center mb-1">
          <v-col cols="12" md="5"><v-text-field v-model="group.role" label="Роль або група" density="comfortable" hide-details="auto" /></v-col>
          <v-col cols="5" md="2"><v-text-field v-model.number="group.count" label="Кількість" type="number" min="1" step="1" density="comfortable" hide-details="auto" /></v-col>
          <v-col cols="5" md="3"><v-text-field v-model.number="group.dailyRate" label="Зм за день кожному" type="number" min="0" step="0.01" density="comfortable" hide-details="auto" /></v-col>
          <v-col cols="2" md="2"><v-btn icon="mdi-delete-outline" variant="text" color="error" :disabled="expeditionEditForm.crewGroups.length === 1" @click="removeEditCrewGroup(index)" /></v-col>
        </v-row>
        <v-btn variant="text" prepend-icon="mdi-plus" @click="addEditCrewGroup">Додати групу</v-btn>
        <v-alert type="warning" variant="tonal" density="comfortable" class="mt-3">
          Збереження змін не створює нових списань або транзакцій. Статус оплати буде позначено сірим.
        </v-alert>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="expeditionEditDialog = false">Скасувати</v-btn>
        <v-btn color="primary" :loading="expeditionEditSaving" @click="saveExpeditionEdit">Зберегти</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="autoIncomeLogDialog" max-width="760">
    <v-card>
      <div class="pa-4" style="border-bottom: 1px solid var(--wi-border)">
        <span class="wi-heading text-h6">Журнал автодоходів</span>
      </div>
      <v-card-text class="pt-4">
        <v-alert type="info" variant="tonal" class="mb-3">
          {{ autoIncomeLogCycle?.cycleLabel || '' }} · {{ autoIncomeStatusLabel(autoIncomeLogCycle?.autoIncomeStatus) }}
        </v-alert>
        <v-table density="compact">
          <thead>
            <tr>
              <th>Ціль</th>
              <th>Запис</th>
              <th>Сума</th>
              <th>Було</th>
              <th>Стало</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(log, index) in autoIncomeLogCycle?.autoIncomeLogs || []" :key="index">
              <td>{{ log.targetName || log.targetId || log.targetType }}</td>
              <td>{{ log.entryName || '—' }}</td>
              <td>{{ formatAmount(log.amount || 0) }} зм</td>
              <td>{{ formatAmount(log.balanceBefore || 0) }} зм</td>
              <td>{{ formatAmount(log.balanceAfter || 0) }} зм</td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="autoIncomeLogDialog = false">Закрити</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showReligionSummaryDialog" max-width="620">
    <v-card>
      <div class="pa-4" style="border-bottom: 1px solid var(--wi-border)">
        <span class="wi-heading text-h6">Підсумок релігійних дій циклу</span>
      </div>
      <v-card-text class="pt-4">
        <v-textarea
          v-model="religionSummaryText"
          rows="14"
          auto-grow
          variant="outlined"
          hide-details
        />
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn prepend-icon="mdi-content-copy" color="primary" @click="copyReligionSummary">
          {{ religionSummaryCopied ? 'Скопійовано!' : 'Копіювати' }}
        </v-btn>
        <v-btn @click="showReligionSummaryDialog = false">Закрити</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, nextTick } from 'vue';
import { useYieldBuildingStore } from '@/store/yieldBuildingStore';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { DEFAULT_YEAR, diffInDays, normalizeFaerunDate, parseFaerunDate } from 'faerun-date';
import { formatFaerunDate } from '@/utils/faerun-date.js';
import { db } from '../services/firebase';
import FaerunDatePicker from '@/components/FaerunDatePicker.vue';
import { useIslandStore } from '@/store/islandStore';
import { usePopulationStore } from '@/store/populationStore';
import { createNewCycleWithEffects, rerunCycleAutoMoney, updateExpeditionDetails, buildGuildMembershipPaymentEntries } from '@/services/cycleService';
import CraftActionForm from '@/components/crafting/CraftActionForm.vue';
import {
  approveCraftingRequest,
  loadCraftItems,
  rejectCraftingRequest,
  subscribePendingCraftingRequests,
} from '@/services/craftingService';
import { DEFAULT_HERO_PASSWORD, DEFAULT_ISLAND_ID } from '@/config/constants.js';
import { aggregateReligionActions, buildReligionSummaryText } from '@/utils/religionSummary.js';
import { getFirestoreTimestampMillis } from '@/utils/firestoreTimestamp.js';
import { adjustHeroGoldBalance, SNAPSHOT_HISTORY_DEFAULT_OPEN } from '@/services/heroBalanceService.js';
import { adjustHeroGoods } from '@/services/heroGoodsService.js';
import {
  approveGoodsRequest,
  rejectGoodsRequest,
  subscribePendingGoodsRequests,
} from '@/services/goodsRequestService.js';
import { subscribeCurrentCycleUsedDays } from '@/services/usedDaysService.js';
import { formatAmount } from '@/utils/formatters.js';
import { getLegacyExpeditionDurationDays, isCycleStartAction } from '@/services/dashboardService.js';
import WiPageHeader from '@/components/ui/WiPageHeader.vue';

const adminTab = ref('cycles');
const logEntries = ref([]);
const cycleSaving = ref(false);
const cycleError = ref('');
const cycleSuccess = ref('');
const latestCycle = ref(null);
const previousCompletedCycle = ref(null);
const allCycles = ref([]);
const legacyAdventureTitlesByCycle = ref(new Map());
const expeditionEditDialog = ref(false);
const expeditionEditSaving = ref(false);
const expeditionEditError = ref('');
const expeditionEditCycleId = ref('');
const expeditionEditForm = reactive({ adventureTitle: '', participantHeroIds: [], durationDays: 1, crewGroups: [] });
const autoIncomeRunningCycleId = ref('');
const autoIncomeError = ref('');
const autoIncomeLogDialog = ref(false);
const autoIncomeLogCycle = ref(null);
const editCycleId = ref(null);
const editCycleForm = reactive({ startedAt: null, finishedAt: null });
const editCycleSaving = ref(false);
const editCycleError = ref('');
const editCycleSuccess = ref('');
const religionSummaryText = ref('');
const showReligionSummaryDialog = ref(false);
const religionSummaryLoading = ref(false);
const religionSummaryCopied = ref(false);
const islandStore = useIslandStore();
const populationStore = usePopulationStore();
const cycleForm = reactive({
  startedDate: null,
  adventureTitle: '',
  participantHeroIds: [],
  expeditionDurationDays: null,
  crewGroups: [{ role: 'Моряки', count: 1, dailyRate: 2 }],
  autoDeductCrewPayment: true,
});
const cycleDaysInput = ref(null);
let _daysUpdatingDate = false;
let _dateUpdatingDays = false;

watch(cycleDaysInput, (days) => {
  if (_dateUpdatingDays) return
  const n = Number(days)
  if (!n || n < 1) return
  const previousStart = parseFaerunDate(latestCycle.value?.startedAt)
  if (!previousStart) return
  _daysUpdatingDate = true
  const totalDays = previousStart.month * 30 + (previousStart.day - 1) + (n - 1)
  cycleForm.startedDate = {
    day: (totalDays % 30) + 1,
    month: Math.floor(totalDays / 30) % 12,
    year: previousStart.year + Math.floor(totalDays / 360),
  }
  nextTick(() => { _daysUpdatingDate = false })
})

watch(() => cycleForm.startedDate, (date) => {
  if (_daysUpdatingDate) return
  const start = normalizeFaerunDate(date)
  const previousStart = parseFaerunDate(latestCycle.value?.startedAt)
  if (!start || !previousStart) return
  const diff = diffInDays(previousStart, start)
  if (diff !== null && diff > 0) {
    _dateUpdatingDays = true
    cycleDaysInput.value = diff
    nextTick(() => { _dateUpdatingDays = false })
  }
})

const heroes = ref([]);
const religions = ref([]);
const clergyRows = ref([]);
const heroBalanceSyncLogs = ref([]);
const heroSaving = ref(false);
const heroError = ref('');
const heroSuccess = ref('');
const heroEditDialog = ref(false);
const selectedHeroId = ref('');
const balanceEditDialog = ref(false);
const balanceSaving = ref(false);
const balanceError = ref('');
const selectedBalanceHero = ref(null);
const balanceEditForm = reactive({ goldBalance: 0, comment: '' });
const snapshotHistoryOpen = ref(SNAPSHOT_HISTORY_DEFAULT_OPEN);
const snapshotImportState = reactive({
  rawInput: '',
  preview: null,
  error: '',
  applying: false,
  applySummary: null,
});

// ── Yield buildings ──────────────────────────────────────────────────────────
const yieldBuildingStore = useYieldBuildingStore();
const yieldBuildingsSaving = ref(false);
const yieldBuildingsError = ref('');
const yieldBuildingsSuccess = ref('');
const yieldBuildingEditDialog = ref(false);
const selectedYieldBuildingId = ref('');
const createYieldVariant = () => ({ id: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, goodId: '', amount: 1 });
const newYieldBuildingForm = reactive({ name: '', description: '', incomeType: 'scheduled', actionCostGold: 1, maxUsesPerCycle: 1, actionVariants: [createYieldVariant()] });
const editYieldBuildingForm = reactive({ name: '', description: '', incomeType: 'scheduled', actionCostGold: 1, maxUsesPerCycle: 1, actionVariants: [createYieldVariant()] });
const yieldIncomeTypeOptions = [
  { title: 'Заплановані врожаї', value: 'scheduled' },
  { title: 'Платна дія власника', value: 'owner-action' },
];

function addYieldActionVariant(form) { form.actionVariants.push(createYieldVariant()); }
function removeYieldActionVariant(form, index) {
  if (form.actionVariants.length > 1) form.actionVariants.splice(index, 1);
}

const yieldBuildingsHeaders = [
  { title: 'Назва', key: 'name' },
  { title: 'Опис', key: 'description' },
  { title: 'Тип доходу', key: 'incomeTypeLabel' },
  { title: '', key: 'actions', sortable: false },
];

const yieldBuildingRows = computed(() =>
  yieldBuildingStore.yieldBuildings.map(yb => ({
    ...yb,
    description: yb.description || '—',
    incomeTypeLabel: yb.incomeType === 'owner-action' ? 'Платна дія власника' : 'Заплановані врожаї',
  }))
);

function openYieldBuildingEditor(item) {
  selectedYieldBuildingId.value = item.id;
  editYieldBuildingForm.name = item.name;
  editYieldBuildingForm.description = item.description === '—' ? '' : item.description;
  editYieldBuildingForm.incomeType = item.incomeType || 'scheduled';
  editYieldBuildingForm.actionCostGold = Number(item.actionCostGold || 1);
  editYieldBuildingForm.maxUsesPerCycle = Math.max(1, Number(item.maxUsesPerCycle || 1));
  editYieldBuildingForm.actionVariants = item.actionVariants?.length
    ? item.actionVariants.map((variant) => ({ ...variant }))
    : [createYieldVariant()];
  yieldBuildingEditDialog.value = true;
}

async function createYieldBuilding() {
  yieldBuildingsError.value = '';
  yieldBuildingsSuccess.value = '';
  const name = newYieldBuildingForm.name.trim();
  if (!name) { yieldBuildingsError.value = 'Вкажіть назву будівлі.'; return; }
  yieldBuildingsSaving.value = true;
  try {
    await yieldBuildingStore.create(name, newYieldBuildingForm.description, newYieldBuildingForm);
    newYieldBuildingForm.name = '';
    newYieldBuildingForm.description = '';
    newYieldBuildingForm.incomeType = 'scheduled';
    newYieldBuildingForm.actionCostGold = 1;
    newYieldBuildingForm.maxUsesPerCycle = 1;
    newYieldBuildingForm.actionVariants = [createYieldVariant()];
    yieldBuildingsSuccess.value = 'Будівлю додано.';
  } catch (e) {
    console.error('[admin] Failed to create yield building', e);
    yieldBuildingsError.value = e?.message || 'Не вдалося додати будівлю.';
  } finally {
    yieldBuildingsSaving.value = false;
  }
}

async function saveYieldBuilding() {
  yieldBuildingsError.value = '';
  const name = editYieldBuildingForm.name.trim();
  if (!selectedYieldBuildingId.value || !name) { yieldBuildingsError.value = 'Вкажіть назву.'; return; }
  yieldBuildingsSaving.value = true;
  try {
    await yieldBuildingStore.update(selectedYieldBuildingId.value, { name, description: editYieldBuildingForm.description, ...editYieldBuildingForm });
    yieldBuildingEditDialog.value = false;
    yieldBuildingsSuccess.value = 'Будівлю оновлено.';
  } catch (e) {
    console.error('[admin] Failed to save yield building', e);
    yieldBuildingsError.value = e?.message || 'Не вдалося зберегти будівлю.';
  } finally {
    yieldBuildingsSaving.value = false;
  }
}

async function deleteYieldBuilding(item) {
  yieldBuildingsError.value = '';
  yieldBuildingsSuccess.value = '';
  try {
    await yieldBuildingStore.remove(item.id);
    yieldBuildingsSuccess.value = `Будівлю "${item.name}" видалено.`;
  } catch (e) {
    console.error('[admin] Failed to delete yield building', e);
    yieldBuildingsError.value = 'Не вдалося видалити будівлю.';
  }
}

// ── Trade goods ──────────────────────────────────────────────────────────────
const goodsList = ref([]);
const goodsSaving = ref(false);
const goodsError = ref('');
const goodsSuccess = ref('');
const goodsEditDialog = ref(false);
const selectedGoodId = ref('');
const newGoodForm = reactive({ name: '', unit: '' });
const editGoodForm = reactive({ name: '', unit: '' });
let stopGoods = null;

const goodsHeaders = [
  { title: 'Назва', key: 'name' },
  { title: 'Одиниця', key: 'unit' },
  { title: '', key: 'actions', sortable: false },
];

const goodsRows = computed(() =>
  goodsList.value.map((g) => ({ id: g.id, name: g.name, unit: g.unit || '—' }))
);

const heroGoodsSaving = ref(false);
const heroGoodsError = ref('');
const heroGoodsSuccess = ref('');
const heroGoodsForm = reactive({ heroId: '', goodId: '', delta: 1, comment: '' });
const guildRows = ref([]);
let stopGuilds = null;

const balanceGoodsHeaders = [
  { title: 'Тип', key: 'targetLabel' },
  { title: 'Власник', key: 'ownerName' },
  { title: 'Товар', key: 'goodName' },
  { title: 'Кількість', key: 'qty' },
  { title: 'Одиниця', key: 'unit' },
  { title: '', key: 'actions', sortable: false },
];

const balanceGoodsRows = computed(() => {
  const goodsById = new Map(goodsList.value.map((good) => [good.id, good]));
  const heroItems = heroRows.value
    .flatMap((hero) => Object.entries(hero.goods || {})
      .filter(([, qty]) => Number(qty) > 0)
      .map(([goodId, qty]) => {
        const good = goodsById.get(goodId);
        return {
          targetType: 'hero',
          targetLabel: 'Персонаж',
          heroId: hero.id,
          ownerName: hero.name,
          goodId,
          goodName: good?.name || goodId,
          qty: Number(qty || 0),
          unit: good?.unit || '—',
        };
      }));
  const guildItems = guildRows.value
    .flatMap((guild) => Object.entries(guild.goods || {})
      .filter(([, qty]) => Number(qty) > 0)
      .map(([goodId, qty]) => {
        const good = goodsById.get(goodId);
        return {
          targetType: 'guild',
          targetLabel: 'Гільдія',
          guildId: guild.id,
          ownerName: guild.name || guild.shortName || guild.id,
          goodId,
          goodName: good?.name || goodId,
          qty: Number(qty || 0),
          unit: good?.unit || '—',
        };
      }));
  return [...heroItems, ...guildItems]
    .sort((a, b) => a.targetLabel.localeCompare(b.targetLabel, 'uk-UA')
      || a.ownerName.localeCompare(b.ownerName, 'uk-UA')
      || a.goodName.localeCompare(b.goodName, 'uk-UA'));
});

const pendingGoodsRequests = ref([]);
const selectedApproveGoodsRequestIds = ref([]);
const selectedRejectGoodsRequestIds = ref([]);
const goodsRequestReviewing = ref(false);
const goodsRequestError = ref('');
const goodsRequestSuccess = ref('');

const goodsRequestHeaders = [
  { title: 'Час', key: 'createdAt' },
  { title: 'Рахунок', key: 'targetType' },
  { title: 'Отримувач', key: 'targetName' },
  { title: 'Товари', key: 'goods' },
  { title: 'Хто подав', key: 'createdBy' },
  { title: 'Коментар', key: 'comment' },
  { title: 'Підтвердити', key: 'approve', sortable: false },
  { title: 'Відхилити', key: 'reject', sortable: false },
];

const pendingGoodsRequestRows = computed(() => pendingGoodsRequests.value);

function formatGoodsRequestItems(request) {
  return Object.entries(request.goods || {}).map(([goodId, amount]) => {
    const meta = request.goodsMeta?.[goodId] || goodsList.value.find((good) => good.id === goodId) || {};
    return `${meta.name || goodId}: ${amount}${meta.unit ? ` ${meta.unit}` : ''}`;
  }).join(', ');
}

function setGoodsRequestDecision(requestId, decision, checked) {
  const approve = selectedApproveGoodsRequestIds.value;
  const reject = selectedRejectGoodsRequestIds.value;
  if (decision === 'approve') {
    selectedApproveGoodsRequestIds.value = checked ? [...new Set([...approve, requestId])] : approve.filter((id) => id !== requestId);
    if (checked) selectedRejectGoodsRequestIds.value = reject.filter((id) => id !== requestId);
  } else {
    selectedRejectGoodsRequestIds.value = checked ? [...new Set([...reject, requestId])] : reject.filter((id) => id !== requestId);
    if (checked) selectedApproveGoodsRequestIds.value = approve.filter((id) => id !== requestId);
  }
}

async function applyGoodsRequestReviews() {
  goodsRequestError.value = '';
  goodsRequestSuccess.value = '';
  const approveIds = [...selectedApproveGoodsRequestIds.value];
  const rejectIds = [...selectedRejectGoodsRequestIds.value];
  if (!approveIds.length && !rejectIds.length) return;

  goodsRequestReviewing.value = true;
  try {
    for (const requestId of approveIds) await approveGoodsRequest({ requestId, reviewedBy: 'Admin' });
    for (const requestId of rejectIds) await rejectGoodsRequest({ requestId, reviewedBy: 'Admin' });
    selectedApproveGoodsRequestIds.value = [];
    selectedRejectGoodsRequestIds.value = [];
    goodsRequestSuccess.value = `Підтверджено: ${approveIds.length}, відхилено: ${rejectIds.length}.`;
  } catch (error) {
    console.error('[admin] Failed to review goods requests', error);
    goodsRequestError.value = error?.message || 'Не вдалося застосувати рішення по заявках.';
  } finally {
    goodsRequestReviewing.value = false;
  }
}

const goodOptions = computed(() => goodsRows.value.map((good) => ({ title: `${good.name}${good.unit && good.unit !== '—' ? ` (${good.unit})` : ''}`, value: good.id })));

function openGoodsEditor(item) {
  selectedGoodId.value = item.id;
  editGoodForm.name = item.name;
  editGoodForm.unit = item.unit === '—' ? '' : item.unit;
  goodsEditDialog.value = true;
}

async function createGood() {
  goodsError.value = '';
  goodsSuccess.value = '';
  const name = newGoodForm.name.trim();
  if (!name) { goodsError.value = 'Вкажіть назву товару.'; return; }
  goodsSaving.value = true;
  try {
    await addDoc(collection(db, 'goods'), { name, unit: newGoodForm.unit.trim() });
    newGoodForm.name = '';
    newGoodForm.unit = '';
    goodsSuccess.value = 'Товар додано.';
  } catch (e) {
    console.error('[admin] Failed to create good', e);
    goodsError.value = 'Не вдалося додати товар.';
  } finally {
    goodsSaving.value = false;
  }
}

async function saveGood() {
  goodsError.value = '';
  const name = editGoodForm.name.trim();
  if (!selectedGoodId.value || !name) { goodsError.value = 'Вкажіть назву.'; return; }
  goodsSaving.value = true;
  try {
    await setDoc(doc(db, 'goods', selectedGoodId.value), { name, unit: editGoodForm.unit.trim() }, { merge: true });
    goodsEditDialog.value = false;
    goodsSuccess.value = 'Товар оновлено.';
  } catch (e) {
    console.error('[admin] Failed to save good', e);
    goodsError.value = 'Не вдалося зберегти товар.';
  } finally {
    goodsSaving.value = false;
  }
}

async function deleteGood(item) {
  goodsError.value = '';
  goodsSuccess.value = '';
  try {
    await deleteDoc(doc(db, 'goods', item.id));
    goodsSuccess.value = `Товар "${item.name}" видалено.`;
  } catch (e) {
    console.error('[admin] Failed to delete good', e);
    goodsError.value = 'Не вдалося видалити товар.';
  }
}

function prepareHeroGoodsAdjustment(item, delta) {
  heroGoodsForm.heroId = item.heroId;
  heroGoodsForm.goodId = item.goodId;
  heroGoodsForm.delta = delta;
  heroGoodsForm.comment = '';
}

async function saveHeroGoodsAdjustment() {
  heroGoodsError.value = '';
  heroGoodsSuccess.value = '';
  heroGoodsSaving.value = true;
  try {
    const result = await adjustHeroGoods({
      heroId: heroGoodsForm.heroId,
      goodId: heroGoodsForm.goodId,
      delta: heroGoodsForm.delta,
      comment: heroGoodsForm.comment,
      actor: { nickname: 'Admin' },
    });
    heroGoodsSuccess.value = `${result.heroName}: ${result.goodName} ${result.delta > 0 ? '+' : ''}${result.delta}.`;
    heroGoodsForm.delta = 1;
    heroGoodsForm.comment = '';
  } catch (error) {
    console.error('[admin] Failed to adjust hero goods', error);
    heroGoodsError.value = error?.message || 'Не вдалося змінити товари героя.';
  } finally {
    heroGoodsSaving.value = false;
  }
}

const craftItemsForAdmin = ref([]);
const selectedHeroIdForCrafting = ref('');
const pendingCraftRequests = ref([]);
const currentCycleCraftingLogs = ref([]);
const currentCycleCraftingLogLoading = ref(false);
const currentCycleCraftingLogError = ref('');
const selectedApproveCraftRequestIds = ref([]);
const selectedRejectCraftRequestIds = ref([]);
const craftRequestReviewing = ref(false);
const craftRequestError = ref('');
const craftRequestSuccess = ref('');

const craftRequestHeaders = [
  { title: 'Час', key: 'createdAt' },
  { title: 'Герой', key: 'heroName' },
  { title: 'Предмет', key: 'itemName' },
  { title: 'Кількість', key: 'amountCrafted' },
  { title: 'Зайняло днів', key: 'craftDaysSpent' },
  { title: 'Підтвердити', key: 'approve', sortable: false },
  { title: 'Відхилити', key: 'reject', sortable: false },
];

const currentCycleId = computed(() => (latestCycle.value && !latestCycle.value.finishedAt ? latestCycle.value.id : ''));

const currentCycleCraftingLogHeaders = [
  { title: 'Час', key: 'createdAt' },
  { title: 'Герой', key: 'heroName' },
  { title: 'Предмет', key: 'itemName' },
  { title: 'Кількість', key: 'amountCrafted' },
  { title: 'Днів', key: 'craftDaysSpent' },
  { title: 'Хто записав', key: 'createdBy' },
];

const pendingCraftRequestRows = computed(() =>
  pendingCraftRequests.value.map((request) => ({
    ...request,
    heroName: heroRows.value.find((hero) => hero.id === request.heroId)?.name || request.heroId,
    itemName: request.itemName || request.itemSlug,
  })),
);

const currentCycleCraftingLogRows = computed(() =>
  [...currentCycleCraftingLogs.value]
    .sort((a, b) => getFirestoreTimestampMillis(b.createdAt) - getFirestoreTimestampMillis(a.createdAt))
    .map((log) => ({
      ...log,
      heroName: log.heroName || log.heroId || '—',
      itemName: log.itemName || log.itemSlug || '—',
      createdBy: log.createdBy || log.approvedBy || '—',
    })),
);

const newHeroForm = reactive({
  name: '',
  religionId: '',
  dndbeyondCharacterId: '',
  telegramId: '',
});

const editHeroForm = reactive({
  name: '',
  religionId: '',
  dndbeyondCharacterId: '',
  telegramId: '',
  downtimeAvailable: true,
  inactive: false,
  password: '',
});

let stopHeroes = null;
let stopReligions = null;
let stopClergy = null;
let stopHeroBalanceSyncLogs = null;
let stopCraftingRequests = null;
let stopGoodsRequests = null;
let stopUsedDays = null;

const headers = [
  { title: 'Час', key: 'timestamp' },
  { title: 'Користувач', key: 'user' },
  { title: 'Дія', key: 'action' },
];

const heroSearch = ref('');
const heroStatusFilter = ref('active');
const heroStatusOptions = [
  { title: 'Активні', value: 'active' },
  { title: 'Усі', value: 'all' },
  { title: 'Неактивні', value: 'inactive' },
];
const heroWorkspaceHeaders = [
  { title: 'Герой', key: 'name' },
  { title: 'Релігія', key: 'religionName' },
  { title: 'Статус', key: 'status', sortable: false },
  { title: 'Telegram ID', key: 'telegramId' },
  { title: 'Баланс', key: 'goldBalance' },
  { title: 'Дні циклу', key: 'usedDays', sortable: false },
  { title: '', key: 'actions', sortable: false },
];

const snapshotHistoryLimitOptions = [
  { title: '5 знімків', value: 5 },
  { title: '10 знімків', value: 10 },
  { title: '20 знімків', value: 20 },
  { title: '50 знімків', value: 50 },
];
const snapshotHistoryLimit = ref(5);
const currencyKeys = ['cp', 'sp', 'gp', 'ep', 'pp'];

const religionOptions = computed(() =>
  religions.value.map((item) => ({
    title: item.name,
    value: item.id,
  })),
);

const clergyByHeroId = computed(() => {
  const map = new Map();
  for (const row of clergyRows.value) {
    if (row.heroId) map.set(row.heroId, row);
  }
  return map;
});

const religionById = computed(() => {
  const map = new Map();
  for (const religion of religions.value) {
    map.set(religion.id, religion);
  }
  return map;
});

const heroRows = computed(() =>
  heroes.value
    .map((hero) => {
      const clergy = clergyByHeroId.value.get(hero.id) || null;
      const religionId = clergy?.religionId || '';

      return {
        ...hero,
        religionId,
        religionName: religionById.value.get(religionId)?.name || '—',
        clergyId: clergy?.id || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA')),
);

const heroOptions = computed(() => heroRows.value.map((hero) => ({ title: hero.name, value: hero.id })));
const activeHeroOptions = computed(() => heroRows.value.filter((hero) => !hero.inactive).map((hero) => ({ id: hero.id, name: hero.name })));
const heroNameById = computed(() => new Map(heroRows.value.map((hero) => [hero.id, hero.name])));
const expeditionHeaders = [
  { title: 'Назва пригоди', key: 'adventureTitle' },
  { title: 'Цикл', key: 'cycleLabel' },
  { title: 'Днів', key: 'durationDays' },
  { title: 'Учасники', key: 'participants' },
  { title: 'Моряків', key: 'totalCrewCount' },
  { title: 'Вартість', key: 'totalCost' },
  { title: 'Автодоходи', key: 'autoIncomeStatus', sortable: false },
  { title: '', key: 'actions', sortable: false },
];
const expeditionRows = computed(() => allCycles.value
  .filter((cycle) => cycle.finishedAt && (cycle.expedition?.adventureTitle || legacyAdventureTitlesByCycle.value.get(cycle.id)))
  .map((cycle) => ({
    id: cycle.id,
    adventureTitle: cycle.expedition?.adventureTitle || legacyAdventureTitlesByCycle.value.get(cycle.id),
    cycleLabel: `${cycle.startedAt || '—'} — ${cycle.finishedAt || '—'}`,
    durationDays: cycle.expedition?.durationDays ?? getLegacyExpeditionDurationDays(cycle),
    participants: cycle.expedition?.participants?.map((participant) => participant.heroName).join(', ') || '',
    totalCrewCount: cycle.expedition?.totalCrewCount ?? null,
    totalCost: cycle.expedition?.totalCost ?? null,
    autoDeduct: cycle.expedition ? cycle.expedition.autoDeduct !== false : null,
    paymentStatus: getExpeditionPaymentStatus(cycle.expedition),
    autoIncomeOperation: cycle.autoIncomeOperation || null,
    autoIncomeStatus: cycle.autoIncomeOperation?.status || 'not-run',
    autoIncomeLogs: Array.isArray(cycle.autoIncomeOperation?.logs) ? cycle.autoIncomeOperation.logs : [],
    expedition: cycle.expedition || null,
  })));

const editableExpeditionHeroOptions = computed(() => heroRows.value
  .filter((hero) => !hero.inactive || expeditionEditForm.participantHeroIds.includes(hero.id))
  .map((hero) => ({ id: hero.id, name: hero.name })));

function getExpeditionPaymentStatus(expedition) {
  if (!expedition) return ''
  if (expedition.paymentStatus === 'edited') return 'edited'
  const crewStatus = expedition.crewPaymentStatus || expedition.paymentStatus || (expedition.autoDeduct !== false ? 'deducted' : 'skipped')
  const guildStatus = expedition.guildMembershipPaymentStatus || (Array.isArray(expedition.guildMembershipPayments) && expedition.guildMembershipPayments.length ? 'deducted' : 'none')
  if (crewStatus === 'deducted' && (guildStatus === 'deducted' || guildStatus === 'none')) return 'deducted'
  if (crewStatus === 'skipped' && guildStatus === 'deducted') return 'partial'
  return 'skipped'
}

function expeditionPaymentIcon(status) {
  if (status === 'deducted') return 'mdi-check-circle';
  if (status === 'partial') return 'mdi-check-circle-outline';
  if (status === 'skipped') return 'mdi-minus-circle-outline';
  return 'mdi-pencil-circle-outline';
}

function expeditionPaymentColor(status) {
  if (status === 'deducted') return 'success';
  if (status === 'partial') return 'info';
  if (status === 'skipped') return 'warning';
  return 'grey';
}

function expeditionPaymentTitle(status) {
  if (status === 'deducted') return 'Списано оплату екіпажу і внески гільдій';
  if (status === 'partial') return 'Частина автоматичних списань виконана';
  if (status === 'skipped') return 'Без автоматичних списань';
  return 'Дані відредаговано без повторного списання';
}

function autoIncomeStatusLabel(status) {
  if (status === 'done') return 'Готово';
  if (status === 'failed') return 'Помилка';
  return 'Не виконано';
}

function autoIncomeStatusColor(status) {
  if (status === 'done') return 'success';
  if (status === 'failed') return 'error';
  return 'warning';
}

function autoIncomeStatusIcon(status) {
  if (status === 'done') return 'mdi-check-circle';
  if (status === 'failed') return 'mdi-alert-circle';
  return 'mdi-clock-outline';
}

function openAutoIncomeLog(item) {
  autoIncomeLogCycle.value = item;
  autoIncomeLogDialog.value = true;
}

async function runAutoIncomeForCycle(item) {
  if (!item?.id || autoIncomeRunningCycleId.value) return;
  autoIncomeError.value = '';
  autoIncomeRunningCycleId.value = item.id;
  try {
    await rerunCycleAutoMoney(item.id, islandStore.currentId || DEFAULT_ISLAND_ID, populationStore.items || []);
    await loadAllCycles();
  } catch (error) {
    console.error('[admin] Failed to run auto income', error);
    autoIncomeError.value = error?.message || 'Auto income operation failed.';
    await loadAllCycles();
  } finally {
    autoIncomeRunningCycleId.value = '';
  }
}

function openExpeditionEditor(item) {
  const expedition = item.expedition || {};
  expeditionEditCycleId.value = item.id;
  expeditionEditError.value = '';
  expeditionEditForm.adventureTitle = expedition.adventureTitle || item.adventureTitle || '';
  expeditionEditForm.participantHeroIds = [...(expedition.participantHeroIds || [])];
  expeditionEditForm.durationDays = Number(expedition.durationDays ?? item.durationDays ?? 1);
  expeditionEditForm.crewGroups = (expedition.crewGroups?.length
    ? expedition.crewGroups
    : [{ role: 'Моряки', count: 1, dailyRate: 2 }]).map((group) => ({ ...group }));
  expeditionEditDialog.value = true;
}

function addEditCrewGroup() {
  expeditionEditForm.crewGroups.push({ role: '', count: 1, dailyRate: 2 });
}

function removeEditCrewGroup(index) {
  if (expeditionEditForm.crewGroups.length > 1) expeditionEditForm.crewGroups.splice(index, 1);
}

async function saveExpeditionEdit() {
  expeditionEditError.value = '';
  expeditionEditSaving.value = true;
  try {
    await updateExpeditionDetails(expeditionEditCycleId.value, {
      adventureTitle: expeditionEditForm.adventureTitle,
      participantHeroIds: expeditionEditForm.participantHeroIds,
      durationDays: expeditionEditForm.durationDays,
      crewGroups: expeditionEditForm.crewGroups,
    });
    await loadAllCycles();
    expeditionEditDialog.value = false;
  } catch (error) {
    console.error('[admin] Failed to update expedition', error);
    expeditionEditError.value = 'Не вдалося зберегти експедицію. Перевірте учасників, дні та екіпаж.';
  } finally {
    expeditionEditSaving.value = false;
  }
}

const expeditionCostSummary = computed(() => {
  const days = Number(cycleForm.expeditionDurationDays) || 0;
  const groups = cycleForm.crewGroups || [];
  const crewCount = groups.reduce((sum, group) => sum + (Number(group.count) || 0), 0);
  const total = groups.reduce((sum, group) => sum + (Number(group.count) || 0) * (Number(group.dailyRate) || 0) * days, 0);
  const participants = cycleForm.participantHeroIds.length;
  const share = participants ? total / participants : 0;
  return `Екіпаж: ${crewCount}. Загальна оплата: ${formatAmount(total)} зм.${participants ? ` Орієнтовно по ${formatAmount(share)} зм з учасника.` : ''}`;
});

const guildMembershipPaymentPreview = computed(() =>
  buildGuildMembershipPaymentEntries(guildRows.value, cycleForm.participantHeroIds)
);

function addCrewGroup() {
  cycleForm.crewGroups.push({ role: '', count: 1, dailyRate: 2 });
}

function removeCrewGroup(index) {
  if (cycleForm.crewGroups.length > 1) cycleForm.crewGroups.splice(index, 1);
}
const usedDaysByHero = ref(new Map());
const heroWorkspaceRows = computed(() => {
  return heroRows.value
    .filter((hero) => heroStatusFilter.value === 'all'
      || (heroStatusFilter.value === 'inactive' ? hero.inactive : !hero.inactive))
    .map((hero) => {
      const breakdown = usedDaysByHero.value.get(hero.id) || {};
      return {
        ...hero,
        craftingDays: Number(breakdown.craftingDays || 0),
        mageGuildDays: Number(breakdown.mageGuildDays || 0),
        religionDays: Number(breakdown.religionDays || 0),
        totalDays: Number(breakdown.totalDays || 0),
      };
    });
});

const applyImportDisabled = computed(() => {
  const preview = snapshotImportState.preview;
  if (!preview) return true;
  if (snapshotImportState.applying) return true;
  if (preview.duplicateCharacterIds.length) return true;
  return preview.matched.length === 0;
});

const snapshotColumns = computed(() => {
  const timelineMap = new Map();

  for (const row of heroBalanceSyncLogs.value) {
    if (!row.syncedAt || !row.snapshotGroupKey) continue;
    if (!timelineMap.has(row.snapshotGroupKey)) {
      timelineMap.set(row.snapshotGroupKey, {
        key: row.snapshotGroupKey,
        syncedAt: row.syncedAt,
      });
      continue;
    }

    const existing = timelineMap.get(row.snapshotGroupKey);
    if (row.syncedAt.toMillis() > existing.syncedAt.toMillis()) {
      timelineMap.set(row.snapshotGroupKey, {
        ...existing,
        syncedAt: row.syncedAt,
      });
    }
  }

  return [...timelineMap.values()]
    .sort((a, b) => b.syncedAt.toMillis() - a.syncedAt.toMillis())
    .slice(0, snapshotHistoryLimit.value)
    .map((item, index) => ({
      ...item,
      label: `Знімок ${index + 1}`,
    }));
});

const heroSnapshotRows = computed(() => {
  const entriesByHeroId = new Map();
  const allowedKeys = new Set(snapshotColumns.value.map((item) => item.key));

  for (const row of heroBalanceSyncLogs.value) {
    if (!row.heroId || !row.snapshotGroupKey || !allowedKeys.has(row.snapshotGroupKey)) continue;

    if (!entriesByHeroId.has(row.heroId)) {
      entriesByHeroId.set(row.heroId, {
        heroId: row.heroId,
        heroName: row.heroName || row.heroId,
        entriesByKey: {},
      });
    }

    const heroRow = entriesByHeroId.get(row.heroId);
    const existingEntry = heroRow.entriesByKey[row.snapshotGroupKey];
    if (!existingEntry || row.syncedAt?.toMillis?.() > existingEntry.syncedAt?.toMillis?.()) {
      heroRow.entriesByKey[row.snapshotGroupKey] = row;
    }
    if (!heroRow.heroName && row.heroName) {
      heroRow.heroName = row.heroName;
    }
  }

  return heroRows.value
    .map((hero) => entriesByHeroId.get(hero.id) || {
      heroId: hero.id,
      heroName: hero.name || hero.id,
      entriesByKey: {},
    })
    .sort((a, b) => a.heroName.localeCompare(b.heroName, 'uk-UA'));
});

const heroBalanceTotals = computed(() => {
  const totalBalance = { cp: 0, sp: 0, gp: 0, ep: 0, pp: 0 };
  const totalDelta = { cp: 0, sp: 0, gp: 0, ep: 0, pp: 0 };

  for (const hero of heroRows.value) {
    const normalizedBalance = normalizeBalance(hero.balance || {});
    const normalizedDelta = normalizeBalance(hero.balanceDelta || {});
    totalBalance.cp += normalizedBalance.cp;
    totalBalance.sp += normalizedBalance.sp;
    totalBalance.gp += normalizedBalance.gp;
    totalBalance.ep += normalizedBalance.ep;
    totalBalance.pp += normalizedBalance.pp;
    totalDelta.cp += normalizedDelta.cp;
    totalDelta.sp += normalizedDelta.sp;
    totalDelta.gp += normalizedDelta.gp;
    totalDelta.ep += normalizedDelta.ep;
    totalDelta.pp += normalizedDelta.pp;
  }

  return { totalBalance, totalDelta };
});

const cycleDurationLabel = computed(() => {
  const start = normalizeFaerunDate(cycleForm.startedDate);
  const previousCycleStart = parseFaerunDate(latestCycle.value?.startedAt);

  if (!start || !previousCycleStart) return 'Тривалість буде розрахована автоматично';

  const diff = diffInDays(previousCycleStart, start);
  if (diff === null) return 'Тривалість буде розрахована автоматично';
  if (diff <= 0) return 'Дата початку нового циклу має бути пізнішою за попередній';

  return `${diff} днів`;
});

async function loadLatestCycle() {
  const cyclesRef = collection(db, 'cycles');
  const latestCycleQuery = query(cyclesRef, orderBy('createdAt', 'desc'), limit(2));
  const snapshot = await getDocs(latestCycleQuery);
  latestCycle.value = snapshot.docs[0] ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
  previousCompletedCycle.value = snapshot.docs[1] ? { id: snapshot.docs[1].id, ...snapshot.docs[1].data() } : null;
}

async function loadAllCycles() {
  const [snapshot, actionSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'cycles'), orderBy('createdAt', 'desc'))),
    getDocs(collection(db, 'religion-actions')),
  ]);
  allCycles.value = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const titleByActionCycle = new Map(actionSnapshot.docs
    .map((item) => item.data() || {})
    .filter((action) => isCycleStartAction(action) && String(action.notes || '').trim())
    .map((action) => [action.cycleId, String(action.notes).trim()]));
  const legacyTitles = new Map();
  allCycles.value.forEach((cycle, index) => {
    const nextNewerCycle = allCycles.value[index - 1];
    const title = nextNewerCycle ? titleByActionCycle.get(nextNewerCycle.id) : '';
    if (title) legacyTitles.set(cycle.id, title);
  });
  legacyAdventureTitlesByCycle.value = legacyTitles;
}

const allCyclesForSelect = computed(() =>
  allCycles.value.map((c) => ({
    id: c.id,
    label: c.startedAt && c.finishedAt
      ? `${c.startedAt} — ${c.finishedAt}`
      : c.startedAt
        ? `з ${c.startedAt} (поточний)`
        : c.id,
  })),
);

function onEditCycleSelected(id) {
  editCycleError.value = '';
  editCycleSuccess.value = '';
  if (!id) { editCycleForm.startedAt = null; editCycleForm.finishedAt = null; return; }
  const cycle = allCycles.value.find((c) => c.id === id);
  editCycleForm.startedAt = cycle?.startedAt ? parseFaerunDate(cycle.startedAt) : null;
  editCycleForm.finishedAt = cycle?.finishedAt ? parseFaerunDate(cycle.finishedAt) : null;
}

async function saveCycleDates() {
  editCycleError.value = '';
  editCycleSuccess.value = '';
  const normalizedStart = normalizeFaerunDate(editCycleForm.startedAt);
  if (!normalizedStart) { editCycleError.value = 'Вкажіть дату початку циклу.'; return; }
  const normalizedEnd = editCycleForm.finishedAt ? normalizeFaerunDate(editCycleForm.finishedAt) : null;

  editCycleSaving.value = true;
  try {
    const updates = { startedAt: formatFaerunDate(normalizedStart) };
    if (normalizedEnd) {
      updates.finishedAt = formatFaerunDate(normalizedEnd);
      const diff = diffInDays(normalizedStart, normalizedEnd);
      updates.duration = diff > 0 ? diff : null;
    } else {
      updates.finishedAt = null;
      updates.duration = null;
    }
    await updateDoc(doc(db, 'cycles', editCycleId.value), updates);
    editCycleSuccess.value = 'Дати циклу оновлено.';
    await loadLatestCycle();
    await loadAllCycles();
    await loadCurrentCycleCraftingLogs();
  } catch (error) {
    console.error('[admin] Failed to update cycle dates', error);
    editCycleError.value = 'Не вдалося оновити дати циклу.';
  } finally {
    editCycleSaving.value = false;
  }
}

function suggestNextCycleDate() {
  const previousCycleStart = parseFaerunDate(latestCycle.value?.startedAt);
  if (!previousCycleStart) {
    const now = new Date();
    return {
      day: now.getUTCDate(),
      month: now.getUTCMonth(),
      year: DEFAULT_YEAR,
    };
  }

  const totalDays = previousCycleStart.month * 30 + (previousCycleStart.day - 1) + 7;
  const normalizedMonth = ((totalDays % 360) + 360) % 360;
  const yearShift = Math.floor(totalDays / 360);
  return {
    day: (normalizedMonth % 30) + 1,
    month: Math.floor(normalizedMonth / 30),
    year: previousCycleStart.year + yearShift,
  };
}

async function createCycle() {
  cycleError.value = '';
  cycleSuccess.value = '';

  if (!normalizeFaerunDate(cycleForm.startedDate)) {
    cycleError.value = 'Вкажіть початок циклу.';
    return;
  }
  if (latestCycle.value) {
    if (!cycleForm.adventureTitle.trim()) { cycleError.value = 'Вкажіть назву пригоди.'; return; }
    if (!cycleForm.participantHeroIds.length) { cycleError.value = 'Оберіть учасників пригоди.'; return; }
    if (!Number.isInteger(Number(cycleForm.expeditionDurationDays)) || Number(cycleForm.expeditionDurationDays) < 1) {
      cycleError.value = 'Вкажіть тривалість експедиції у повних днях.';
      return;
    }
    const invalidCrew = !cycleForm.crewGroups.length || cycleForm.crewGroups.some((group) =>
      !String(group.role || '').trim()
      || !Number.isInteger(Number(group.count))
      || Number(group.count) < 1
      || !Number.isFinite(Number(group.dailyRate))
      || Number(group.dailyRate) < 0);
    if (invalidCrew) { cycleError.value = 'Перевірте назви, кількість і ставки груп екіпажу.'; return; }
  }

  cycleSaving.value = true;
  try {
    await createNewCycleWithEffects({
      startedDate: cycleForm.startedDate,
      expedition: latestCycle.value ? {
        adventureTitle: cycleForm.adventureTitle,
        participantHeroIds: cycleForm.participantHeroIds,
        durationDays: cycleForm.expeditionDurationDays,
        crewGroups: cycleForm.crewGroups,
        autoDeduct: cycleForm.autoDeductCrewPayment,
      } : null,
      islandId: islandStore.currentId || DEFAULT_ISLAND_ID,
      population: populationStore.totalPopulation,
      populationItems: populationStore.items || [],
    });
    cycleSuccess.value = 'Новий цикл успішно створено.';
    cycleForm.adventureTitle = '';
    cycleForm.participantHeroIds = [];
    cycleForm.expeditionDurationDays = null;
    cycleForm.crewGroups = [{ role: 'Моряки', count: 1, dailyRate: 2 }];
    cycleForm.autoDeductCrewPayment = true;
    await loadLatestCycle();
    await loadAllCycles();
    await loadCurrentCycleCraftingLogs();
    cycleForm.startedDate = suggestNextCycleDate();
    cycleDaysInput.value = null;
  } catch (error) {
    console.error('[admin] Failed to create cycle', error);
    cycleError.value = 'Не вдалося створити новий цикл.';
  } finally {
    cycleSaving.value = false;
  }
}

async function generateReligionCycleSummary() {
  if (!previousCompletedCycle.value) return;

  religionSummaryLoading.value = true;
  try {
    const heroNameById = new Map(heroes.value.map((h) => [h.id, h.name]));
    const religionNameById = new Map(religions.value.map((r) => [r.id, r.name]));
    const cycleId = previousCompletedCycle.value.id;

    const actionsSnap = await getDocs(
      query(collection(db, 'religion-actions'), where('cycleId', '==', cycleId))
    );

    const actions = actionsSnap.docs.map((docSnap) => docSnap.data());
    const { faithByHero, followersByReligion, shieldDefenses, shieldsBrokenNames } =
      aggregateReligionActions(actions, heroNameById, religionNameById);

    religionSummaryText.value = buildReligionSummaryText({
      faithByHero,
      followersByReligion,
      shieldDefenses,
      shieldsBrokenNames,
      newCycleDate: latestCycle.value?.startedAt || '',
    });
    showReligionSummaryDialog.value = true;
  } catch (e) {
    console.error('[admin] Failed to generate religion summary', e);
  } finally {
    religionSummaryLoading.value = false;
  }
}

async function copyReligionSummary() {
  if (!religionSummaryText.value) return;
  await navigator.clipboard.writeText(religionSummaryText.value);
  religionSummaryCopied.value = true;
  setTimeout(() => { religionSummaryCopied.value = false; }, 2000);
}

function subscribeHeroData() {
  stopHeroes = onSnapshot(collection(db, 'heroes'), (snapshot) => {
    heroes.value = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};

      return {
        id: docSnap.id,
        name: data.name || data.heroName || data.nickname || docSnap.id,
        dndbeyondCharacterId: data.dndbeyondCharacterId || '',
        telegramId: String(data.telegramId || '').trim(),
        goldBalance: Number(data.goldBalance ?? 0),
        goods: data.goods || {},
        balance: data.balance || null,
        balanceDelta: data.balanceDelta || null,
        downtimeAvailable: data.downtimeAvailable !== false,
        inactive: Boolean(data.inactive),
        password: data.password || '',
      };
    });
  });

  stopReligions = onSnapshot(collection(db, 'religions'), (snapshot) => {
    religions.value = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data()?.name || docSnap.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'));
  });

  stopClergy = onSnapshot(collection(db, 'clergy'), (snapshot) => {
    clergyRows.value = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      const heroRefPath = data.hero?.path || '';
      const religionRefPath = data.religion?.path || '';

      return {
        id: docSnap.id,
        heroId: heroRefPath.split('/')[1] || '',
        religionId: religionRefPath.split('/')[1] || '',
      };
    });
  });

  stopHeroBalanceSyncLogs = onSnapshot(
    query(collection(db, 'hero-balance-sync-logs'), orderBy('syncedAt', 'desc'), limit(1000)),
    (snapshot) => {
      heroBalanceSyncLogs.value = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() || {};
        const syncedAt = data.syncedAt || null;
        const source = data.source || '';

        return {
          id: docSnap.id,
          heroId: data.heroId || '',
          heroName: data.heroName || '',
          syncedAt,
          source,
          snapshotGroupKey: buildSnapshotGroupKey(syncedAt, source),
          balance: normalizeBalance(data.balance || {}),
          balanceDelta: normalizeBalance(data.balanceDelta || {}),
        };
      });
    },
  );
}

function normalizeBalance(balance) {
  return {
    cp: Number(balance?.cp ?? 0) || 0,
    sp: Number(balance?.sp ?? 0) || 0,
    gp: Number(balance?.gp ?? 0) || 0,
    ep: Number(balance?.ep ?? 0) || 0,
    pp: Number(balance?.pp ?? 0) || 0,
  };
}

function formatCurrencyLabel(currency) {
  return String(currency || '').toUpperCase();
}

function computeDelta(oldBalance, newBalance) {
  const oldB = normalizeBalance(oldBalance || {});
  const newB = normalizeBalance(newBalance || {});
  return {
    cp: newB.cp - oldB.cp,
    sp: newB.sp - oldB.sp,
    gp: newB.gp - oldB.gp,
    ep: newB.ep - oldB.ep,
    pp: newB.pp - oldB.pp,
  };
}

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

function deltaClass(value) {
  if (value > 0) return 'text-success';
  if (value < 0) return 'text-error';
  return 'text-medium-emphasis';
}

function clearSnapshotImport() {
  snapshotImportState.rawInput = '';
  snapshotImportState.preview = null;
  snapshotImportState.error = '';
  snapshotImportState.applySummary = null;
}

async function previewSnapshotImport() {
  snapshotImportState.error = '';
  snapshotImportState.applySummary = null;

  let parsed;
  try {
    parsed = JSON.parse(snapshotImportState.rawInput);
  } catch (error) {
    snapshotImportState.preview = null;
    snapshotImportState.error = 'Snapshot JSON is invalid.';
    return;
  }

  if (!Array.isArray(parsed)) {
    snapshotImportState.preview = null;
    snapshotImportState.error = 'Snapshot root must be an array.';
    return;
  }

  const invalid = [];
  const validRows = [];
  const counts = new Map();

  parsed.forEach((row, index) => {
    if (!row || typeof row !== 'object') {
      invalid.push({ index, reason: 'Row must be an object.' });
      return;
    }

    const characterId = typeof row.characterId === 'string' ? row.characterId.trim() : '';
    if (!characterId) {
      invalid.push({ index, reason: 'characterId must be a non-empty string.' });
      return;
    }

    if (row.status !== 'success') {
      invalid.push({ index, reason: 'status must be "success".' });
      return;
    }

    if (!row.balance || typeof row.balance !== 'object') {
      invalid.push({ index, reason: 'balance must be an object.' });
      return;
    }

    const normalizedBalance = normalizeBalance(row.balance);
    validRows.push({
      index,
      characterId,
      rawCharacterId: row.characterId,
      balance: normalizedBalance,
    });
    counts.set(characterId, (counts.get(characterId) || 0) + 1);
  });

  const duplicateCharacterIds = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([characterId]) => characterId);

  if (duplicateCharacterIds.length) {
    validRows.forEach((row) => {
      if (duplicateCharacterIds.includes(row.characterId)) {
        invalid.push({
          index: row.index,
          reason: `Duplicate characterId "${row.characterId}" detected.`,
        });
      }
    });
  }

  const usableRows = validRows.filter((row) => !duplicateCharacterIds.includes(row.characterId));
  const heroByCharacterId = new Map(
    heroes.value
      .filter((hero) => typeof hero.dndbeyondCharacterId === 'string' && hero.dndbeyondCharacterId !== '')
      .map((hero) => [hero.dndbeyondCharacterId, hero]),
  );

  const matched = [];
  const unmatched = [];
  const snapshotCharacterIds = new Set();

  usableRows.forEach((row) => {
    snapshotCharacterIds.add(row.characterId);
    const hero = heroByCharacterId.get(row.characterId);
    if (!hero) {
      unmatched.push({
        characterId: row.characterId,
        rawCharacterId: row.rawCharacterId,
        balance: row.balance,
      });
      return;
    }

    const currentBalance = hero.balance && typeof hero.balance === 'object' ? normalizeBalance(hero.balance) : null;
    matched.push({
      heroId: hero.id,
      heroName: hero.name || hero.id,
      dndbeyondCharacterId: hero.dndbeyondCharacterId,
      currentBalance,
      newBalance: row.balance,
      delta: computeDelta(currentBalance || {}, row.balance),
      rawCharacterId: row.rawCharacterId,
    });
  });

  const missingHeroesFromSnapshot = heroes.value
    .filter(
      (hero) =>
        typeof hero.dndbeyondCharacterId === 'string' &&
        hero.dndbeyondCharacterId !== '' &&
        !snapshotCharacterIds.has(hero.dndbeyondCharacterId),
    )
    .map((hero) => ({
      heroId: hero.id,
      heroName: hero.name || hero.id,
      dndbeyondCharacterId: hero.dndbeyondCharacterId,
    }))
    .sort((a, b) => a.heroName.localeCompare(b.heroName, 'uk-UA'));

  snapshotImportState.preview = {
    summary: {
      totalRows: parsed.length,
      validRows: usableRows.length,
      matchedRows: matched.length,
      unmatchedRows: unmatched.length,
      invalidRows: invalid.length,
      missingHeroesFromSnapshot: missingHeroesFromSnapshot.length,
    },
    matched,
    unmatched,
    invalid: invalid.sort((a, b) => a.index - b.index),
    duplicateCharacterIds,
    missingHeroesFromSnapshot,
  };
}

async function applySnapshotImport() {
  if (applyImportDisabled.value) return;

  snapshotImportState.applying = true;
  snapshotImportState.error = '';
  snapshotImportState.applySummary = null;

  const preview = snapshotImportState.preview;
  const syncedAt = Timestamp.now();
  let updatedCount = 0;
  let failedCount = 0;
  const failures = [];

  try {
    for (const row of preview.matched) {
      const heroRef = doc(db, 'heroes', row.heroId);
      const payload = {
        balance: row.newBalance,
        balanceDelta: row.delta,
        balanceSyncedAt: syncedAt,
        balanceSyncStatus: 'manual_import',
        balanceSyncError: null,
        balanceSyncSource: 'manual_snapshot_import',
      };
      if (row.currentBalance) {
        payload.previousBalance = row.currentBalance;
      }

      try {
        await updateDoc(heroRef, payload);
        await addDoc(collection(db, 'hero-balance-sync-logs'), {
          heroId: row.heroId,
          heroName: row.heroName,
          dndbeyondCharacterId: row.dndbeyondCharacterId,
          syncedAt,
          source: 'manual_snapshot_import',
          balance: row.newBalance,
          previousBalance: row.currentBalance || null,
          balanceDelta: row.delta,
          rawCharacterId: row.rawCharacterId,
        });
        updatedCount += 1;
      } catch (error) {
        console.error('[admin] Failed to apply snapshot row', row, error);
        failedCount += 1;
        failures.push(`${row.heroName} (${row.dndbeyondCharacterId})`);
      }
    }

    snapshotImportState.applySummary = {
      updatedCount,
      failedCount,
      unmatchedCount: preview.unmatched.length,
      skippedCount: preview.invalid.length + preview.missingHeroesFromSnapshot.length,
    };

    if (failures.length) {
      snapshotImportState.error = `Some hero updates failed: ${failures.join(', ')}`;
    } else {
      heroSuccess.value = `Manual snapshot import updated ${updatedCount} heroes.`;
    }
  } finally {
    snapshotImportState.applying = false;
  }
}

function openHeroEditor(hero) {
  selectedHeroId.value = hero.id;
  editHeroForm.name = hero.name;
  editHeroForm.religionId = hero.religionId;
  editHeroForm.dndbeyondCharacterId = hero.dndbeyondCharacterId || '';
  editHeroForm.telegramId = hero.telegramId || '';
  editHeroForm.downtimeAvailable = hero.downtimeAvailable;
  editHeroForm.inactive = hero.inactive;
  editHeroForm.password = hero.password || DEFAULT_HERO_PASSWORD;
  heroEditDialog.value = true;
}

function openBalanceEditor(hero) {
  selectedBalanceHero.value = hero;
  balanceEditForm.goldBalance = Number(hero.goldBalance ?? 0);
  balanceEditForm.comment = '';
  balanceError.value = '';
  balanceEditDialog.value = true;
}

async function saveHeroGoldBalance() {
  balanceError.value = '';
  if (!selectedBalanceHero.value?.id) {
    balanceError.value = 'Не вдалося визначити героя.';
    return;
  }

  balanceSaving.value = true;
  try {
    await adjustHeroGoldBalance({
      heroId: selectedBalanceHero.value.id,
      newBalance: balanceEditForm.goldBalance,
      comment: balanceEditForm.comment,
      actor: { nickname: 'Admin' },
    });
    balanceEditDialog.value = false;
    heroSuccess.value = 'Баланс акаунта оновлено.';
  } catch (error) {
    console.error('[admin] Failed to adjust hero gold balance', error);
    balanceError.value = error?.message || 'Не вдалося оновити баланс.';
  } finally {
    balanceSaving.value = false;
  }
}

async function createHero() {
  heroError.value = '';
  heroSuccess.value = '';

  const name = newHeroForm.name.trim();
  if (!name) {
    heroError.value = 'Вкажіть імʼя героя.';
    return;
  }
  if (!newHeroForm.religionId) {
    heroError.value = 'Оберіть релігію для героя.';
    return;
  }
  const dndbeyondCharacterId = newHeroForm.dndbeyondCharacterId.trim();
  const telegramId = newHeroForm.telegramId.trim();

  heroSaving.value = true;
  try {
    const religionRef = doc(db, 'religions', newHeroForm.religionId);
    await runTransaction(db, async (transaction) => {
      const heroRef = doc(collection(db, 'heroes'));
      const clergyRef = doc(collection(db, 'clergy'));

      transaction.set(heroRef, {
        name,
        dndbeyondCharacterId,
        telegramId,
        goldBalance: 0,
        goods: {},
        downtimeAvailable: true,
        inactive: false,
        password: DEFAULT_HERO_PASSWORD,
        createdAt: serverTimestamp(),
      });

      transaction.set(clergyRef, {
        hero: heroRef,
        religion: religionRef,
        faith: 0,
        faithMax: 0,
        createdAt: serverTimestamp(),
      });
    });

    newHeroForm.name = '';
    newHeroForm.religionId = '';
    newHeroForm.dndbeyondCharacterId = '';
    newHeroForm.telegramId = '';
    heroSuccess.value = 'Героя створено, духовенство додано автоматично.';
  } catch (error) {
    console.error('[admin] Failed to create hero', error);
    heroError.value = 'Не вдалося створити героя.';
  } finally {
    heroSaving.value = false;
  }
}

async function saveHero() {
  heroError.value = '';
  heroSuccess.value = '';

  const name = editHeroForm.name.trim();
  if (!selectedHeroId.value) {
    heroError.value = 'Не вдалося визначити героя для редагування.';
    return;
  }
  if (!name) {
    heroError.value = 'Вкажіть імʼя героя.';
    return;
  }
  if (!editHeroForm.religionId) {
    heroError.value = 'Оберіть релігію для героя.';
    return;
  }
  const dndbeyondCharacterId = editHeroForm.dndbeyondCharacterId.trim();
  const telegramId = editHeroForm.telegramId.trim();

  heroSaving.value = true;
  try {
    const heroRef = doc(db, 'heroes', selectedHeroId.value);
    const currentHero = heroRows.value.find((item) => item.id === selectedHeroId.value);
    const targetReligionRef = doc(db, 'religions', editHeroForm.religionId);

    await runTransaction(db, async (transaction) => {
      const heroUpdates = {
        name,
        dndbeyondCharacterId,
        telegramId,
        downtimeAvailable: editHeroForm.downtimeAvailable,
        inactive: editHeroForm.inactive,
        updatedAt: serverTimestamp(),
      };
      heroUpdates.password = editHeroForm.password.trim() || DEFAULT_HERO_PASSWORD;
      transaction.update(heroRef, heroUpdates);

      if (currentHero?.clergyId) {
        transaction.update(doc(db, 'clergy', currentHero.clergyId), {
          religion: targetReligionRef,
        });
      } else {
        const clergyRef = doc(collection(db, 'clergy'));
        transaction.set(clergyRef, {
          hero: heroRef,
          religion: targetReligionRef,
          faith: 0,
          faithMax: 0,
          createdAt: serverTimestamp(),
        });
      }
    });

    heroEditDialog.value = false;
    heroSuccess.value = 'Дані героя оновлено.';
  } catch (error) {
    console.error('[admin] Failed to save hero', error);
    heroError.value = 'Не вдалося оновити героя.';
  } finally {
    heroSaving.value = false;
  }
}

async function refreshCraftingAdminData() {
  craftItemsForAdmin.value = await loadCraftItems();
  await loadCurrentCycleCraftingLogs();
}

async function loadCurrentCycleCraftingLogs() {
  currentCycleCraftingLogError.value = '';
  currentCycleCraftingLogs.value = [];

  if (!currentCycleId.value) return;

  currentCycleCraftingLogLoading.value = true;
  try {
    const snapshot = await getDocs(query(
      collection(db, 'cycle-crafting-logs'),
      where('cycleId', '==', currentCycleId.value),
    ));
    currentCycleCraftingLogs.value = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  } catch (error) {
    console.error('[admin] Failed to load current cycle crafting logs', error);
    currentCycleCraftingLogError.value = 'Не вдалося завантажити лог крафту за теперішній цикл.';
  } finally {
    currentCycleCraftingLogLoading.value = false;
  }
}

function setCraftRequestDecision(requestId, decision, checked) {
  if (!requestId) return;
  if (decision === 'approve') {
    selectedApproveCraftRequestIds.value = checked
      ? [...new Set([...selectedApproveCraftRequestIds.value, requestId])]
      : selectedApproveCraftRequestIds.value.filter((id) => id !== requestId);
    if (checked) {
      selectedRejectCraftRequestIds.value = selectedRejectCraftRequestIds.value.filter((id) => id !== requestId);
    }
    return;
  }

  selectedRejectCraftRequestIds.value = checked
    ? [...new Set([...selectedRejectCraftRequestIds.value, requestId])]
    : selectedRejectCraftRequestIds.value.filter((id) => id !== requestId);
  if (checked) {
    selectedApproveCraftRequestIds.value = selectedApproveCraftRequestIds.value.filter((id) => id !== requestId);
  }
}

async function applyCraftRequestReviews() {
  craftRequestError.value = '';
  craftRequestSuccess.value = '';

  const approveIds = [...selectedApproveCraftRequestIds.value];
  const rejectIds = [...selectedRejectCraftRequestIds.value];
  if (!approveIds.length && !rejectIds.length) return;

  craftRequestReviewing.value = true;
  try {
    for (const requestId of approveIds) {
      await approveCraftingRequest({
        requestId,
        craftItems: craftItemsForAdmin.value,
        reviewedBy: 'Admin',
      });
    }
    for (const requestId of rejectIds) {
      await rejectCraftingRequest({
        requestId,
        reviewedBy: 'Admin',
      });
    }

    selectedApproveCraftRequestIds.value = [];
    selectedRejectCraftRequestIds.value = [];
    craftRequestSuccess.value = `Підтверджено: ${approveIds.length}, відхилено: ${rejectIds.length}.`;
    await refreshCraftingAdminData();
  } catch (error) {
    console.error('[admin] Failed to review crafting requests', error);
    craftRequestError.value = error?.message || 'Не вдалося застосувати рішення по заявках.';
  } finally {
    craftRequestReviewing.value = false;
  }
}

watch(heroRows, (rows) => {
  if (!selectedHeroIdForCrafting.value && rows.length) {
    selectedHeroIdForCrafting.value = rows[0].id;
  }
}, { immediate: true });

onMounted(async () => {
  populationStore.startListening(islandStore.currentId || DEFAULT_ISLAND_ID);
  const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  logEntries.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  await loadLatestCycle();
  await loadAllCycles();
  cycleForm.startedDate = suggestNextCycleDate();
  subscribeHeroData();
  stopGoods = onSnapshot(query(collection(db, 'goods'), orderBy('name')), (snap) => {
    goodsList.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
  stopGuilds = onSnapshot(query(collection(db, 'guilds'), orderBy('name')), (snap) => {
    guildRows.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  });
  yieldBuildingStore.subscribe();
  await refreshCraftingAdminData();
  stopCraftingRequests = subscribePendingCraftingRequests((requests) => {
    pendingCraftRequests.value = requests;
    const pendingIds = new Set(requests.map((request) => request.id));
    selectedApproveCraftRequestIds.value = selectedApproveCraftRequestIds.value.filter((id) => pendingIds.has(id));
    selectedRejectCraftRequestIds.value = selectedRejectCraftRequestIds.value.filter((id) => pendingIds.has(id));
  });
  stopGoodsRequests = subscribePendingGoodsRequests((requests) => {
    pendingGoodsRequests.value = requests;
    const pendingIds = new Set(requests.map((request) => request.id));
    selectedApproveGoodsRequestIds.value = selectedApproveGoodsRequestIds.value.filter((id) => pendingIds.has(id));
    selectedRejectGoodsRequestIds.value = selectedRejectGoodsRequestIds.value.filter((id) => pendingIds.has(id));
  });
  stopUsedDays = subscribeCurrentCycleUsedDays({}, (rows) => {
    usedDaysByHero.value = rows;
  }, (error) => {
    console.warn('[admin] Failed to load used days', error);
    usedDaysByHero.value = new Map();
  });
});

onBeforeUnmount(() => {
  populationStore.stopListening();
  stopHeroes?.();
  stopReligions?.();
  stopClergy?.();
  stopHeroBalanceSyncLogs?.();
  stopGoods?.();
  stopGuilds?.();
  stopCraftingRequests?.();
  stopGoodsRequests?.();
  stopUsedDays?.();
  yieldBuildingStore.stop();
});

function formatTimestamp(timestamp) {
  if (!timestamp?.toDate) return '-';
  const date = timestamp.toDate();
  return date.toLocaleString('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatSnapshotDateTime(timestamp) {
  if (!timestamp?.toDate) return '—';
  const date = timestamp.toDate();
  return date.toLocaleString('uk-UA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function buildSnapshotGroupKey(timestamp, source) {
  if (!timestamp?.toMillis) return '';
  const minuteBucket = Math.floor(timestamp.toMillis() / 60000);
  return `snapshot-${source || 'unknown_source'}-${minuteBucket}`;
}
</script>

<style scoped>
/* ── Main card ───────────────────────────────────────────────── */
.admin-card {
  background: linear-gradient(135deg, rgba(14,9,4,0.9), rgba(26,17,8,0.85)) !important;
  border: 1px solid var(--wi-border) !important;
}

.admin-page {
  padding-top: 24px;
  padding-bottom: 40px;
}

/* ── Titles ──────────────────────────────────────────────────── */
.admin-card :deep(.v-card-title.text-h6) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.1em !important;
  text-transform: uppercase !important;
  color: var(--wi-text-muted) !important;
  padding-top: 4px;
}

/* ── Dividers ────────────────────────────────────────────────── */
.admin-card :deep(.v-divider) {
  border-color: var(--wi-border) !important;
  opacity: 1;
}

/* ── Inner cards (outlined / tonal) ─────────────────────────── */
.admin-card :deep(.v-card[class*="pa-"]:not(.admin-card)),
.admin-card :deep(.v-card--variant-outlined),
.admin-card :deep(.v-card--variant-tonal) {
  background: rgba(6, 4, 1, 0.55) !important;
  border-color: var(--wi-border) !important;
}

.admin-card :deep(.v-card .text-subtitle-1),
.admin-card :deep(.v-card .text-subtitle-2) {
  font-family: var(--wi-font-heading);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--wi-text-muted);
}

/* ── Data tables ─────────────────────────────────────────────── */
.admin-card :deep(.v-data-table thead tr th),
.admin-card :deep(.v-table thead tr th) {
  font-family: var(--wi-font-heading) !important;
  font-size: 0.68rem !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: var(--wi-text-muted) !important;
  background: #1a1108 !important;
  border-bottom: 1px solid var(--wi-border) !important;
}

.admin-card :deep(.v-data-table tbody tr td),
.admin-card :deep(.v-table tbody tr td) {
  color: var(--wi-text) !important;
  font-family: var(--wi-font-body) !important;
  border-bottom: 1px solid rgba(90, 62, 32, 0.2) !important;
  background: transparent !important;
}

.admin-card :deep(.v-data-table-footer) {
  font-family: var(--wi-font-body);
  color: var(--wi-text-muted);
  border-top: 1px solid var(--wi-border);
}

.hero-workspace { overflow: hidden; }

.hero-workspace__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px;
  border-bottom: 1px solid var(--wi-border);
}

.hero-workspace__filters {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 150px;
  gap: 12px;
  width: min(100%, 460px);
}

.hero-workspace__table :deep(.v-data-table__td:last-child) { white-space: nowrap; }

.hero-days {
  display: flex;
  flex-direction: column;
  min-width: 220px;
}

.hero-days strong { color: var(--wi-gold-light); }

.hero-days span {
  color: var(--wi-text-muted);
  font-size: 0.72rem;
}

@media (max-width: 700px) {
  .admin-card { padding: 16px !important; }
  .hero-workspace__toolbar { align-items: stretch; flex-direction: column; }
  .hero-workspace__filters { grid-template-columns: 1fr; width: 100%; }
}

/* ── Snapshot history table ──────────────────────────────────── */
.snapshot-history-table { overflow-x: auto; }

/* ── Dialog card ─────────────────────────────────────────────── */
:deep(.v-overlay .v-card) {
  background: linear-gradient(135deg, rgba(14,9,4,0.98), rgba(26,17,8,0.95)) !important;
  border: 1px solid var(--wi-border) !important;
}

:deep(.v-overlay .v-card-title) {
  font-family: var(--wi-font-heading) !important;
  color: var(--wi-gold) !important;
  letter-spacing: 0.04em;
}

/* ── Expansion panels (snapshot import preview) ──────────────── */
.admin-card :deep(.v-expansion-panels) {
  border: 1px solid var(--wi-border);
  border-radius: 8px;
  overflow: hidden;
}

.admin-card :deep(.v-expansion-panel-title) {
  font-family: var(--wi-font-body);
  color: var(--wi-text);
  background: rgba(10,6,2,0.7);
}

.admin-card :deep(.v-expansion-panel-text__wrapper) {
  background: rgba(6,4,1,0.6);
  font-family: var(--wi-font-body);
  color: var(--wi-text);
}
</style>
