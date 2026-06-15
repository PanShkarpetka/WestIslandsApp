import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateTreasureRankings, getLogTreasures } from '../../src/utils/fishingTreasures.js'

test('getLogTreasures treats missing treasure snapshots as empty', () => {
  assert.deepEqual(getLogTreasures({}), [])
  assert.deepEqual(getLogTreasures({ treasuresFound: [{ treasureName: 'Pearl' }] }), [{ treasureName: 'Pearl' }])
})

test('aggregateTreasureRankings aggregates and sorts treasure totals', () => {
  const logs = [
    {
      heroId: 'h1',
      heroName: 'Aela',
      treasuresFound: [
        { treasureName: 'Pearl', valueGold: 10 },
        { treasureName: 'Diamond', valueGold: 100 },
      ],
    },
    {
      heroId: 'h2',
      heroName: 'Borin',
      treasuresFound: [
        { treasureName: 'Small Ruby', valueGold: 80 },
      ],
    },
    {
      heroId: 'h1',
      heroName: 'Aela',
      treasuresFound: [
        { treasureName: 'Silver Ring', valueGold: 5 },
      ],
    },
  ]

  const result = aggregateTreasureRankings(logs, {
    getParticipantKey: (log) => `hero:${log.heroId}`,
    getDisplayName: (log) => log.heroName,
  })

  assert.equal(result.length, 2)
  assert.equal(result[0].username, 'Aela')
  assert.equal(result[0].treasureCount, 3)
  assert.equal(result[0].totalValueGold, 115)
  assert.equal(result[0].bestTreasure, 'Diamond')
  assert.equal(result[0].bestTreasureValueGold, 100)
  assert.equal(result[1].username, 'Borin')
})
