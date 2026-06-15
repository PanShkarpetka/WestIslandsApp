export function getLogTreasures(log) {
  return Array.isArray(log?.treasuresFound) ? log.treasuresFound.filter(Boolean) : []
}

export function aggregateTreasureRankings(logs, { getParticipantKey, getDisplayName } = {}) {
  const byParticipant = new Map()

  for (const log of logs || []) {
    const treasures = getLogTreasures(log)
    if (!treasures.length) continue

    const key = getParticipantKey?.(log) || String(log.heroId || log.telegramUserId || log.telegramUsername || 'unknown')
    const row = byParticipant.get(key) || {
      key,
      username: getDisplayName?.(log) || log.heroName || log.telegramUsername || String(log.telegramUserId || 'unknown'),
      treasureCount: 0,
      totalValueGold: 0,
      bestTreasure: null,
      bestTreasureValueGold: 0,
    }

    row.username = getDisplayName?.(log) || row.username
    for (const treasure of treasures) {
      const valueGold = Number(treasure.valueGold || 0)
      row.treasureCount += 1
      row.totalValueGold += valueGold
      if (!row.bestTreasure || valueGold > row.bestTreasureValueGold) {
        row.bestTreasure = treasure.treasureName || treasure.name || treasure.treasureId || 'Treasure'
        row.bestTreasureValueGold = valueGold
      }
    }

    byParticipant.set(key, row)
  }

  return [...byParticipant.values()]
    .map((row) => ({
      ...row,
      totalValueGold: Math.round(row.totalValueGold * 100) / 100,
      bestTreasureValueGold: Math.round(row.bestTreasureValueGold * 100) / 100,
    }))
    .sort((a, b) =>
      b.totalValueGold - a.totalValueGold
      || b.treasureCount - a.treasureCount
      || String(a.username).localeCompare(String(b.username), 'uk-UA'),
    )
}
