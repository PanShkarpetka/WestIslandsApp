import test from 'node:test'
import assert from 'node:assert/strict'
import { getOwnedBuildings } from '../../src/utils/ownedBuildings.js'

const definitions = [
  { id: 'herbal', name: 'Трав’яний сад', incomeType: 'owner-action', actionCostGold: 20, maxUsesPerCycle: 1 },
  { id: 'vineyard', name: 'Виноградник', incomeType: 'scheduled' },
]

test('getOwnedBuildings returns only active buildings owned by the selected guild', () => {
  const result = getOwnedBuildings({
    yield_herbal: { built: true, yieldBuildingId: 'herbal', ownerType: 'guild', ownerId: 'mages' },
    yield_vineyard: { built: true, yieldBuildingId: 'vineyard', ownerType: 'hero', ownerId: 'hero-1' },
    yield_removed: { built: false, yieldBuildingId: 'herbal', ownerType: 'guild', ownerId: 'mages' },
  }, definitions, 'guild', 'mages')

  assert.deepEqual(result.map((building) => building.id), ['herbal'])
  assert.equal(result[0].actionCostGold, 20)
})

test('getOwnedBuildings supports legacy hero and guild owner fields', () => {
  const buildings = {
    yield_hero: { built: true, yieldBuildingId: 'vineyard', ownerHeroId: 'hero-1' },
    yield_guild: { built: true, yieldBuildingId: 'herbal', ownerGuildId: 'mages' },
  }

  assert.deepEqual(getOwnedBuildings(buildings, definitions, 'hero', 'hero-1').map((building) => building.id), ['vineyard'])
  assert.deepEqual(getOwnedBuildings(buildings, definitions, 'guild', 'mages').map((building) => building.id), ['herbal'])
})

test('getOwnedBuildings returns an empty list without a valid owner', () => {
  assert.deepEqual(getOwnedBuildings({}, definitions, 'hero', ''), [])
  assert.deepEqual(getOwnedBuildings({}, definitions, 'island', 'island_rock'), [])
})
