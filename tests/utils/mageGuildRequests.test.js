import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applySpellPriceDelta,
  buildSpellRequestDrafts,
  getSpellCompensation,
  getSpellMaterialComponentPrice,
  getSpellPrice,
  normalizeSpellLevel,
  pickWeightedKey,
} from '../../src/utils/mageGuildRequests.js'

test('normalizeSpellLevel preserves string keys such as ritual levels', () => {
  assert.equal(normalizeSpellLevel(' 4R '), '4R')
})

test('normalizeSpellLevel maps cantrip aliases to level 0', () => {
  assert.equal(normalizeSpellLevel('cantrip'), '0')
  assert.equal(normalizeSpellLevel(' 0 lvl '), '0')
})

test('pickWeightedKey uses weighted distribution boundaries', () => {
  const weights = { A: 0.25, B: 0.75 }
  assert.equal(pickWeightedKey(weights, () => 0.1), 'A')
  assert.equal(pickWeightedKey(weights, () => 0.9), 'B')
})

test('applySpellPriceDelta increases and decreases within configured bounds', () => {
  const config = { delta: 0.1, min: 10, max: 30, default: 20 }
  assert.equal(applySpellPriceDelta(20, config, 'increase'), 22)
  assert.equal(applySpellPriceDelta(20, config, 'decrease'), 18)
  assert.equal(applySpellPriceDelta(40, config, 'increase'), 30)
  assert.equal(applySpellPriceDelta(5, config, 'decrease'), 10)
})

test('getSpellPrice prefers currentPrice over legacy price fields', () => {
  assert.equal(getSpellPrice({ currentPrice: 42, price: 10 }, 0), 42)
  assert.equal(getSpellPrice({ raw: { currentPrice: 55, price: 12 } }, 0), 55)
})

test('getSpellMaterialComponentPrice reads material component price fields', () => {
  assert.equal(getSpellMaterialComponentPrice({ materialComponentPrice: 25 }, 0), 25)
  assert.equal(getSpellMaterialComponentPrice({ raw: { componentCost: 40 } }, 0), 40)
})

test('getSpellCompensation adds material component price to base compensation', () => {
  assert.equal(getSpellCompensation({ currentPrice: 42, materialComponentPrice: 25 }, 0), 67)
})


test('buildSpellRequestDrafts matches cantrip spells to level 0 request config', () => {
  const result = buildSpellRequestDrafts({
    population: 100,
    spellTypes: {
      0: {
        chance: 1,
        A: { chance: 1, downtimeMin: 1, downtimeMax: 1, price: 6 },
        price: { default: 6 },
      },
    },
    spells: [
      { id: 'light', name: 'Light', level: 'cantrip', tier: 'A', currentPrice: 9 },
    ],
    rng: () => 0,
  })

  assert.equal(result.requests.length, 1)
  assert.equal(result.requests[0].spellLevel, '0')
  assert.equal(result.requests[0].spellName, 'Light')
})

test('buildSpellRequestDrafts includes material component price in compensation', () => {
  const result = buildSpellRequestDrafts({
    population: 100,
    spellTypes: {
      1: {
        chance: 1,
        A: { chance: 1, downtimeMin: 1, downtimeMax: 1, price: 10 },
        price: { default: 10 },
      },
    },
    spells: [
      { id: 'identify', name: 'Identify', level: 1, tier: 'A', currentPrice: 10, materialComponentPrice: 100 },
    ],
    rng: () => 0,
  })

  assert.equal(result.requests.length, 1)
  assert.equal(result.requests[0].compensation, 110)
})

test('buildSpellRequestDrafts rerolls invalid combinations until minimum is reached', () => {
  const rngValues = [0, 0.99, 0, 0, 0, 0]
  const rng = () => rngValues.shift() ?? 0
  const result = buildSpellRequestDrafts({
    population: 100,
    spellTypes: {
      cantrip: {
        chance: 1,
        A: { chance: 0.5, downtimeMin: 1, downtimeMax: 1, price: 6 },
        B: { chance: 0.5, downtimeMin: 2, downtimeMax: 2, price: 8 },
        price: { default: 6 },
      },
    },
    spells: [
      { id: 'light', name: 'Light', level: 'cantrip', tier: 'A', currentPrice: 9 },
    ],
    rng,
  })

  assert.equal(result.requestsMin, 1)
  assert.equal(result.requestsCount, 1)
  assert.equal(result.requests.length, 1)
  assert.equal(result.requests[0].spellName, 'Light')
  assert.equal(result.requests[0].compensation, 9)
  assert.equal(result.requests[0].downtimeDays, 1)
})
