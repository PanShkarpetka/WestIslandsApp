export const COLLECTIONS = {
  BOT_CONFIGS: 'bot-configs',
  FISHES: 'fishes',
  FISHING_LOGS: 'fishing-logs',
  USER_SESSIONS: 'fishing-sessions',
  PROCESSED_UPDATES: 'telegram-processed-updates'
};

export const BOT_CONFIG_DOC = 'fishing';

export const COMMANDS = {
  FISH: '/fish',
  CANCEL: '/cancel',
  RESET: '/reset',
  HELP: '/fishing_help',
  RESET_FISH_AVAILABILITY: '/admin_fish_reset_availability',
  FORCE_DAILY_RESET: '/admin_fish_force_daily_reset',
  LIST_AVAILABLE_FISHES_TODAY: '/admin_fish_available_today',
  GET_FISH_PRICE: '/admin_fish_price',
  LIST_SUCCESSFUL_CATCHES_TODAY: '/admin_fish_catches_today',
  LIST_SUCCESSFUL_CATCHES_YESTERDAY: '/admin_fish_catches_yesterday',
  SUM_SUCCESSFUL_CATCHES_BY_USER_ALL_TIME: '/admin_fish_catches_total'
};

export const BAIT_TYPES = {
  BASIC: 'basic',
  SIMPLE: 'simple',
  ADVANCED: 'advanced'
};

export const SESSION_STEPS = {
  IDLE: 'idle',
  MODIFIER_1: 'modifier_1',
  MODIFIER_2: 'modifier_2',
  MODIFIER_3: 'modifier_3',
  GUIDANCE: 'guidance',
  BAIT: 'bait',
  ADDITIONAL_ROLL_CONFIRM: 'additional_roll_confirm'
};

export const DEFAULT_CONFIG = {
  modifierLimits: {
    min: -20,
    max: 20
  },
  dc: {
    mainCatch: 45,
    additionalCheckDc: 10,
    eachRollDc: 10
  },
  quantityRules: [
    { minSum: 65, quantity: 3 },
    { minSum: 55, quantity: 2 },
    { minSum: 45, quantity: 1 }
  ],
  guidance: {
    enabled: true,
    diceSides: 4,
    applyTo: 'all_rolls'
  },
  bait: {
    basic: { enabled: true, bonusDieSides: 0 },
    simple: { enabled: true, bonusDieSides: 4 },
    advanced: { enabled: true, bonusDieSides: 6 }
  },
  fishSelection: {
    strategy: 'random',
    maxDistinctFishPerRun: 3,
    skipUnavailable: true
  }
};

export const ACTIVE_SESSION_TIMEOUT_MS = 2 * 60 * 1000;
