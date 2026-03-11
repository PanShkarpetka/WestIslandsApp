export function formatFishingResult(result, resolvedCatches) {
  const lines = [];
  lines.push('🎣 Fishing result');
  lines.push(`Modifiers: ${result.normalizedInput.modifiers.join(', ')}`);
  lines.push(`Raw rolls: ${result.rawRolls.join(', ')}`);
  lines.push(`Final rolls: ${result.finalRolls.join(', ')}`);

  if (result.guidance.guidanceRoll) {
    lines.push(`Guidance: +${result.guidance.guidanceRoll} (${result.guidance.appliedTo})`);
  } else {
    lines.push('Guidance: not used');
  }

  lines.push(`Bait: ${result.normalizedInput.baitType}`);
  if (result.baitBonusRoll) {
    lines.push(`Bait bonus: +${result.baitBonusRoll}`);
  }

  lines.push(`Final sum: ${result.finalSum}`);
  const mainCheck = result.dcChecks[0];
  lines.push(`Main DC ${mainCheck.dc}: ${mainCheck.passed ? 'PASS' : 'FAIL'}`);

  if (resolvedCatches.length === 0) {
    lines.push('Catch: no fish this time.');
  } else {
    lines.push(`Catch count: ${resolvedCatches.length}`);
    resolvedCatches.forEach((fish, idx) => {
      lines.push(`${idx + 1}. ${fish.fishName} (#${fish.fishCodeNumber}) - ${fish.fishDescription}`);
    });
  }

  if (result.additionalCheckResults.length > 0) {
    lines.push('Extra checks:');
    result.additionalCheckResults.forEach((check) => {
      const dcPart = check.dc ? ` vs DC ${check.dc}` : '';
      lines.push(`- ${check.fishName}: [${check.rolls.join(', ')}]${dcPart} => ${check.passed ? 'PASS' : 'FAIL'}`);
    });
  }

  return lines.join('\n');
}

export function helpMessage() {
  return [
    'Use /fish to start fishing.',
    'Flow: 3 modifiers -> guidance yes/no -> bait type.',
    'Use /cancel to cancel current fishing input.'
  ].join('\n');
}
