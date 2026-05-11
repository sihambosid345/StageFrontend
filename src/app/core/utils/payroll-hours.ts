/** 44 h/semaine × 52 semaines / 12 mois (lissage annuel). */
export const STANDARD_WEEKLY_HOURS = 44;
export const WEEKS_PER_YEAR = 52;

export function monthlyHoursFromWeekly(weekly: number = STANDARD_WEEKLY_HOURS): number {
  const w = Number(weekly);
  if (!Number.isFinite(w) || w <= 0) {
    return Number(((STANDARD_WEEKLY_HOURS * WEEKS_PER_YEAR) / 12).toFixed(2));
  }
  return Number(((w * WEEKS_PER_YEAR) / 12).toFixed(2));
}

/** Taux horaire : salaire mensuel ÷ (heures mois + heures sup. incluses dans le dénominateur). */
export function hourlyRateFromMonthlySalary(
  monthlySalary: number,
  monthlyHours: number,
  overtimeHoursForRate: number = 0
): number {
  const h = Number(monthlyHours);
  const sup = Number(overtimeHoursForRate) || 0;
  const denom = h + sup;
  if (!Number.isFinite(monthlySalary) || !Number.isFinite(denom) || denom <= 0) return 0;
  return Number((monthlySalary / denom).toFixed(4));
}
