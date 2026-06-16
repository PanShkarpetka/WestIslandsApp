import test from 'node:test'
import assert from 'node:assert/strict'
import { getTreasuryTransactionTypeMeta } from '../../src/utils/treasuryTransactions.js'

test('treasury transaction type meta renders fish tax as positive tax income', () => {
  assert.deepEqual(getTreasuryTransactionTypeMeta({ type: 'fish-tax', amount: 1.48 }), {
    label: 'Податок',
    icon: 'mdi-cash-plus',
    className: 'tx-deposit',
  })
  assert.deepEqual(getTreasuryTransactionTypeMeta({ type: 'mage-guild-tax', amount: 10 }), {
    label: 'Податок',
    icon: 'mdi-cash-plus',
    className: 'tx-deposit',
  })
})

test('treasury transaction type meta keeps deposits and withdrawals explicit', () => {
  assert.deepEqual(getTreasuryTransactionTypeMeta({ type: 'deposit', amount: 10 }), {
    label: 'Внесок',
    icon: 'mdi-arrow-up-bold',
    className: 'tx-deposit',
  })
  assert.deepEqual(getTreasuryTransactionTypeMeta({ type: 'withdraw', amount: -3 }), {
    label: 'Зняття',
    icon: 'mdi-arrow-down-bold',
    className: 'tx-withdraw',
  })
})

test('treasury transaction type meta falls back to amount direction for unknown types', () => {
  assert.equal(getTreasuryTransactionTypeMeta({ type: 'bonus', amount: 2 }).label, 'Надходження')
  assert.equal(getTreasuryTransactionTypeMeta({ type: 'fee', amount: -2 }).label, 'Списання')
})
