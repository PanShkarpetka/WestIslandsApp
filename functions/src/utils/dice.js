export function rollDie(sides, rng = Math.random) {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error('Dice sides must be an integer >= 2');
  }

  return Math.floor(rng() * sides) + 1;
}

export function rollDice({ count, sides, rng = Math.random }) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('Dice count must be an integer >= 1');
  }

  const results = [];
  for (let i = 0; i < count; i += 1) {
    results.push(rollDie(sides, rng));
  }

  return results;
}
