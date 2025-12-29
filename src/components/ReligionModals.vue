<template>
  <div class="religion-modals">
    <v-dialog v-model="clergyDialogOpen" max-width="840">
      <v-card v-if="activeClergy" class="clergy-dialog" rounded="xl">
        <v-card-text class="pt-0 hero-clergy-modal">
          <v-alert v-if="actionError" type="error" variant="tonal" class="mb-3">
            {{ actionError }}
          </v-alert>

          <v-sheet class="clergy-overview" color="primary" variant="tonal" rounded="lg">
            <div class="clergy-overview__top">
              <div>
                <div class="text-caption text-medium-emphasis">Герой</div>
                <div class="text-h6 font-semibold">{{ activeClergy.heroName }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ activeClergy.religionName }}</div>
              </div>
              <div class="meta-pills">
                <div class="meta-pill">
                  <v-icon size="18" color="primary" v-if="hasIcon(activeClergy.religionName)">
                    <img
                      :src="`/images/religions/${activeClergy.religionName}.png`"
                      alt="Faith Icon"
                      width="18"
                      height="18"
                    />
                  </v-icon>
                  <v-icon v-else class="ml-1" color="primary" size="18">mdi-dharmachakra</v-icon>
                  <div>
                    <div class="text-caption text-medium-emphasis">Очки віри</div>
                    <div class="text-subtitle-1 font-semibold text-black">
                      {{ activeClergy.faith }}<span v-if="activeClergy.faithMax"> / {{ activeClergy.faithMax }}</span>
                    </div>
                  </div>
                </div>
                <div class="meta-pill">
                  <v-icon size="18" :color="downtimeAvailableModel ? 'warning' : 'success'">mdi-progress-clock</v-icon>
                  <div>
                    <div class="text-caption text-medium-emphasis">Даутайм</div>
                    <div class="text-subtitle-2 text-black">{{ downtimeAvailableModel ? 'Дію не виконано' : 'Дію виконано' }}</div>
                  </div>
                </div>
              </div>
            </div>
          </v-sheet>

          <div v-if="isAdmin" class="clergy-grid">
            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Керування очками віри</div>
                  <div class="text-body-2 text-medium-emphasis">Оновіть ОВ та залиште пояснення для журналу.</div>
                </div>
              </div>

              <div class="field-row">
                <v-text-field
                  v-model.number="faithChangeModel"
                  type="number"
                  min="1"
                  label="Зміна ОВ"
                  density="comfortable"
                  prefix="±"
                  hide-details="auto"
                />
                <v-textarea
                  v-model="logMessageModel"
                  rows="2"
                  auto-grow
                  label="Коментар до зміни"
                  density="comfortable"
                  hide-details="auto"
                />
              </div>

              <div class="d-flex gap-2 justify-space-between">
                <v-btn color="error" variant="tonal" :loading="actionLoading" @click="applyFaithChange('remove')">
                  <v-icon start>mdi-minus-circle</v-icon>
                  Зняти ОВ
                </v-btn>
                <v-btn color="success" :loading="actionLoading" @click="applyFaithChange('add')">
                  <v-icon start>mdi-plus-circle</v-icon>
                  Додати ОВ
                </v-btn>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Активний фарм віри</div>
                  <div class="text-body-2 text-medium-emphasis">Дія потребує доступного давнтайму та витрачає його</div>
                </div>
              </div>

              <v-alert v-if="activeFaithFarmError" type="error" variant="tonal" class="mb-3">
                {{ activeFaithFarmError }}
              </v-alert>

              <div class="field-row">
                <v-text-field
                  :model-value="activeClergy?.heroRef?.id || ''"
                  label="ID героя"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                  hint="Герой вибраного духовенства"
                />
                <v-text-field
                  v-model.number="activeFaithFarmFormModel.roll"
                  type="number"
                  label="Кидок"
                  density="comfortable"
                  hide-details="auto"
                  hint="Результат d20 скіл чека"
                />
              </div>

              <div class="field-row">
                <v-text-field
                  v-model.number="activeFaithFarmFormModel.dmMod"
                  type="number"
                  label="DM Mod"
                  density="comfortable"
                  hide-details="auto"
                  prefix="±"
                />
                <v-text-field
                  :model-value="activeFaithFarmDC"
                  label="Базове DC"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <div class="field-row">
                <v-text-field
                  :model-value="currentFaithPoints"
                  label="Поточні ОВ"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
                <v-text-field
                  :model-value="activeFaithFarmFollowers ?? '—'"
                  label="Отримані в результаті ОВ"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <v-text-field
                v-model="activeFaithFarmFormModel.notes"
                label="Нотатки / посилання"
                density="comfortable"
                hide-details="auto"
                hint="Наприклад, посилання на пост у Telegram"
              />

              <div class="d-flex gap-2 mt-3 justify-space-between">
                <v-btn
                  color="primary"
                  :loading="activeFaithFarmLoading"
                  :disabled="!downtimeAvailableModel"
                  @click="applyActiveFaithFarm"
                >
                  <v-icon start>mdi-shield-sun</v-icon>
                  Застосувати
                </v-btn>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Захист духовенства</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Інвестуйте ОВ, щоб активувати щит конфесії героя. Кнопка недоступна, якщо щит вже увімкнено.
                  </div>
                </div>
                <v-chip
                  :color="activeClergyReligion?.shieldActive ? 'success' : 'default'"
                  variant="tonal"
                  class="shield-status-chip"
                >
                  {{ activeClergyReligion?.shieldActive ? `Активний (+${activeClergyReligion.shieldBonus})` : 'Неактивний' }}
                </v-chip>
              </div>

              <v-alert v-if="clergyDefenseError" type="error" variant="tonal" class="mb-3">
                {{ clergyDefenseError }}
              </v-alert>

              <v-alert v-else-if="clergyDefenseFaithError" type="error" variant="tonal" class="mb-3">
                {{ clergyDefenseFaithError }}
              </v-alert>

              <div class="field-row">
                <v-text-field
                  :model-value="activeClergy?.heroRef?.id || ''"
                  label="ID героя"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                  hint="Герой вибраного духовенства"
                />
                <v-text-field
                  :model-value="clergyDefenseTarget"
                  label="Ціль"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <div class="field-row">
                <v-text-field
                  v-model.number="clergyDefenseFormModel.investedOV"
                  type="number"
                  min="50"
                  step="50"
                  label="Інвестовані ОВ"
                  density="comfortable"
                  hide-details="auto"
                />
                <v-text-field
                  v-model.number="clergyDefenseFormModel.roll"
                  type="number"
                  label="Кидок"
                  density="comfortable"
                  hide-details="auto"
                />
              </div>

              <div class="field-row">
                <v-text-field
                  v-model.number="clergyDefenseFormModel.dmMod"
                  type="number"
                  label="DM Mod"
                  prefix="±"
                  density="comfortable"
                  hide-details="auto"
                />
                <v-text-field
                  :model-value="clergyDefenseTargetSVTotal"
                  label="SV цілі (база + тимчасовий)"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <div class="field-row">
                <v-text-field
                  :model-value="clergyDefenseDC"
                  label="DC"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
                <v-text-field
                  :model-value="clergyDefenseResult ?? '—'"
                  label="R"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <div class="field-row">
                <v-text-field
                  :model-value="clergyDefenseBonus"
                  label="Бонус щита"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
                <v-text-field
                  :model-value="currentFaithPoints"
                  label="ОВ духовенства"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <v-textarea
                v-model="clergyDefenseFormModel.notes"
                label="Нотатки / посилання"
                density="comfortable"
                hide-details="auto"
                rows="2"
                auto-grow
              />

              <div class="d-flex gap-2 mt-3 justify-space-between align-center flex-wrap">
                <div class="d-flex gap-2 align-center">
                  <v-btn
                    color="primary"
                    :loading="clergyDefenseLoading"
                    :disabled="clergyDefenseDisabled"
                    @click="applyClergyDefense"
                  >
                    <v-icon start>mdi-shield-plus</v-icon>
                    Застосувати
                  </v-btn>
                  <v-chip v-if="activeClergyReligion?.shieldActive" color="warning" variant="tonal" class="shield-status-chip">
                    Щит вже активний
                  </v-chip>
                <v-chip v-else-if="!downtimeAvailableModel" color="warning" variant="tonal" class="shield-status-chip">
                    Даутайм недоступний
                  </v-chip>
                </div>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Поширення релігії</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Витратьте ОВ, щоб конвертувати послідовників іншої конфесії та зняти щит за наявності.
                  </div>
                </div>
              </div>

              <v-alert v-if="spreadReligionError" type="error" variant="tonal" class="mb-3">
                {{ spreadReligionError }}
              </v-alert>

              <v-alert v-else-if="spreadReligionFaithError" type="error" variant="tonal" class="mb-3">
                {{ spreadReligionFaithError }}
              </v-alert>

              <div class="field-row">
                <v-text-field
                  :model-value="activeClergy?.heroRef?.id || ''"
                  label="ID героя"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                  hint="Герой вибраного духовенства"
                />
                <v-select
                  v-model="spreadReligionFormModel.targetReligionId"
                  :items="spreadTargetReligionOptions"
                  item-title="title"
                  item-value="value"
                  label="Цільова конфесія"
                  density="comfortable"
                  hide-details="auto"
                />
              </div>

              <div class="field-row">
                <v-text-field
                  v-model.number="spreadReligionFormModel.investedOV"
                  type="number"
                  min="50"
                  step="50"
                  label="Витрачені ОВ"
                  density="comfortable"
                  hide-details="auto"
                />
                <v-text-field
                  v-model.number="spreadReligionFormModel.roll"
                  type="number"
                  label="Кидок"
                  density="comfortable"
                  hide-details="auto"
                />
              </div>

              <div class="field-row">
                <v-text-field
                  v-model.number="spreadReligionFormModel.dmMod"
                  type="number"
                  label="DM Mod"
                  prefix="±"
                  density="comfortable"
                  hide-details="auto"
                />
                <v-text-field
                  :model-value="spreadTargetSVTotal"
                  label="SV цілі (база + тимчасовий + щит)"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <div class="field-row">
                <v-text-field
                  :model-value="spreadReligionDC"
                  label="DC"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
                <v-text-field
                  :model-value="spreadReligionResult ?? '—'"
                  label="R = Кидок + floor(ОВ/50)"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <div class="field-row">
                <v-text-field
                  :model-value="spreadReligionConverted ?? '—'"
                  label="Сконвертовано"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
                <v-text-field
                  :model-value="currentFaithPoints"
                  label="ОВ духовенства"
                  density="comfortable"
                  hide-details="auto"
                  readonly
                />
              </div>

              <v-textarea
                v-model="spreadReligionFormModel.notes"
                label="Нотатки / посилання"
                density="comfortable"
                hide-details="auto"
                rows="2"
                auto-grow
              />

              <div class="d-flex gap-2 mt-3 justify-space-between align-center flex-wrap">
                <v-btn
                  color="primary"
                  :loading="spreadReligionLoading"
                  :disabled="spreadReligionDisabled"
                  @click="applySpreadReligion"
                >
                  <v-icon start>mdi-account-convert</v-icon>
                  Застосувати
                </v-btn>
                <v-chip v-if="!downtimeAvailableModel" color="warning" variant="tonal" class="shield-status-chip">
                  Даутайм недоступний
                </v-chip>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Зміна конфесії</div>
                  <div class="text-body-2 text-medium-emphasis">Можна змінити конфесію героя з автоматичним штрафом віри.</div>
                </div>
                <v-btn
                  v-if="!changeReligionModeModel"
                  color="primary"
                  variant="tonal"
                  size="small"
                  prepend-icon="mdi-auto-fix"
                  @click="startReligionChange"
                >
                  Змінити конфесію
                </v-btn>
              </div>

              <div v-if="changeReligionModeModel" class="stacked-card">
                <v-alert v-if="changeReligionError" type="error" variant="tonal" class="mb-3">{{ changeReligionError }}</v-alert>

                <v-select
                  v-model="selectedReligionIdModel"
                  :items="religionOptions"
                  item-title="title"
                  item-value="value"
                  label="Нова конфесія"
                  density="comfortable"
                  hide-details="auto"
                />

                <v-alert type="warning" variant="tonal" class="mt-3">
                  Буде знято {{ religionChangeFine }} ОВ ({{ religionChangeFinePercent }}%) з духовенства за зміну конфесії.
                </v-alert>

                <div class="d-flex gap-2 mt-3 justify-space-between">
                  <v-btn color="primary" :loading="changeReligionLoading" @click="confirmReligionChange">
                    <v-icon start>mdi-check</v-icon>
                    Підтвердити
                  </v-btn>
                  <v-btn variant="text" @click="cancelReligionChange">Скасувати</v-btn>
                </div>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Доступність давнтайму</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Вкажіть чи доступний давнтайм в даному циклі.
                  </div>
                </div>
                <v-switch
                  v-model="downtimeAvailableModel"
                  inset
                  color="primary"
                  hide-details="auto"
                />
              </div>

              <v-alert
                v-if="downtimeUpdateError"
                type="error"
                variant="tonal"
                class="mt-3"
              >
                {{ downtimeUpdateError }}
              </v-alert>
              <v-alert
                v-else-if="downtimeUpdateSuccess"
                type="success"
                variant="tonal"
                class="mt-3"
              >
                Статус давнтайму оновлено.
              </v-alert>

              <div class="d-flex gap-2 mt-3 justify-space-between">
                <v-btn color="primary" :loading="downtimeUpdateLoading" @click="saveDowntimeAvailability">
                  <v-icon start>mdi-content-save</v-icon>
                  Зберегти
                </v-btn>
                <v-btn variant="text" @click="resetDowntimeState">Скинути</v-btn>
              </div>
            </v-sheet>

            <v-sheet class="action-card" rounded="lg" elevation="0">
              <div class="action-card__header">
                <div>
                  <div class="text-subtitle-2 font-semibold">Прапорець щита конфесії</div>
                  <div class="text-body-2 text-medium-emphasis">
                    Адміністратори можуть вручну вмикати або вимикати щит конфесії героя.
                  </div>
                </div>
                <v-chip
                  :color="manualShieldActiveModel ? 'success' : 'default'"
                  variant="tonal"
                  class="shield-status-chip"
                >
                  <v-icon>
                    {{ manualShieldActiveModel ? 'mdi-shield-check' : 'mdi-shield-off' }}
                  </v-icon>
                </v-chip>
              </div>

              <v-alert
                v-if="shieldUpdateError"
                type="error"
                variant="tonal"
                class="mb-3"
              >
                {{ shieldUpdateError }}
              </v-alert>
              <v-alert
                v-else-if="shieldUpdateSuccess"
                type="success"
                variant="tonal"
                class="mb-3"
              >
                Стан щита оновлено.
              </v-alert>

              <div class="d-flex gap-2 mt-3 justify-space-between align-center flex-wrap">
                <v-switch
                  v-model="manualShieldActiveModel"
                  inset
                  color="primary"
                  hide-details="auto"
                  label="Увімкнути щит вручну"
                />
                <div class="d-flex gap-2">
                  <v-btn
                    variant="tonal"
                    color="primary"
                    :loading="shieldUpdateLoading"
                    @click="saveShieldState"
                  >
                    <v-icon start>mdi-content-save</v-icon>
                    Оновити
                  </v-btn>
                  <v-btn variant="text" @click="resetShieldState">Скинути</v-btn>
                </div>
              </div>
            </v-sheet>
          </div>

          <v-sheet class="action-card log-card" rounded="lg" elevation="0">
            <div class="d-flex align-center gap-2 mb-3">
              <v-avatar color="primary" size="28" variant="tonal">
                <v-icon size="18">mdi-history</v-icon>
              </v-avatar>
              <div style="margin-left: 5px">
                <div class="text-subtitle-2 font-semibold">Журнал змін</div>
              </div>
            </div>
            <div v-if="logsLoading" class="text-gray-500">Завантаження журналу…</div>
            <div v-else-if="logsError" class="error">{{ logsError }}</div>
            <div v-else-if="clergyLogs.length === 0" class="text-gray-500">Поки що немає записів.</div>
            <v-list v-else density="comfortable">
              <v-list-item v-for="log in clergyLogs" :key="log.id" class="log-entry">
                <v-list-item-title>
                  <span :class="{ 'text-success': log.delta > 0, 'text-error': log.delta < 0 }">
                    {{ log.delta > 0 ? '+' : '' }}{{ log.delta }}
                  </span>
                  — {{ log.message || 'Без коментаря' }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatLogMeta(log) }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-sheet>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeDialog">Закрити</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="followersDialogOpen" max-width="720">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <div class="text-subtitle-1 font-semibold">Розподіл послідовників</div>
            <div class="text-body-2 text-medium-emphasis">Оберіть кількість послідовників для кожної конфесії.</div>
          </div>
          <v-chip v-if="distributionSelected" color="primary" variant="tonal">
            {{ distributionSelected.name }}
          </v-chip>
        </v-card-title>

        <v-card-text>
          <v-alert
            v-if="followersError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ followersError }}
          </v-alert>

          <p class="text-body-2 text-medium-emphasis mb-4">
            Загалом населення: {{ totalPopulationLabel }}. Розподіліть послідовників між конфесіями. Залишок: {{ followersRemaining }}.
          </p>

          <div
            v-for="item in editedFollowersModel"
            :key="item.name"
            class="followers-row"
            :class="{ 'followers-row--selected': item.name === distributionSelected?.name }"
          >
            <div class="followers-row__header">
              <div class="d-flex align-center gap-2">
                <span class="color-bullet" :style="{ backgroundColor: item.color }"></span>
                <div>
                  <div class="text-subtitle-2 font-semibold">{{ item.name }}</div>
                  <div class="text-caption text-medium-emphasis">Було: {{ item.followers.toLocaleString('uk-UA') }} вірян</div>
                </div>
              </div>
              <div class="text-caption text-medium-emphasis">≈ {{ followersPercentFor(item.newFollowers) }}%</div>
            </div>

            <div class="followers-row__controls">
              <v-slider
                v-model.number="item.newFollowers"
                :min="0"
                :max="followersSliderCeiling"
                step="1"
                color="primary"
                thumb-label="always"
                hide-details
              />
              <v-text-field
                v-model.number="item.newFollowers"
                type="number"
                label="Послідовники"
                density="comfortable"
                hide-details
                class="count-input"
                variant="outlined"
                :min="0"
              />
            </div>

            <div class="text-caption text-medium-emphasis">
              Буде: <b>{{ Number(item.newFollowers || 0).toLocaleString('uk-UA') }}</b> вірян (Δ {{ followersDelta(item) }})
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeFollowersDialog" :disabled="followersSaving">Скасувати</v-btn>
          <v-btn color="primary" :loading="followersSaving" :disabled="followersOverLimit" @click="saveFollowersDistribution">
            Зберегти розподіл
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="newCycleDialogOpen" max-width="640">
      <v-card rounded="xl">
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-3">mdi-playlist-plus</v-icon>
          <span class="text-h6">Почати новий цикл</span>
        </v-card-title>
        <v-card-text>
          <v-alert v-if="cycleError" type="error" variant="tonal" class="mb-4">
            {{ cycleError }}
          </v-alert>
          <v-form>
            <FaerunDatePicker
              v-model="cycleFormModel.startedDate"
              label="Початок"
              placeholder="Оберіть дату початку"
              :year="currentFaerunYear"
            />
            <FaerunDatePicker
              v-model="cycleFormModel.finishedDate"
              label="Завершення (необов'язково)"
              placeholder="Оберіть дату завершення"
              :year="currentFaerunYear"
              clearable
              hint="Залиште поле порожнім, якщо цикл ще триває"
            />
            <v-text-field
              :model-value="cycleDurationLabel"
              label="Тривалість"
              density="comfortable"
              hide-details="auto"
              class="mb-4"
              readonly
            />
            <v-textarea
              v-model="cycleFormModel.notes"
              label="Нотатки до дії"
              auto-grow
              rows="2"
              density="comfortable"
              hide-details="auto"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeNewCycleDialog">Скасувати</v-btn>
          <v-btn color="primary" :loading="cycleSaving" @click="createCycle">
            Створити цикл
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import FaerunDatePicker from '@/components/FaerunDatePicker.vue'

const clergyDialogOpen = defineModel('open', { type: Boolean, default: false })
const faithChangeModel = defineModel('faithChange', { type: Number, default: 0 })
const logMessageModel = defineModel('logMessage', { type: String, default: '' })
const activeFaithFarmFormModel = defineModel('activeFaithFarmForm', { type: Object, default: () => ({}) })
const clergyDefenseFormModel = defineModel('clergyDefenseForm', { type: Object, default: () => ({}) })
const spreadReligionFormModel = defineModel('spreadReligionForm', { type: Object, default: () => ({}) })
const manualShieldActiveModel = defineModel('manualShieldActive', { type: Boolean, default: false })
const downtimeAvailableModel = defineModel('downtimeAvailable', { type: Boolean, default: false })
const changeReligionModeModel = defineModel('changeReligionMode', { type: Boolean, default: false })
const selectedReligionIdModel = defineModel('selectedReligionId', { type: String, default: '' })
const followersDialogOpen = defineModel('followersDialogOpen', { type: Boolean, default: false })
const editedFollowersModel = defineModel('editedFollowers', { type: Array, default: () => [] })
const newCycleDialogOpen = defineModel('newCycleDialog', { type: Boolean, default: false })
const cycleFormModel = defineModel('cycleForm', { type: Object, default: () => ({}) })

const props = defineProps({
  activeClergy: Object,
  actionError: String,
  hasIcon: { type: Function, required: true },
  isAdmin: { type: [Boolean, Object], default: false },
  actionLoading: { type: Boolean, default: false },
  applyFaithChange: { type: Function, required: true },
  activeFaithFarmError: String,
  activeFaithFarmLoading: { type: Boolean, default: false },
  activeFaithFarmDC: [Number, String],
  currentFaithPoints: [Number, String],
  activeFaithFarmFollowers: [Number, String],
  applyActiveFaithFarm: { type: Function, required: true },
  clergyDefenseError: String,
  clergyDefenseFaithError: String,
  clergyDefenseTarget: String,
  clergyDefenseTargetSVTotal: [Number, String],
  clergyDefenseDC: [Number, String],
  clergyDefenseResult: [Number, String],
  clergyDefenseBonus: [Number, String],
  clergyDefenseLoading: { type: Boolean, default: false },
  clergyDefenseDisabled: { type: Boolean, default: false },
  applyClergyDefense: { type: Function, required: true },
  activeClergyReligion: Object,
  spreadReligionError: String,
  spreadReligionFaithError: String,
  spreadTargetReligionOptions: { type: Array, default: () => [] },
  spreadTargetSVTotal: [Number, String],
  spreadReligionDC: [Number, String],
  spreadReligionResult: [Number, String],
  spreadReligionConverted: [Number, String],
  spreadReligionLoading: { type: Boolean, default: false },
  spreadReligionDisabled: { type: Boolean, default: false },
  spreadReligionTargetShieldActive: { type: Boolean, default: false },
  applySpreadReligion: { type: Function, required: true },
  downtimeUpdateError: String,
  downtimeUpdateSuccess: { type: Boolean, default: false },
  downtimeUpdateLoading: { type: Boolean, default: false },
  saveDowntimeAvailability: { type: Function, required: true },
  resetDowntimeState: { type: Function, required: true },
  shieldUpdateError: String,
  shieldUpdateSuccess: { type: Boolean, default: false },
  shieldUpdateLoading: { type: Boolean, default: false },
  saveShieldState: { type: Function, required: true },
  resetShieldState: { type: Function, required: true },
  logsLoading: { type: Boolean, default: false },
  logsError: String,
  clergyLogs: { type: Array, default: () => [] },
  formatLogMeta: { type: Function, required: true },
  closeDialog: { type: Function, required: true },
  changeReligionLoading: { type: Boolean, default: false },
  changeReligionError: String,
  startReligionChange: { type: Function, required: true },
  cancelReligionChange: { type: Function, required: true },
  confirmReligionChange: { type: Function, required: true },
  religionOptions: { type: Array, default: () => [] },
  religionChangeFine: [Number, String],
  religionChangeFinePercent: [Number, String],
  followersError: String,
  totalPopulationLabel: [Number, String],
  followersRemaining: [Number, String],
  distributionSelected: Object,
  followersSliderCeiling: [Number, String],
  followersPercentFor: { type: Function, required: true },
  followersDelta: { type: Function, required: true },
  followersSaving: { type: Boolean, default: false },
  followersOverLimit: { type: Boolean, default: false },
  closeFollowersDialog: { type: Function, required: true },
  saveFollowersDistribution: { type: Function, required: true },
  cycleError: String,
  currentFaerunYear: [Number, String],
  cycleDurationLabel: String,
  cycleSaving: { type: Boolean, default: false },
  createCycle: { type: Function, required: true },
  closeNewCycleDialog: { type: Function, required: true },
})
</script>

<style scoped>
.error {
  color: #dc2626;
  font-size: 15px;
  margin-top: 8px;
}

.hero-clergy-modal {
  margin-top: 10px;
}

.clergy-overview {
  padding: 12px 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(63, 81, 181, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.clergy-overview__top {
  display: flex;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
}

.meta-pills {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-pill {
  display: flex;
  gap: 10px;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.clergy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.action-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(245, 247, 255, 0.8));
  border: 1px solid rgba(63, 81, 181, 0.08);
  padding: 14px;
}

.action-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.field-row {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.stacked-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid rgba(63, 81, 181, 0.08);
}

.log-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(244, 246, 255, 0.9));
}

.log-entry + .log-entry {
  border-top: 1px dashed rgba(0, 0, 0, 0.05);
}

.shield-status-chip {
  align-items: center;
  flex: none;
}

.color-bullet {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}

.followers-row {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background-color: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.followers-row--selected {
  border-color: #3f51b5;
  box-shadow: 0 4px 18px rgba(63, 81, 181, 0.15);
}

.followers-row__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.followers-row__controls {
  display: grid;
  grid-template-columns: 1fr 160px;
  gap: 12px;
  align-items: center;
  margin-bottom: 6px;
}

@media (max-width: 960px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .followers-row__controls {
    grid-template-columns: 1fr;
  }
}
</style>

