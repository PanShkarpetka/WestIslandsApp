export function formatAmount(value, decimals = 2) {
  const number = Number(value)
  if (!Number.isFinite(number)) return (0).toFixed(decimals)
  return number.toFixed(decimals)
}
