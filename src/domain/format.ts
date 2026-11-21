/** 90 → «1,5 год», 30 → «30 хв», 0 → «0 год» */
export function formatHours(minutes: number): string {
  if (minutes > 0 && minutes < 60) return `${minutes} хв`;
  const h = Math.round((minutes / 60) * 10) / 10;
  return `${String(h).replace('.', ',')} год`;
}
