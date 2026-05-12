/** 44 h/semaine × 52 semaines / 12 mois (lissage annuel). */
export const STANDARD_WEEKLY_HOURS = 44;
export const WEEKS_PER_YEAR = 52;

/** Heures/mois par défaut (formule légale marocaine : 44 × 52 / 12 ≈ 190,67). */
export const DEFAULT_MONTHLY_HOURS = Number(((STANDARD_WEEKLY_HOURS * WEEKS_PER_YEAR) / 12).toFixed(2));

export function monthlyHoursFromWeekly(weekly: number = STANDARD_WEEKLY_HOURS): number {
  const w = Number(weekly);
  if (!Number.isFinite(w) || w <= 0) {
    return Number(((STANDARD_WEEKLY_HOURS * WEEKS_PER_YEAR) / 12).toFixed(2));
  }
  return Number(((w * WEEKS_PER_YEAR) / 12).toFixed(2));
}

/**
 * Taux horaire = Salaire mensuel ÷ Heures travaillées par mois
 *
 * @param monthlySalary      Salaire brut mensuel (MAD)
 * @param monthlyHours       Heures travaillées par mois (défaut : 190,67)
 * @param overtimeHoursForRate Heures sup. ajoutées au dénominateur (optionnel)
 */
export function hourlyRateFromMonthlySalary(
  monthlySalary: number,
  monthlyHours?: number | null,
  overtimeHoursForRate?: number | null
): number {
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) return 0;

  const baseHours = (monthlyHours != null && Number.isFinite(monthlyHours) && monthlyHours > 0)
    ? Number(monthlyHours)
    : DEFAULT_MONTHLY_HOURS;

  const overtimeH = (overtimeHoursForRate != null && Number.isFinite(overtimeHoursForRate) && overtimeHoursForRate > 0)
    ? Number(overtimeHoursForRate)
    : 0;

  const denominator = baseHours + overtimeH;
  if (denominator <= 0) return 0;

  return Number((monthlySalary / denominator).toFixed(4));
}