// ============================================================
// payroll-engine.service.ts
// Moteur de calcul FRONTEND (preview/simulation côté client)
// Miroir de la logique backend — pour affichage en temps réel
// ============================================================
import { Injectable } from '@angular/core';
import {
  StatutoryRate, TaxBracket, SalaryVariable, PayrollBases,
  PayrollContributions, PayrollItem, IRCalculationDetail,
  ITEM_TYPE_MAPPING, Payslip, Employee
} from '../models/payroll.models';

@Injectable({ providedIn: 'root' })
export class PayrollEngineService {

  /**
   * Calcule les bases séparées depuis les éléments de salaire.
   * NE PAS inclure avances/retenues/frais dans le brut.
   */
  calculateBases(items: SalaryVariable[]): PayrollBases {
    let grossSalary  = 0;   // gains uniquement (isGross = true)
    let taxableGross = 0;   // isTaxable = true
    let cnssGross    = 0;   // isCnssApplicable = true
    let amoGross     = 0;   // isAmoApplicable = true

    for (const item of items) {
      const mapping = ITEM_TYPE_MAPPING[item.code] ?? {};
      const isGross          = item.isGross ?? mapping.isGross ?? false;
      const isTaxable        = item.isTaxable ?? mapping.isTaxable ?? false;
      const isCnssApplicable = item.isCnssApplicable ?? mapping.isCnssApplicable ?? false;
      const isAmoApplicable  = item.isAmoApplicable ?? mapping.isAmoApplicable ?? false;

      // Seuls les GAINS entrent dans le brut
      if (isGross)          grossSalary  += item.amount;
      if (isTaxable)        taxableGross += item.amount;
      if (isCnssApplicable) cnssGross    += item.amount;
      if (isAmoApplicable)  amoGross     += item.amount;
    }

    return { grossSalary, taxableGross, cnssGross, amoGross };
  }

  /**
   * Calcule les cotisations depuis les bases et les taux dynamiques DB.
   */
  calculateContributions(
    bases: PayrollBases,
    rates: StatutoryRate[],
    brackets: TaxBracket[]
  ): PayrollContributions {
    const getRateValue = (code: string): number => {
      const rate = rates.find(r => r.code === code && r.isActive);
      return rate ? rate.rate / 100 : 0;
    };

    const getCeiling = (code: string): number | undefined => {
      return rates.find(r => r.code === code && r.isActive)?.ceiling;
    };

    // CNSS — avec plafond
    const cnssCeiling      = getCeiling('CNSS_EMPLOYEE');
    const cnssBase         = cnssCeiling ? Math.min(bases.cnssGross, cnssCeiling) : bases.cnssGross;
    const cnssEmployee     = cnssBase * getRateValue('CNSS_EMPLOYEE');
    const cnssEmployer     = cnssBase * getRateValue('CNSS_EMPLOYER');

    // AMO
    const amoEmployee      = bases.amoGross * getRateValue('AMO_EMPLOYEE');
    const amoEmployer      = bases.amoGross * getRateValue('AMO_EMPLOYER');

    // IR — barème progressif depuis DB
    const irResult         = this.calculateIR(bases.taxableGross - cnssEmployee - amoEmployee, brackets);

    return {
      cnssEmployee,
      cnssEmployer,
      amoEmployee,
      amoEmployer,
      ir: irResult.totalIR,
      irDetails: irResult.details
    };
  }

  /**
   * Calcul IR progressif sur barème dynamique.
   */
  calculateIR(
    netTaxableIncome: number,
    brackets: TaxBracket[]
  ): { totalIR: number; details: IRCalculationDetail[] } {
    const sorted = [...brackets].sort((a, b) => a.minIncome - b.minIncome);
    let remaining = Math.max(0, netTaxableIncome);
    let totalIR = 0;
    const details: IRCalculationDetail[] = [];

    for (const bracket of sorted) {
      if (remaining <= 0) break;
      const bracketMin = bracket.minIncome;
      const bracketMax = bracket.maxIncome ?? Infinity;
      if (netTaxableIncome < bracketMin) break;

      const taxableInBracket = Math.min(remaining, bracketMax - bracketMin);
      const tax = taxableInBracket * (bracket.rate / 100) - (bracket.fixedDeduction / 12);
      const taxForBracket = Math.max(0, tax);

      totalIR += taxForBracket;
      details.push({ bracket, taxableAmount: taxableInBracket, tax: taxForBracket });
      remaining -= taxableInBracket;
    }

    return { totalIR: Math.max(0, totalIR), details };
  }

  /**
   * Calcule le brut selon le type de contrat.
   */
  calculateBaseSalaryByType(
    employee: Employee,
    period: { days?: number; hours?: number; missions?: number }
  ): number {
    switch (employee.salaryType) {
      case 'MONTHLY':
        return employee.baseSalary;
      case 'DAILY':
        return (employee.dailyRate ?? 0) * (period.days ?? 0);
      case 'HOURLY':
        return (employee.hourlyRate ?? 0) * (period.hours ?? 0);
      case 'MISSION':
        return (employee.missionRate ?? 0) * (period.missions ?? 0);
      default:
        return employee.baseSalary;
    }
  }

  /**
   * Construit la liste des PayrollItems depuis les variables et cotisations.
   */
  buildPayrollItems(
    baseSalary: number,
    variables: SalaryVariable[],
    contributions: PayrollContributions
  ): PayrollItem[] {
    const items: PayrollItem[] = [];

    // Salaire de base
    items.push({
      type: 'EARNING', source: 'BASE', code: 'BASE_SALARY',
      label: 'Salaire de base', amount: baseSalary,
      isTaxable: true, isCnssApplicable: true, isAmoApplicable: true, isGross: true
    });

    // Variables salariales (PENDING seulement — pas encore APPLIED)
    for (const v of variables.filter(v => v.status === 'PENDING')) {
      const mapping = ITEM_TYPE_MAPPING[v.code] ?? {};
      items.push({
        type: mapping.type ?? 'EARNING',
        source: 'VARIABLE',
        code: v.code,
        label: v.label,
        amount: v.amount,
        isTaxable: v.isTaxable,
        isCnssApplicable: v.isCnssApplicable,
        isAmoApplicable: v.isAmoApplicable,
        isGross: v.isGross
      });
    }

    // Cotisations statutaires
    if (contributions.cnssEmployee > 0)
      items.push({ type: 'STATUTORY', source: 'STATUTORY', code: 'CNSS_EMP', label: 'CNSS Salarié', amount: -contributions.cnssEmployee, isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false });
    if (contributions.amoEmployee > 0)
      items.push({ type: 'STATUTORY', source: 'STATUTORY', code: 'AMO_EMP', label: 'AMO Salarié', amount: -contributions.amoEmployee, isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false });
    if (contributions.ir > 0)
      items.push({ type: 'STATUTORY', source: 'STATUTORY', code: 'IR', label: 'Impôt sur le Revenu', amount: -contributions.ir, isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false });

    return items;
  }

  /**
   * Calcule le net à payer depuis les items.
   */
  calculateNetPayable(baseSalary: number, variables: SalaryVariable[], contributions: PayrollContributions): number {
    const items = this.buildPayrollItems(baseSalary, variables, contributions);
    // gains - cotisations - retenues - avances
    return items.reduce((sum, item) => {
      if (item.type === 'EARNING' || item.type === 'EXPENSE') return sum + item.amount;
      if (item.type === 'STATUTORY' || item.type === 'DEDUCTION' || item.type === 'ADVANCE') return sum + item.amount; // déjà négatif
      return sum;
    }, 0);
  }
}