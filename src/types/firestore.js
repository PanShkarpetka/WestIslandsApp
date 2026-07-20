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
 * @property {number} [taxRate] - Base island tax multiplier for new financial flows (0.1 = 10%).
 * @property {number} [fishSaleTaxRate] - Tax multiplier for fish sales (0.1 = 10%)
 * @property {string[]} manufactures - Array of manufacture document IDs
 */

/**
 * @typedef {Object} BuildingEntry
 * @property {boolean} built - Whether the building has been constructed
 * @property {string} [builtAt] - Faerun date string when the building was constructed
 * @property {string} [builtCycleId] - Cycle ID when the building was constructed
 * @property {string} [yieldBuildingId] - Links to yield-buildings collection if this is a custom yield building
 * @property {YieldEvent[]} [yields] - Scheduled harvest events for this building
 * @property {'hero'|'guild'} [ownerType] - Kind of owner used by building lists and owner-action access
 * @property {string} [ownerId] - Hero or guild document ID selected by `ownerType`; scheduled yield destinations remain event-specific
 * @property {string} [ownerHeroId] - Legacy/compatibility hero owner ID
 * @property {string} [ownerGuildId] - Compatibility guild owner ID
 * @property {{cycleId: string, count: number}} [actionUsage] - Owner-action usage counter for the referenced cycle
 */

/**
 * @typedef {Object} YieldEvent
 * @property {string} id - Unique identifier for this event
 * @property {string} destination - Recipient: 'hero:{heroId}' or 'guild:{guildId}'
 * @property {string} date - Faerun date string when this harvest triggers
 * @property {Record<string, string|number>} goods - goodId → fixed number or dice notation (e.g. "20d10")
 * @property {boolean} processed - Whether this event has been executed during a cycle rollover
 * @property {string} [processedAt] - Faerun date string of the cycle start that processed this event
 * @property {Record<string, number>} [processedAmounts] - Actual rolled amounts per goodId
 * @property {boolean} [manuallyFulfilled] - True when admin manually fulfilled the event (not auto-processed)
 */

// ─── YIELD BUILDINGS ─────────────────────────────────────────────────────────

/**
 * Collection: `yield-buildings/{id}`
 * Custom buildings that periodically distribute goods to heroes or guilds.
 * These are admin-created and separate from the standard buildings in the `buildings` collection.
 * Island instances are stored under islands/{islandId}.buildings with key `yield_<id>`.
 * @typedef {Object} YieldBuilding
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {'scheduled'|'owner-action'} [incomeType] - Scheduled harvests (legacy/default) or a paid owner-triggered action
 * @property {number} [actionCostGold] - Gold deducted from the owner per action
 * @property {number} [maxUsesPerCycle] - Maximum successful owner actions in one cycle
 * @property {YieldBuildingActionVariant[]} [actionVariants] - Goods choices offered for each action
 */

/**
 * @typedef {Object} YieldBuildingActionVariant
 * @property {string} id - Stable variant ID stored in transaction audit rows
 * @property {string} goodId - Existing `goods/{goodId}` document ID
 * @property {number} amount - Whole number of goods credited per action
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
 * @property {number} [hp] - Current hull hit points
 * @property {number} [hpMax] - Maximum hull hit points
 * @property {number} [ac]
 * @property {number} [damageThreshold]
 * @property {number} [hullDiceUsed]
 * @property {number} [crewCurrent]
 * @property {number} [passengerCurrent]
 * @property {number} [tonnageCurrent]
 * @property {number} [weaponSlotsUsed]
 * @property {unknown[]} [weaponSlots]
 * @property {string[]} [hullUpgrades] - Active hull upgrades. Multiple upgrades may be selected.
 * @property {string} [hullUpgrade] - Legacy single hull upgrade, read as a fallback.
 * @property {Record<string, number>} [ammunition]
 * @property {string} [size]
 * @property {string} [description]
 * @property {string} [image]
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
 * @property {'deposit'|'withdraw'|'fish-tax'|'mage-guild-tax'} type
 * @property {string} comment
 * @property {string} userId - Firebase UID, 'anon', or 'system'
 * @property {string} nickname
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {number} balanceAfter
 * @property {string} [spellRequestId]
 * @property {string} [requestId]
 * @property {number} [taxRate]
 * @property {number} [grossAmount]
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
 * @property {Record<string, number>} [goods] - Goods inventory keyed by goodId
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

/**
 * Subcollection: `guilds/{guildId}/logs/{logId}`
 * @typedef {Object} GuildLogDoc
 * @property {string} id
 * @property {number} amount
 * @property {'deposit'|'withdraw'|'goods-deposit'|'goods-withdraw'|'mage-guild-tax'|'building-action'} type
 * @property {string} comment
 * @property {string} userNickname
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {number} treasureAfter
 * @property {string} [spellRequestId]
 * @property {string} [requestId]
 * @property {string} [approvedFromRequestId]
 * @property {string} [approvedBy]
 * @property {number} [taxRate]
 * @property {number} [grossAmount]
 * @property {Record<string, number>} [goods] - Goods delta (positive = added, negative = removed); set for goods transactions
 * @property {Record<string, number>} [goodsAfter] - Goods snapshot after the transaction
 * @property {string} [islandId]
 * @property {string} [buildingKey]
 * @property {string} [yieldBuildingId]
 * @property {string} [cycleId]
 * @property {string} [actionVariantId]
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
 * @property {number} [investedFaith] - Faith points spent on shield/spread religion actions.
 * @property {number} [faithPenalty] - Faith points charged as a penalty, such as religion changes.
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
 * @property {number} [populationAtStart]
 * @property {ExpeditionData} [expedition] - Expedition completed during this cycle.
 * @property {AutoIncomeOperation} [autoIncomeOperation] - Money-only manufacture/population/Coin Pig operation status and audit logs.
 * @property {WeatherForecastDay[]} [weatherForecast] - Stored 7-day seasonal weather forecast generated from the cycle start.
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

/**
 * @typedef {Object} ExpeditionData
 * @property {string} adventureTitle
 * @property {number} durationDays - Expedition days, excluding the seven-day rest period.
 * @property {string[]} participantHeroIds
 * @property {{heroId: string, heroName: string}[]} participants - Participant name snapshots.
 * @property {{role: string, count: number, dailyRate: number}[]} crewGroups
 * @property {number} totalCrewCount
 * @property {number} totalCost
 * @property {boolean} autoDeduct
 * @property {'deducted'|'skipped'|'edited'} paymentStatus - `edited` means expedition data changed without another financial transaction.
 * @property {{heroId: string, heroName: string, amount: number}[]} participantShares
 * @property {import('firebase/firestore').Timestamp} [editedAt]
 */

/**
 * @typedef {Object} AutoIncomeOperation
 * @property {'done'|'failed'} status
 * @property {'cycle-start'|'manual-rerun'} source
 * @property {boolean} moneyOnly
 * @property {number} logCount
 * @property {AutoIncomeOperationLog[]} logs
 * @property {number} totalIncome
 * @property {number} totalOutcome
 * @property {import('firebase/firestore').Timestamp} [processedAt]
 * @property {import('firebase/firestore').Timestamp} [failedAt]
 * @property {string} [error]
 */

/**
 * @typedef {Object} AutoIncomeOperationLog
 * @property {'treasury'|'guild'|'hero'} targetType
 * @property {string} targetId
 * @property {string} targetName
 * @property {string} entryName
 * @property {number} amount
 * @property {number} balanceBefore
 * @property {number} balanceAfter
 */

/**
 * @typedef {Object} WeatherForecastDay
 * @property {string} date - Faerun date string for this forecast day.
 * @property {number} dayOffset - 0-based offset from cycle start.
 * @property {'winter'|'spring'|'summer'|'autumn'} seasonId
 * @property {string} weatherId
 * @property {string} title
 * @property {string} summary
 * @property {string} icon - MDI icon name.
 * @property {WeatherFishingEffects} effects
 */

/**
 * @typedef {Object} WeatherFishingEffects
 * @property {number} dcModifier - Applied to the current fishing attempt DC only.
 * @property {{ type: 'fixed', value: number, label: string }|{ type: 'dice', notation: string, label: string }} sumModifier
 * @property {number} fishValueMultiplier
 * @property {number} treasureChanceMultiplier
 */

/**
 * Collection: `cycle-summaries/{cycleId}`
 * @typedef {Object} CycleSummaryDoc
 * @property {string} cycleId
 * @property {string} cycleStartedAt
 * @property {string} cycleFinishedAt
 * @property {number|null} populationBefore
 * @property {number|null} populationAfter
 * @property {number|null} populationDelta
 * @property {{ fishName: string, fishValue: number, username: string, timestamp: import('firebase/firestore').Timestamp|string|null }|null} [bestFish]
 * @property {{ heroId: string, heroName: string, totalValue: number, totalItems: number, actions: number }|null} [bestCrafter]
 * @property {import('firebase/firestore').Timestamp} [migratedAt]
 * @property {string} [migrationSource]
 * @property {import('firebase/firestore').Timestamp} updatedAt
 */

// ─── MANUFACTURES ────────────────────────────────────────────────────────────

/**
 * Collection: `manufactures/{manufactureId}`
 * @typedef {Object} ManufactureDoc
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} income
 * @property {'manufacture'|'auto'} [type] - 'manufacture' (default) or 'auto' (auto income/expense)
 * @property {PayoutRow[]} [payouts] - per-cycle payouts; if absent falls back to legacy income/incomeDestination fields
 * @property {string} [incomeDestination] - legacy single destination (kept for backward compat)
 * @property {number} [income] - legacy single income amount (kept for backward compat)
 * @property {Record<string, number>} [incomeGoods] - legacy single goods map (kept for backward compat)
 */

/**
 * @typedef {Object} PayoutRow
 * @property {'coinPig'} [mechanic] - omitted/absent for fixed payouts; 'coinPig' rolls 1d4-1 per closed-cycle day and splits gold between heroes
 * @property {string} [destination] - fixed payouts: 'treasury', 'guild:{guildId}', or 'hero:{heroId}'
 * @property {number} [income] - fixed payouts: gold amount per cycle (negative = deduction)
 * @property {Record<string, number>} [incomeGoods] - goods per cycle, keyed by goodId (hero destinations only)
 * @property {string[]} [participantHeroIds] - hero IDs for Coin Pig payouts
 * @property {string} [roll] - display/config label for Coin Pig, currently '1d4-1'
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
 * @property {string} password - player login password; defaults to "password" until manually changed
 * @property {string} telegramId - Telegram user ID or username used to link fishing bot catches; empty until manually filled
 * @property {number} [goldBalance] - personal gold balance; may be negative when the hero owes funds
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
 * @property {'income'|'withdrawal'|'deduction'|'building-yield'|'building-action'|'fish-sale'|'fish-release'|'treasure-remove'|'admin-balance-adjustment'|'admin-goods-adjustment'|'goods-request-deposit'|'mage-guild-reward'|'crew-payment'} type
 * @property {string} comment
 * @property {string} [cycleId]
 * @property {string} [cycleStartedAt]
 * @property {string} [cycleFinishedAt]
 * @property {string} [manufactureId]
 * @property {string} [manufactureName]
 * @property {string} [islandId]
 * @property {string} [buildingKey]
 * @property {string} [yieldBuildingId]
 * @property {string} [actionVariantId]
 * @property {'fixed'|'coinPig'} [manufactureMechanic]
 * @property {string} [spellRequestId]
 * @property {string} [requestId]
 * @property {string} [mageGuildId]
 * @property {number} [grossAmount]
 * @property {number} [treasuryTaxAmount]
 * @property {number} [treasuryTaxRate]
 * @property {number} [guildTaxAmount]
 * @property {string} [adventureTitle]
 * @property {number} [guildTaxRate]
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

/**
 * Collection: `goods-requests/{requestId}`
 * Player-submitted requests to credit goods to a personal or guild account.
 * Target inventories are unchanged until an admin approves the request.
 * @typedef {Object} GoodsRequestDoc
 * @property {string} id
 * @property {'hero'|'guild'} targetType
 * @property {string} targetId
 * @property {string} targetName
 * @property {Record<string, number>} goods - Positive whole quantities keyed by goodId
 * @property {Record<string, {name: string, unit: string}>} goodsMeta - Good name/unit snapshots for admin review
 * @property {string} comment
 * @property {'pending'|'approved'|'rejected'} status
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {string|null} createdBy
 * @property {import('firebase/firestore').Timestamp|null} reviewedAt
 * @property {string|null} reviewedBy
 * @property {string} reviewNote
 * @property {string|null} approvedLogId
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
 * @property {string} heroId
 * @property {string} heroName
 * @property {string} itemSlug
 * @property {string} itemName
 * @property {number} amountCrafted
 * @property {number} [craftDaysSpent] - Days the player reports spending on this craft request
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
 * @property {string|null} cycleId
 * @property {string} cycleStartedAt
 * @property {string} [approvedFromRequestId]
 * @property {string} [approvedBy]
 */

/**
 * Collection: `crafting-requests/{requestId}`
 * Pending player-submitted crafting entries. These do not affect hero crafting
 * progress until an admin approves them.
 * @typedef {Object} CraftingRequestDoc
 * @property {string} id
 * @property {string} heroId
 * @property {string} heroName
 * @property {string} itemSlug
 * @property {string} itemName
 * @property {number} amountCrafted
 * @property {number} craftDaysSpent
 * @property {'pending'|'approved'|'rejected'|'cancelled'} status
 * @property {import('firebase/firestore').Timestamp} createdAt
 * @property {string} createdBy
 * @property {import('firebase/firestore').Timestamp|null} reviewedAt
 * @property {string|null} reviewedBy
 * @property {string} reviewNote
 * @property {string|null} approvedLogId
 * @property {import('firebase/firestore').Timestamp|null} [cancelledAt]
 * @property {string|null} [cancelledBy]
 */

/**
 * Collection: `cycle-crafting-logs/{heroId_logId}`
 * Dashboard-friendly mirror of hero crafting logs, keyed by cycle without requiring a collection-group index.
 * @typedef {CraftingLogDoc & { sourcePath: string, cycleFinishedAt?: string }} CycleCraftingLogDoc
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
 * @property {number} [grossReward]
 * @property {number} [heroNetReward]
 * @property {number} [treasuryTax]
 * @property {number} [treasuryTaxRate]
 * @property {number} [guildTax]
 * @property {number} [guildTaxRate]
 * @property {string} [mageGuildId]
 * @property {string} [mageGuildName]
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
 * @property {{ enabled: boolean, table: TreasureConfigEntry[] }} treasures
 * @property {FishingStateData} fishingState
 */

/**
 * @typedef {Object} TreasureConfigEntry
 * @property {string} id
 * @property {string} name
 * @property {number} chance - Probability per awarded fish, e.g. 0.001 for 1/1000
 * @property {{ min: number, max: number }} valueGold
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
 * @property {string|null} [heroId] - linked hero at catch time, if known
 * @property {string|null} [heroName] - linked hero name at catch time, if known
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
 * @property {WeatherForecastDay|null} [weather]
 * @property {WeatherFishingEffects|null} [weatherEffects]
 * @property {number} [baseEachRollDc]
 * @property {number} [effectiveEachRollDc]
 * @property {number} [weatherSumModifier]
 * @property {number} [fishValueMultiplier]
 * @property {number} [treasureChanceMultiplier]
 * @property {Pick<FishDoc, 'id'|'fishName'|'fishDescription'|'fishCodeNumber'|'fishValueSilver'|'fishAdditionalRollsRequiredForSuccessfulCatch'>[]} fishSelected
 * @property {number} fishQuantityCaught
 * @property {FishingTreasureSnapshot[]} [treasuresFound]
 * @property {Array<{ fishId: string, before: number, requested: number, awarded: number, after: number }>} fishAvailabilityChanges
 * @property {unknown[]} extraCheckResults
 * @property {import('firebase/firestore').Timestamp|string} timestamp
 * @property {string} [cycleId]
 */

/**
 * Collection: `caught-fish/{caughtFishId}`
 * @typedef {Object} CaughtFishDoc
 * @property {string} fishId
 * @property {string} fishName
 * @property {string} fishDescription
 * @property {number|{min:number,max:number}} fishCodeNumber
 * @property {number|{low:number,high:number}} fishValueSilver
 * @property {number|null} effectiveRollUsed
 * @property {number} [baseValueSilver] - Fish value before weather multiplier.
 * @property {number} [fishValueMultiplier] - Weather multiplier applied at catch time.
 * @property {number} valueSilver
 * @property {number} valueGold
 * @property {string|null} telegramUserId
 * @property {string} telegramUsername
 * @property {string} telegramUsernameKey - normalized lowercase username without @ for lookups
 * @property {string|null} heroId
 * @property {string|null} heroName
 * @property {string} sourceFishingLogId
 * @property {string|null} cycleId
 * @property {'available'|'sold'|'released'} status
 * @property {import('firebase/firestore').Timestamp|string} createdAt
 * @property {import('firebase/firestore').Timestamp|string|null} disposedAt
 * @property {string} [disposedByHeroId]
 * @property {string} [disposedByHeroName]
 */

/**
 * Embedded snapshot in `fishing-logs/{logId}.treasuresFound`.
 * @typedef {Object} FishingTreasureSnapshot
 * @property {string} id - caught-treasures document ID
 * @property {string} treasureId
 * @property {string} treasureName
 * @property {number} valueGold
 * @property {{ min: number, max: number }} valueRangeGold
 * @property {number} chance
 * @property {number} [chanceMultiplier] - Weather multiplier applied to treasure chance.
 * @property {string} fishId
 * @property {string} fishName
 * @property {string|null} heroId
 * @property {string|null} heroName
 */

/**
 * Collection: `caught-treasures/{treasureDocId}`
 * @typedef {Object} CaughtTreasureDoc
 * @property {string} treasureId
 * @property {string} treasureName
 * @property {number} valueGold
 * @property {{ min: number, max: number }} valueRangeGold
 * @property {number} chance
 * @property {number} [chanceMultiplier] - Weather multiplier applied to treasure chance.
 * @property {number} roll
 * @property {string|null} telegramUserId
 * @property {string} telegramUsername
 * @property {string} telegramUsernameKey
 * @property {string|null} heroId
 * @property {string|null} heroName
 * @property {string} sourceFishingLogId
 * @property {string} sourceCaughtFishId
 * @property {string} fishId
 * @property {string} fishName
 * @property {string|null} cycleId
 * @property {'available'|'removed'} status
 * @property {import('firebase/firestore').Timestamp|string} createdAt
 * @property {import('firebase/firestore').Timestamp|string|null} removedAt
 * @property {string} [removedByHeroId]
 * @property {string} [removedByHeroName]
 * @property {boolean} [removedByAdmin]
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
