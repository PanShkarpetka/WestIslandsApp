# religionActions

Canonical formula helpers for religion actions. Use this utility when calculating admin previews and when resolving Firestore transactions so displayed results and saved results stay in sync.

## Exports
- `calculateDefenseShieldBonus(result, dc)` — returns `0` below DC. At DC it returns `1`; every full 4 points above DC adds another `+1`.
- `calculateSpreadReligionOutcome({ result, baseDC, shieldBonus })` — returns `dc`, `convertedFollowers`, `shieldDamage`, `shieldRemaining`, and `shieldBroken`.

## Spread religion rules
- `baseDC = svBase + svTemp + DM Mod`
- `dc = baseDC + shieldBonus`
- If `result >= dc`, the attack succeeds, followers are converted, and the shield is removed.
- If `result >= baseDC && result < dc`, no followers are converted and shield damage is `result - baseDC + 1`.
- If `result < baseDC`, no followers are converted and the shield is unchanged.
- Converted followers on success are `5 + max(0, result - dc)`.

## Tests
Update `tests/utils/religionActions.test.js` whenever these mechanics change.
