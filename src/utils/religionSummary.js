/**
 * Aggregates religion-action documents for a cycle into structured data
 * suitable for building the Telegram summary message.
 *
 * @param {object[]} actions - plain data objects (from docSnap.data())
 * @param {Map<string,string>} heroNameById
 * @param {Map<string,string>} religionNameById
 */
export function aggregateReligionActions(actions, heroNameById, religionNameById) {
  const faithByHero = new Map()
  const followersByReligion = new Map()
  const shieldDefenses = []
  const shieldsBrokenNames = []

  for (const data of actions) {
    const actionTypeId = data.actionType?.id

    if (actionTypeId === 'generate') {
      const heroId = data.heroId
      const gained = Number(data.faithGained ?? 0)
      if (gained <= 0 || !heroId) continue
      const heroName = heroNameById.get(heroId) || heroId
      if (!faithByHero.has(heroId)) faithByHero.set(heroId, { faith: 0, celestial: 0, name: heroName })
      const entry = faithByHero.get(heroId)
      if (data.farmTarget === 'celestial') entry.celestial += gained
      else entry.faith += gained
    }

    if (actionTypeId === 'influence') {
      const religionId = data.religion?.id
      const targetReligionId = data.targetReligion?.id
      const converted = Number(data.convertedFollowers ?? 0)
      if (converted > 0 && religionId) {
        const name = religionNameById.get(religionId) || religionId
        const attackerName = religionNameById.get(targetReligionId) || targetReligionId || '?'
        if (!followersByReligion.has(religionId)) {
          followersByReligion.set(religionId, { gained: 0, name, attackerName })
        }
        followersByReligion.get(religionId).gained += converted
      }
      if (data.shieldBroken && targetReligionId) {
        const targetName = religionNameById.get(targetReligionId) || targetReligionId
        if (!shieldsBrokenNames.includes(targetName)) shieldsBrokenNames.push(targetName)
      }
    }

    if (actionTypeId === 'shield') {
      const bonus = Number(data.bonus ?? 0)
      const religionId = data.religion?.id
      if (bonus > 0 && religionId) {
        const name = religionNameById.get(religionId) || religionId
        shieldDefenses.push({ name, bonus })
      }
    }
  }

  return { faithByHero, followersByReligion, shieldDefenses, shieldsBrokenNames }
}

/**
 * Builds the Telegram-ready summary string from aggregated cycle data.
 *
 * @param {{
 *   faithByHero: Map,
 *   followersByReligion: Map,
 *   shieldDefenses: {name: string, bonus: number}[],
 *   shieldsBrokenNames: string[],
 *   newCycleDate: string,
 * }} params
 * @returns {string}
 */
export function buildReligionSummaryText({ faithByHero, followersByReligion, shieldDefenses, shieldsBrokenNames, newCycleDate }) {
  const lines = []

  const faithEntries = [...faithByHero.values()].filter((e) => e.faith > 0)
  const celestialOnlyEntries = [...faithByHero.values()].filter((e) => e.faith === 0 && e.celestial > 0)

  for (const entry of faithEntries) {
    const parts = [`+${entry.faith} 🙏`]
    if (entry.celestial > 0) parts.push(`+${entry.celestial} віри в небожителя`)
    lines.push(`${entry.name} ${parts.join(' та ')}`)
  }

  if (faithEntries.length > 0 && celestialOnlyEntries.length > 0) lines.push('')

  for (const entry of celestialOnlyEntries) {
    lines.push(`${entry.name} +${entry.celestial} віри в небожителя`)
  }

  if ((faithEntries.length > 0 || celestialOnlyEntries.length > 0) && followersByReligion.size > 0) lines.push('')

  for (const entry of followersByReligion.values()) {
    lines.push(`Конфесія ${entry.name} +${entry.gained} послідовників1⃣ (від ${entry.attackerName})`)
  }

  if (shieldDefenses.length > 0) {
    if (lines.length > 0) lines.push('')
    for (const defense of shieldDefenses) {
      lines.push(`Захист віри конфесія ${defense.name} +${defense.bonus} до стійкості 🧘`)
    }
  }

  if (shieldsBrokenNames.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push(`Захисти спали у: ${shieldsBrokenNames.join(' та ')}.`)
  }

  if (lines.length > 0) lines.push('')
  lines.push(`Розпочався новий цикл ${newCycleDate} — триває`)

  return lines.join('\n')
}
