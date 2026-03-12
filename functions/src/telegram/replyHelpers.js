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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatList(values, { withParens = false, withSign = false } = {}) {
  return values
    .map((value) => {
      const normalized = Number(value);
      const display = Number.isNaN(normalized) ? String(value) : String(normalized);
      const signed = withSign && normalized > 0 ? `+${display}` : display;
      return withParens ? `(${signed})` : signed;
    })
    .join(', ');
}

export function formatFishingResult(result, resolvedCatches, options = {}) {
  const lines = [];
  lines.push('🎣 <b>Результат риболовлі</b>\n');
  lines.push(`🧮 Модифікатори: ${formatList(result.normalizedInput.modifiers)}`);
  lines.push(`🎲 Сирі кидки d20: ${formatList(result.rawRolls, { withParens: true})}`);
  lines.push(`📌 Після модифікаторів: <b>${formatList(result.modifiedRolls)}</b>`);

  if (result.guidance.guidanceRolls.length > 0) {
    lines.push(`✨ Кидки guidance: ${formatList(result.guidance.guidanceRolls, { withParens: true, withSign: true })}`);
  } else {
    lines.push('✨ Guidance: не використано');
  }

  lines.push(`✨ Після guidance: <b>${formatList(result.finalRolls)}</b>`);
  lines.push(`🪱 Наживка: <b>${escapeHtml(result.normalizedInput.baitType)}</b>`);

  if (result.baitBonusRoll) {
    lines.push(`🪱 Бонус наживки: (${formatList(result.baitBonusRoll, { withParens: true, withSign: true })})`);
  }

  lines.push(`🚢 Корабель використано: <b>${result.normalizedInput.useShip ? 'так' : 'ні'}</b>`);

  if (result.shipBonusRoll) {
    lines.push(`🚢 Бонус корабля: (${formatList(result.shipBonusRoll, { withParens: true, withSign: true })})`);
  }

  if (result.computedSum !== result.finalSum) {
    lines.push(`📊 Сума до обмеження діапазоном наживки: ${result.computedSum}`);
    lines.push(`📊 Сума для пошуку риби (після обмеження): <b><u>${result.finalSum}</u></b>`);
  } else {
    lines.push(`📊 Сума для пошуку риби: <b><u>${result.finalSum}</u></b>`);
  }

  lines.push(`🎯 Перевірка DC ${result.eachRollDc} для кожного кидка: <b>${result.passedEachRollDc ? 'УСПІХ ✅' : 'ПРОВАЛ ❌'}</b>`);
  if (!result.passedEachRollDc) {
    lines.push(`⚠️ Номери невдалих кидків: ${result.failedRollIndexes.map((idx) => idx + 1).join(', ')}`);
  }

  if (result.rolledFish && result.effectiveRollUsed !== result.finalSum) {
    lines.push(`⚠️ Випала недоступна риба (${escapeHtml(result.rolledFish.fishName)}. Хтось її уже піймав, але натомість піймалася ось ця: ${result.effectiveRollUsed}`);
  }

  if (resolvedCatches.length === 0) {
    lines.push('🐟 Улов: цього разу без риби.');
  } else {
    const fish = resolvedCatches[0];
    lines.push(`🐟 Улов: <b>${escapeHtml(fish.fishName)}</b> (#${fishCodeLabel(fish)})`);
    lines.push('Опис:');
    lines.push(`<blockquote>${escapeHtml(fish.fishDescription)}</blockquote>`);
  }

  if (options.pendingAdditionalRoll) {
    const firstRequirement = options.pendingAdditionalRoll.requirements[0];
    lines.push(`🎲 Потрібен додатковий кидок: <b>${escapeHtml(firstRequirement.name)}</b>`);
    lines.push('Напишіть yes/no, щоб підтвердити, чи пройшли цей кидок.');
  }

  if (options.additionalRollPassed === true) {
    lines.push('🎉 Додатковий кидок: <b>УСПІХ ✅</b>');
  }

  return lines.join('\n');
}

export function helpMessage() {
  return [
    'Use /fish to start fishing.',
    'Flow: 3 modifiers -> guidance yes/no -> bait type (+ optional ship).',
    'Inline format: /fish &lt;mod1&gt; &lt;mod2&gt; &lt;mod3&gt; &lt;yes/no&gt; &lt;basic|simple|advanced&gt; [ship]',
    'Use /cancel to cancel current fishing input.'
  ].join('\n');
}
