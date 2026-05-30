/**
 * Firestore schema type definitions (JSDoc).
 *
 * This file is the source of truth for Firestore document shapes.
 * Update it whenever you add, rename, or remove fields in any collection.
 * Collections are grouped by domain.
 */

// ─── ISLANDS ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} IslandDoc
 * @property {Record<string, BuildingEntry>} buildings - Map of building key → building state
 * @property {number} buildingDiscount - Cost discount multiplier (0–1)
 * @property {string[]} manufactures - Array of manufacture document IDs
 */

/**
 * @typedef {Object} BuildingEntry
 * @property {boolean} built - Whether the building has been constructed
 */

// ─── BUILDINGS ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} BuildingDoc
 * @property {string} id
 * @property {string} name
 * @property {number} cost
 * @property {Record<number, number>} [growthPerCycle] - Optional map of level → population growth per cycle (e.g. Park building). Keys are level numbers (1–3).
 * @property {number} [currentLvl] - Current building level (0 = not built). Used together with growthPerCycle.
 */

// ─── POPULATION ──────────────────────────────────────────────────────────────

/**
 * @typedef {Object} PopulationDoc
 * @property {string} id
 * @property {string} islandId
 * @property {string} name
 * @property {number} count
 * @property {number} incomePerPerson
 * @property {string} description
 * @property {string} [imageUrl] - Optional card background image URL.
 * @property {string} [faction] - Optional faction identifier ('archmasters', 'bureaucrats', etc.).
 */

// ─── INTEREST GROUPS ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} InterestGroupDoc
 * @property {string} id
 * @property {string} islandId
 * @property {string} name
 * @property {number} count
 */

// ─── SHIPS ───────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ShipDoc
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} speedUnit
 * @property {number} capacity
 * @property {boolean} visible
 */

// ─── TREASURY ─────────────────────────────────────────────────────────────────

/**
 * Singleton document at `treasury/meta`.
 * @typedef {Object} TreasuryMetaDoc
 * @property {number} balance
 * @property {number} totalIncome
 * @property {number} totalOutcome
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * Collection: `treasury-transactions/{txId}`
 * @typedef {Object} TreasuryTransactionDoc
 * @property {string} id
 * @property {number} amount - Positive for deposits, negative for withdrawals
 * @property {'deposit'|'withdraw'} type
 * @property {string} comment
 * @property {string} userId - Firebase UID, 'anon', or 'system'
 * @property {string} nickname
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {number} balanceAfter
 * @property {string} cycleId
 * @property {string} cycleStartedAt - Faerun date string
 * @property {string|null} cycleFinishedAt - Faerun date string or null if cycle is open
 */

// ─── GUILDS ──────────────────────────────────────────────────────────────────

/**
 * Collection: `guilds/{guildId}`
 * @typedef {Object} GuildDoc
 * @property {string} id
 * @property {string} name
 * @property {string} shortName
 * @property {string} leader
 * @property {number} treasure
 * @property {boolean} visibleToAll
 * @property {string} withdrawUsername
 * @property {string} withdrawPassword
 * @property {string} leaderPassword
 * @property {Record<string, unknown>} assets
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * Subcollection: `guilds/{guildId}/logs/{logId}`
 * @typedef {Object} GuildLogDoc
 * @property {string} id
 * @property {number} amount
 * @property {'deposit'|'withdraw'} type
 * @property {string} comment
 * @property {string} userNickname
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {number} treasureAfter
 */

// ─── RELIGION ────────────────────────────────────────────────────────────────

/**
 * Collection: `religions/{religionId}`
 * @typedef {Object} ReligionDoc
 * @property {string} id
 * @property {string} name
 * @property {number} followers
 * @property {'none'|'chapel'|'temple'|'cathedral'} buildingLevel
 * @property {string|null} buildingUpdatedAt - Faerun date string
 * @property {number} buildingFaithIncome
 * @property {number} farmBase
 * @property {number} farmDCBase
 * @property {number} minSpreadFollowers
 * @property {boolean} shieldActive
 * @property {number} shieldBonus
 * @property {number} svBase
 * @property {number} svTemp
 * @property {string[]} abilities - Array of religionsAbilities document IDs
 * @property {Record<string, unknown>} milestoneAbilities
 */

/**
 * Collection: `religion-abilities/{abilityId}`
 * @typedef {Object} ReligionAbilityDoc
 * @property {string} id
 * @property {string} name
 * @property {string} description
 */

/**
 * Subcollection: `religions/{PSEUDO_RELIGION_ID}/customs/Deva`
 * Tracks the celestial (Deva) faith pool shared across all clergy.
 * @typedef {Object} DevaCustomDoc
 * @property {number} devaFaith - Current faith level (0–100). Set to 0 when it would go negative.
 * @property {number} devaFaithPerDay - Faith consumed per in-game day.
 * @property {number} deathMarkers - Number of times faith dropped below zero during a cycle (0–3). Each marker adds a crack to the gauge.
 * @property {string} lastConsumedCycleId - ID of the last cycle that triggered faith deduction, used to prevent double-counting.
 */

/**
 * Collection: `clergy/{clergyId}`
 * @typedef {Object} ClergyDoc
 * @property {string} id
 * @property {import('firebase/firestore').DocumentReference} hero - Ref to heroes/{heroId}
 * @property {import('firebase/firestore').DocumentReference} religion - Ref to religions/{religionId}
 * @property {number} faith
 * @property {number} faithMax
 * @property {number} celestialFaith
 * @property {number} sharedFaith
 * @property {number} celestialTransferred
 * @property {number} celestialGenerated
 * @property {string} selectedCelestialBonus
 * @property {boolean} inactive
 * @property {boolean} downtimeAvailable
 */

/**
 * Subcollection: `clergy/{clergyId}/logs/{logId}`
 * @typedef {Object} ClergyLogDoc
 * @property {number} delta - Positive or negative faith change
 * @property {string} message
 * @property {string} user - Nickname of user who made the change
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

/**
 * Collection: `religion-actions/{actionId}`
 * @typedef {Object} ReligionActionDoc
 * @property {import('firebase/firestore').DocumentReference} actionType - Ref to religion-action-types
 * @property {string} cycleId
 * @property {string} notes
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {number} convertedFollowers
 * @property {number} result
 */

// ─── DONATIONS ───────────────────────────────────────────────────────────────

/**
 * Collection: `donation-goals/{goalId}`
 * @typedef {Object} DonationGoalDoc
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {number} target
 * @property {number} collected
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {string} createdBy
 * @property {string} type
 * @property {string|null} targetBuildingKey
 * @property {boolean} visible
 * @property {'open'|'locked'|'closed'} status
 * @property {boolean} treasury
 */

/**
 * Collection: `donations/{donationId}`
 * @typedef {Object} DonationDoc
 * @property {string} id
 * @property {string} goalId
 * @property {number} amount
 * @property {string|null} character
 * @property {import('firebase/firestore').Timestamp} donatedAt
 */

// ─── CYCLES ──────────────────────────────────────────────────────────────────

/**
 * Collection: `cycles/{cycleId}`
 * @typedef {Object} CycleDoc
 * @property {string} id
 * @property {string} startedAt - Faerun date string
 * @property {string|null} finishedAt - Faerun date string, null if cycle is open
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

// ─── MANUFACTURES ────────────────────────────────────────────────────────────

/**
 * Collection: `manufactures/{manufactureId}`
 * @typedef {Object} ManufactureDoc
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} income
 * @property {string} incomeDestination - 'treasury', 'guild:{guildId}', or 'hero:{heroId}'
 * @property {'manufacture'|'auto'} [type] - 'manufacture' (default) or 'auto' (auto income/expense)
 * @property {Record<string, number>} [incomeGoods] - goods distributed per cycle, keyed by goodId
 */

// ─── HEROES & CRAFTING ───────────────────────────────────────────────────────

/**
 * Collection: `heroes/{heroId}`
 * @typedef {Object} HeroDoc
 * @property {string} id
 * @property {string} name
 * @property {boolean} inactive
 * @property {boolean} passiveOVInactive
 * @property {boolean} downtimeAvailable
 * @property {HeroCraftingData} crafting
 * @property {string} [password] - when set, enables player login
 * @property {number} [goldBalance] - personal gold balance, never negative
 * @property {Record<string, number>} [goods] - personal goods inventory, keyed by goodId
 */

/**
 * Collection: `goods/{goodId}`
 * @typedef {Object} GoodDoc
 * @property {string} name
 * @property {string} [unit] - display unit, e.g. "barrel", "unit", "кг"
 */

/**
 * Collection: `hero-transactions/{txId}`
 * @typedef {Object} HeroTransactionDoc
 * @property {string} heroId
 * @property {string} heroName - snapshot of hero name at transaction time
 * @property {number} goldAmount - positive = credit, negative = debit
 * @property {Record<string, number>} goods - keyed by goodId; positive = credit, negative = debit
 * @property {'income'|'withdrawal'|'deduction'} type
 * @property {string} comment
 * @property {string} [cycleId]
 * @property {string} [cycleStartedAt]
 * @property {string} [cycleFinishedAt]
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

/**
 * @typedef {Object} HeroCraftingData
 * @property {HeroCraftingSummary} summary
 * @property {Record<string, HeroItemProgress>} itemProgress - Keyed by item slug
 * @property {Record<string, number>} categoryProgress - Keyed by category key
 * @property {Record<string, number>} subcategoryProgress - Keyed by subcategory key
 */

/**
 * @typedef {Object} HeroCraftingSummary
 * @property {number} totalCraftActions
 * @property {number} totalItemsCrafted
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * @typedef {Object} HeroItemProgress
 * @property {number} category
 * @property {number} subcategory
 * @property {number} specialization
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * Subcollection: `heroes/{heroId}/crafting-logs/{logId}`
 * @typedef {Object} CraftingLogDoc
 * @property {string} id
 * @property {string} itemSlug
 * @property {string} itemName
 * @property {number} amountCrafted
 * @property {number} componentPriceAtTime
 * @property {number} totalComponentPriceAtTime
 * @property {number} categoryBefore
 * @property {number} categoryAfter
 * @property {number} subcategoryBefore
 * @property {number} subcategoryAfter
 * @property {number} specializationBefore
 * @property {number} specializationAfter
 * @property {boolean} categoryCappedReached
 * @property {boolean} subcategoryCappedReached
 * @property {boolean} specializationCappedReached
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {string} createdBy
 */

/**
 * Collection: `craft-items/{itemSlug}`
 * @typedef {Object} CraftItemDoc
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} subcategory
 * @property {string} categoryKey
 * @property {string} subcategoryKey
 * @property {number} componentPrice
 * @property {number|null} weight
 * @property {number} craftDays
 * @property {number} dc
 * @property {boolean} isActive
 */

// ─── MAGE GUILD ──────────────────────────────────────────────────────────────

/**
 * Collection: `spell-requests/{requestId}`
 * @typedef {Object} SpellRequestDoc
 * @property {string} id
 * @property {import('firebase/firestore').DocumentReference} cycle - Ref to cycles/{cycleId}
 * @property {string} cycleId
 * @property {string} cycleStartedAt
 * @property {string} cycleFinishedAt
 * @property {string} cycleLabel
 * @property {string} islandId
 * @property {number} population
 * @property {number} requestsMin
 * @property {number} requestsMax
 * @property {number} rolledRequestsCount
 * @property {number} requestsCount
 * @property {SpellRequestItem[]} requests
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 * @property {string} createdBy
 * @property {import('firebase/firestore').Timestamp|null} priceChangesAppliedAt
 * @property {boolean} isTest
 */

/**
 * @typedef {Object} SpellRequestItem
 * @property {string} localId
 * @property {string} spellId
 * @property {string} spellName
 * @property {string} spellLevel
 * @property {number} compensation
 * @property {number} downtimeDays
 * @property {boolean} fulfilled
 * @property {import('firebase/firestore').Timestamp|null} fulfilledAt
 * @property {string} fulfilledByHeroId
 * @property {string} fulfilledByHeroName
 * @property {string} fulfilledByHeroRefPath
 * @property {string} telegramPostUrl
 * @property {string} updatedBy
 */

/**
 * Collection: `spells/{spellId}`
 * @typedef {Object} SpellDoc
 * @property {string} id
 * @property {string} name
 * @property {string} spellLevel
 * @property {string} spellTier
 * @property {number} currentPrice
 * @property {SpellRequestHistoryEntry[]} requestHistory
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * @typedef {Object} SpellRequestHistoryEntry
 * @property {string} requestId
 * @property {string} spellRequestId
 * @property {string} cycleId
 * @property {string} fulfilledAt
 * @property {string} heroId
 * @property {string} heroName
 * @property {string} telegramPostUrl
 * @property {string} spellName
 * @property {number} compensation
 * @property {number} downtimeDays
 * @property {import('firebase/firestore').Timestamp} recordedAt
 */

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/**
 * Singleton document at `credentials/admin`
 * @typedef {Object} CredentialsAdminDoc
 * @property {string} password
 */

// ─── LOGS ─────────────────────────────────────────────────────────────────────

/**
 * Collection: `logs/{logId}`
 * @typedef {Object} LogDoc
 * @property {string} action
 * @property {string} user
 * @property {import('firebase/firestore').Timestamp} timestamp
 * @property {string} type
 * @property {string} [goalId]
 * @property {string} [goalTitle]
 * @property {number} [amount]
 */

// ─── FISHING BOT (Cloud Functions) ───────────────────────────────────────────

/**
 * Singleton document at `bot-configs/fishing`
 * @typedef {Object} BotFishingConfigDoc
 * @property {{ min: number, max: number }} modifierLimits
 * @property {{ mainCatch: number, additionalCheckDc: number, eachRollDc: number }} dc
 * @property {Array<{ minSum: number, quantity: number }>} quantityRules
 * @property {{ enabled: boolean, diceSides: number, applyTo: string }} guidance
 * @property {{ basic: BaitConfig, simple: BaitConfig, advanced: BaitConfig }} bait
 * @property {{ strategy: string, maxDistinctFishPerRun: number, skipUnavailable: boolean, allowDuplicates: boolean }} fishSelection
 * @property {FishingStateData} fishingState
 */

/**
 * @typedef {Object} BaitConfig
 * @property {boolean} enabled
 * @property {number} bonusDieSides
 */

/**
 * @typedef {Object} FishingStateData
 * @property {string} lastResetDateKey
 * @property {number} caughtCounter - Successes since last DC change
 * @property {number} notCaughtCounter - Failures since last DC change
 * @property {import('firebase/firestore').Timestamp} resetAt
 * @property {import('firebase/firestore').Timestamp} lastOutcomeAt
 */

/**
 * Collection: `fishes/{fishId}`
 * @typedef {Object} FishDoc
 * @property {string} id
 * @property {string} fishName
 * @property {string} fishDescription
 * @property {number} fishCodeNumber
 * @property {number} fishValueSilver
 * @property {number} fishAdditionalRollsRequiredForSuccessfulCatch
 * @property {number} fishAmountDaily - Respawn amount per day
 * @property {number} fishAmountAvailableNow - Current available stock
 */

/**
 * Collection: `fishing-logs/{logId}`
 * @typedef {Object} FishingLogDoc
 * @property {number|string} telegramUserId
 * @property {string} command
 * @property {unknown[]} rawEnteredParams
 * @property {Record<string, unknown>} normalizedParams
 * @property {number[]} d20RawRolls
 * @property {number[]} modifiers
 * @property {number[]} finalRollValues
 * @property {Record<string, unknown>} guidanceData
 * @property {string} baitUsed
 * @property {number} baitBonusRoll
 * @property {number} finalComputedSum
 * @property {unknown[]} dcChecksPerformed
 * @property {'success'|'failure'} successFailureResult
 * @property {Pick<FishDoc, 'id'|'fishName'|'fishDescription'|'fishCodeNumber'|'fishValueSilver'|'fishAdditionalRollsRequiredForSuccessfulCatch'>[]} fishSelected
 * @property {number} fishQuantityCaught
 * @property {Array<{ fishId: string, before: number, requested: number, awarded: number, after: number }>} fishAvailabilityChanges
 * @property {unknown[]} extraCheckResults
 * @property {import('firebase/firestore').Timestamp|string} timestamp
 */

/**
 * Collection: `fishing-sessions/{telegramUserId}`
 * @typedef {Object} FishingSessionDoc
 * @property {number|string} telegramUserId
 * @property {string} step - e.g. 'idle' | 'modifier_1' | 'modifier_2' | 'bait_choice'
 * @property {Record<string, unknown>} payload
 * @property {import('firebase/firestore').Timestamp|string} updatedAt
 * @property {boolean} [staleSessionCleared]
 */

/**
 * Collection: `telegram-processed-updates/{updateId}`
 * @typedef {Object} TelegramProcessedUpdateDoc
 * @property {number|string} updateId
 * @property {import('firebase/firestore').Timestamp|string} processedAt
 */

export {}
