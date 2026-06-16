import test from 'node:test'
import assert from 'node:assert/strict'
import { buildUsedDaysByHero } from '../../src/services/usedDaysService.js'

test('buildUsedDaysByHero sums crafting mage guild and religion days per active cycle data', () => {
  const result = buildUsedDaysByHero({
    heroIds: ['hero-1', 'hero-2'],
    craftingLogs: [
      { heroId: 'hero-1', craftDaysSpent: 3 },
      { heroId: 'hero-1', craftDaysSpent: 2 },
      { heroId: 'hero-2', craftDaysSpent: 1 },
    ],
    spellRequestDocuments: [
      {
        requests: [
          { fulfilled: true, fulfilledByHeroId: 'hero-1', downtimeDays: 4 },
          { fulfilled: false, fulfilledByHeroId: 'hero-1', downtimeDays: 99 },
          { fulfilled: true, fulfilledByHeroId: 'hero-2', downtimeDays: 6 },
        ],
      },
    ],
    religionActions: [
      { heroId: 'hero-1', actionType: { id: 'shield' } },
      { hero: { path: 'heroes/hero-1' }, actionType: { id: 'generate' } },
      { heroId: 'hero-1', actionType: { id: 'changeReligion' } },
      { clergy: { path: 'clergy/clergy-2' }, actionType: { id: 'influence' } },
      { heroId: 'hero-1', actionType: { id: 'cycleStart' } },
      { actionType: { id: 'shield' } },
    ],
    clergyHeroById: new Map([['clergy-2', 'hero-2']]),
  })

  assert.deepEqual(result.get('hero-1'), {
    heroId: 'hero-1',
    craftingDays: 5,
    mageGuildDays: 4,
    religionDays: 21,
    religionActions: 3,
    totalDays: 30,
  })
  assert.deepEqual(result.get('hero-2'), {
    heroId: 'hero-2',
    craftingDays: 1,
    mageGuildDays: 6,
    religionDays: 7,
    religionActions: 1,
    totalDays: 14,
  })
})
