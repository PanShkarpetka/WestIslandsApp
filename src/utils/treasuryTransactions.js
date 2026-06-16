export function getTreasuryTransactionTypeMeta(transaction = {}) {
  const type = transaction.type
  const amount = Number(transaction.amount || 0)

  if (type === 'deposit') {
    return { label: 'Внесок', icon: 'mdi-arrow-up-bold', className: 'tx-deposit' }
  }

  if (type === 'withdraw') {
    return { label: 'Зняття', icon: 'mdi-arrow-down-bold', className: 'tx-withdraw' }
  }

  if (type === 'fish-tax' || type === 'mage-guild-tax') {
    return { label: 'Податок', icon: 'mdi-cash-plus', className: 'tx-deposit' }
  }

  return amount >= 0
    ? { label: 'Надходження', icon: 'mdi-arrow-up-bold', className: 'tx-deposit' }
    : { label: 'Списання', icon: 'mdi-arrow-down-bold', className: 'tx-withdraw' }
}
