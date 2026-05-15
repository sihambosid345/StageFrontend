// ============================================================
// PAYROLL ENGINE — CORE MODELS
// Corresponds to Prisma schema tables
// ============================================================

export type SalaryCalculationType = 'MONTHLY' | 'DAILY' | 'HOURLY' | 'MISSION';
export type PayrollRunStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'LOCKED' | 'CANCELLED';
export type VariableStatus = 'PENDING' | 'APPLIED' | 'REJECTED';
export type PayrollItemSource = 'BASE' | 'VARIABLE' | 'STATUTORY' | 'MANUAL';

export interface StatutoryRate {
  id: string;
  code: string;                   // e.g. 'CNSS_EMPLOYEE', 'CNSS_EMPLOYER', 'AMO_EMPLOYEE'
  label: string;
  rate: number;                   // percentage, e.g. 4.48
  ceiling?: number;               // plafond mensuel CNSS
  effectiveFrom: Date;
  effectiveTo?: Date;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaxBracket {
  id: string;
  periodYear: number;             // exercice fiscal
  minIncome: number;
  maxIncome?: number;             // null = illimité
  rate: number;                   // taux marginal IR %
  fixedDeduction: number;         // déduction fixe
  effectiveFrom: Date;
  effectiveTo?: Date;
  version: number;
  isActive: boolean;
}

export interface PayrollItem {
  id?: string;
  payslipId?: string;
  type: string;                   // 'EARNING' | 'DEDUCTION' | 'STATUTORY' | 'ADVANCE' | 'EXPENSE'
  source: PayrollItemSource;
  code: string;                   // e.g. 'BASE_SALARY', 'CNSS_EMP', 'IR', 'ADVANCE'
  label: string;
  amount: number;
  isTaxable: boolean;
  isCnssApplicable: boolean;
  isAmoApplicable: boolean;
  isGross: boolean;               // contribue au brut ?
}

export interface PayrollBases {
  grossSalary: number;            // somme des gains uniquement
  taxableGross: number;           // soumis IR
  cnssGross: number;              // soumis CNSS (avec plafond)
  amoGross: number;               // soumis AMO
}

export interface PayrollContributions {
  cnssEmployee: number;
  cnssEmployer: number;
  amoEmployee: number;
  amoEmployer: number;
  ir: number;
  irDetails: IRCalculationDetail[];
}

export interface IRCalculationDetail {
  bracket: TaxBracket;
  taxableAmount: number;
  tax: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  payrollRunId: string;
  period: string;                 // 'YYYY-MM'
  calculationType: SalaryCalculationType;

  // bases séparées
  bases: PayrollBases;

  // cotisations
  contributions: PayrollContributions;

  // net
  netSalary: number;
  netPayable: number;

  items: PayrollItem[];
  status: PayrollRunStatus;
  createdAt: Date;
}

export interface PayrollRun {
  id: string;
  period: string;
  status: PayrollRunStatus;
  employeeCount: number;
  totalGross: number;
  totalNet: number;
  totalCnss: number;
  totalIr: number;
  createdAt: Date;
  completedAt?: Date;
  payslips?: Payslip[];
}

export interface Employee {
  id: string;
  matricule: string;
  fullName: string;
  department: string;
  position: string;
  salaryType: SalaryCalculationType;
  baseSalary: number;
  dailyRate?: number;
  hourlyRate?: number;
  missionRate?: number;
  hireDate: Date;
}

export interface SalaryVariable {
  id: string;
  employeeId: string;
  type: string;                   // mapped via ITEM_TYPE_MAPPING
  code: string;
  label: string;
  amount: number;
  status: VariableStatus;
  isTaxable: boolean;
  isCnssApplicable: boolean;
  isAmoApplicable: boolean;
  isGross: boolean;
  period: string;
}

// Mapping centralisé des types d'éléments de salaire
export const ITEM_TYPE_MAPPING: Record<string, Partial<PayrollItem>> = {
  'BASE_SALARY':    { type: 'EARNING',    code: 'BASE_SALARY',   label: 'Salaire de base',       isTaxable: true,  isCnssApplicable: true,  isAmoApplicable: true,  isGross: true  },
  'OVERTIME':       { type: 'EARNING',    code: 'OVERTIME',      label: 'Heures supplémentaires', isTaxable: true,  isCnssApplicable: true,  isAmoApplicable: true,  isGross: true  },
  'COMMISSION':     { type: 'EARNING',    code: 'COMMISSION',    label: 'Commission',             isTaxable: true,  isCnssApplicable: true,  isAmoApplicable: true,  isGross: true  },
  'BONUS':          { type: 'EARNING',    code: 'BONUS',         label: 'Prime',                  isTaxable: true,  isCnssApplicable: false, isAmoApplicable: false, isGross: true  },
  'MEAL_ALLOWANCE': { type: 'EXPENSE',    code: 'MEAL_ALLOWANCE',label: 'Indemnité repas',        isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false },
  'TRANSPORT':      { type: 'EXPENSE',    code: 'TRANSPORT',     label: 'Frais de transport',     isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false },
  'ADVANCE':        { type: 'ADVANCE',    code: 'ADVANCE',       label: 'Avance sur salaire',     isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false },
  'ABSENCE':        { type: 'DEDUCTION',  code: 'ABSENCE',       label: 'Retenue absence',        isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false },
  'CNSS_EMP':       { type: 'STATUTORY',  code: 'CNSS_EMP',      label: 'Cotisation CNSS salarié',isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false },
  'AMO_EMP':        { type: 'STATUTORY',  code: 'AMO_EMP',       label: 'Cotisation AMO salarié', isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false },
  'IR':             { type: 'STATUTORY',  code: 'IR',            label: 'Impôt sur le Revenu',    isTaxable: false, isCnssApplicable: false, isAmoApplicable: false, isGross: false },
};