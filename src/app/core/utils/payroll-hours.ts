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

/** Taux horaire : salaire mensuel ÷ 190,67 (formule légale marocaine). */
export function hourlyRateFromMonthlySalary(
  monthlySalary: number,
  _monthlyHours?: number,
  _overtimeHoursForRate?: number
): number {
  const FIXED_DENOMINATOR = 190.67;
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) return 0;
  return Number((monthlySalary / FIXED_DENOMINATOR).toFixed(4));
}
