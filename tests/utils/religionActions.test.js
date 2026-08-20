import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateDefenseShieldBonus,
  calculateSpreadReligionOutcome,
} from '../../src/utils/religionActions.js'

test('calculateDefenseShieldBonus gives +1 at DC and +1 more for each 4 above DC', () => {
  assert.equal(calculateDefenseShieldBonus(9, 10), 0)
  assert.equal(calculateDefenseShieldBonus(10, 10), 1)
  assert.equal(calculateDefenseShieldBonus(13, 10), 1)
  assert.equal(calculateDefenseShieldBonus(14, 10), 2)
  assert.equal(calculateDefenseShieldBonus(18, 10), 3)
})

test('calculateSpreadReligionOutcome succeeds and breaks shield when result beats shielded DC', () => {
  assert.deepEqual(calculateSpreadReligionOutcome({ result: 25, baseDC: 10, shieldBonus: 3 }), {
    dc: 13,
    convertedFollowers: 17,
    shieldDamage: 0,
    shieldRemaining: 3,
    shieldBroken: true,
  })
})

test('calculateSpreadReligionOutcome damages shield when result beats base DC only', () => {
  assert.deepEqual(calculateSpreadReligionOutcome({ result: 10, baseDC: 10, shieldBonus: 3 }), {
    dc: 13,
    convertedFollowers: 0,
    shieldDamage: 1,
    shieldRemaining: 2,
    shieldBroken: false,
  })
})

test('calculateSpreadReligionOutcome can destroy shield by damage without stealing followers', () => {
  assert.deepEqual(calculateSpreadReligionOutcome({ result: 12, baseDC: 10, shieldBonus: 3 }), {
    dc: 13,
    convertedFollowers: 0,
    shieldDamage: 3,
    shieldRemaining: 0,
    shieldBroken: true,
  })
})

test('calculateSpreadReligionOutcome at shielded DC steals followers and breaks shield', () => {
  assert.deepEqual(calculateSpreadReligionOutcome({ result: 13, baseDC: 10, shieldBonus: 3 }), {
    dc: 13,
    convertedFollowers: 5,
    shieldDamage: 0,
    shieldRemaining: 3,
    shieldBroken: true,
  })
})

test('calculateSpreadReligionOutcome does nothing below base DC', () => {
  assert.deepEqual(calculateSpreadReligionOutcome({ result: 9, baseDC: 10, shieldBonus: 3 }), {
    dc: 13,
    convertedFollowers: 0,
    shieldDamage: 0,
    shieldRemaining: 3,
    shieldBroken: false,
  })
})
