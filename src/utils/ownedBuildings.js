export function getOwnedBuildings(buildings, definitions, ownerType, ownerId) {
  if (!ownerId || !['hero', 'guild'].includes(ownerType)) return []

  const definitionMap = definitions instanceof Map
    ? definitions
    : new Map((definitions || []).map((item) => [item.id, item]))

  return Object.entries(buildings || {})
    .filter(([, entry]) => {
      if (!entry || entry.built === false) return false
      const resolvedType = entry.ownerType
        || (entry.ownerGuildId ? 'guild' : entry.ownerHeroId ? 'hero' : null)
      const resolvedId = entry.ownerId
        || (resolvedType === 'guild' ? entry.ownerGuildId : entry.ownerHeroId)
      return resolvedType === ownerType && resolvedId === ownerId
    })
    .map(([key, entry]) => {
      const definition = definitionMap.get(entry.yieldBuildingId) || {}
      return {
        key,
        id: entry.yieldBuildingId || key,
        name: definition.name || entry.name || entry.yieldBuildingId || key,
        description: definition.description || '',
        incomeType: definition.incomeType || 'scheduled',
        actionCostGold: Number(definition.actionCostGold || 0),
        maxUsesPerCycle: Number(definition.maxUsesPerCycle || 0),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'uk-UA'))
}
