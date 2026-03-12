function fishCodeLabel(fish) {
  const code = fish?.fishCodeNumber;
  if (typeof code === 'number') {
    return String(code);
  }

  if (code && Number.isFinite(Number(code.min)) && Number.isFinite(Number(code.max))) {
    if (Number(code.min) === Number(code.max)) {
      return String(code.min);
    }

    return `${code.min}-${code.max}`;
  }

  return 'n/a';
}

export function formatFishingResult(result, resolvedCatches, options = {}) {
  const lines = [];
  lines.push('🎣 Fishing result:');
  lines.push(`Modifiers: ${result.normalizedInput.modifiers.join(', ')}`);
  lines.push(`Raw d20 rolls: ${result.rawRolls.join(', ')}`);
  lines.push(`After modifiers: ${result.modifiedRolls.join(', ')}`);
  lines.push(`After guidance: ${result.finalRolls.join(', ')}`);

  if (result.guidance.guidanceRolls.length > 0) {
    lines.push(`Guidance rolls (+to each d20): ${result.guidance.guidanceRolls.join(', ')} (total +${result.guidance.totalGuidanceBonus})`);
  } else {
    lines.push('Guidance: not used');
  }

  lines.push(`Bait: ${result.normalizedInput.baitType}`);
  lines.push(`Ship used: ${result.normalizedInput.useShip ? 'yes' : 'no'}`);

  if (result.baitBonusRoll) {
    lines.push(`Bait bonus: +${result.baitBonusRoll}`);
  }

  if (result.shipBonusRoll) {
    lines.push(`Ship bonus: +${result.shipBonusRoll}`);
  }

  if (result.computedSum !== result.finalSum) {
    lines.push(`Sum before bait-range cap: ${result.computedSum}`);
    lines.push(`Sum used for fish lookup (after cap): ${result.finalSum}`);
  } else {
    lines.push(`Sum used for fish lookup: ${result.finalSum}`);
  }

  lines.push(`Per-roll DC ${result.eachRollDc}: ${result.passedEachRollDc ? 'PASS' : 'FAIL'}`);
  if (!result.passedEachRollDc) {
    lines.push(`Failed roll positions: ${result.failedRollIndexes.map((idx) => idx + 1).join(', ')}`);
  }

  if (result.rolledFish && result.effectiveRollUsed !== result.finalSum) {
    lines.push(`Rolled fish unavailable (${result.rolledFish.fishName}), fallback roll used: ${result.effectiveRollUsed}`);
  }

  if (resolvedCatches.length === 0) {
    lines.push('Catch: no fish this time.');
  } else {
    const fish = resolvedCatches[0];
    lines.push(`Catch: ${fish.fishName} (#${fishCodeLabel(fish)})`);
    lines.push(`Description: ${fish.fishDescription}`);
  }

  if (options.pendingAdditionalRoll) {
    const firstRequirement = options.pendingAdditionalRoll.requirements[0];
    lines.push(`Additional roll required: ${firstRequirement.name}`);
    lines.push('Type yes/no to confirm if you passed this roll.');
  }

  if (options.additionalRollPassed === true) {
    lines.push('Additional roll: PASS');
  }

  return lines.join('\n');
}

export function helpMessage() {
  return [
    'Use /fish to start fishing.',
    'Flow: 3 modifiers -> guidance yes/no -> bait type (+ optional ship).',
    'Inline format: /fish <mod1> <mod2> <mod3> <yes/no> <basic|simple|advanced> [ship]',
    'Use /cancel to cancel current fishing input.'
  ].join('\n');
}
