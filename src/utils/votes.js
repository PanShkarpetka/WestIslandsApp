/**
 * Пропорційний розподіл total між weights із фіксованою точністю.
 * Гарантує суму === total та не більше `decimals` знаків після коми.
 *
 * @param {number} total - загальна кількість (напр., 10 голосів)
 * @param {number[]} weights - ваги (напр., популяції або "people" по пропозиціях)
 * @param {number} decimals - к-сть знаків після коми (за замовч. 1 → крок 0.1)
 * @returns {number[]} масив значень з фікс. точністю, сума дорівнює total
 */
export function apportionFixed(total, weights, decimals = 1) {
    const step = 10 ** decimals; // 0.1 → 10; 0.01 → 100
    const nums = weights.map(w => Number(w) || 0);
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum <= 0 || total <= 0) return Array(nums.length).fill(0);

    const quotas = nums.map(w => (w * total) / sum);
    const quotasUnits = quotas.map(q => Math.floor(q * step));
    let allocatedUnits = quotasUnits.reduce((a, b) => a + b, 0);

    const targetUnits = Math.round(total * step);
    let remainingUnits = Math.max(0, targetUnits - allocatedUnits);

    const remainders = quotas
        .map((q, i) => ({ i, r: (q * step) - quotasUnits[i] }))
        .sort((a, b) => b.r - a.r);

    const outUnits = [...quotasUnits];
    for (let k = 0; k < remainders.length && remainingUnits > 0; k++) {
        outUnits[remainders[k].i] += 1;
        remainingUnits--;
    }

    return outUnits.map(u => u / step);
}
