// ─── Enums & Types ────────────────────────────────────────────────────────────

export type CompanyStatus    = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type UserStatus       = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type EmployeeStatus   = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'LEFT';
export type Gender            = 'MALE' | 'FEMALE';
export type ContractType      = 'CDI' | 'CDD' | 'STAGE' | 'INTERIM' | 'FREELANCE' | 'OTHER';
export type ContractStatus    = 'DRAFT' | 'ACTIVE' | 'ENDED' | 'SUSPENDED' | 'TERMINATED';

// Correction 9 : types de calcul salaire
export type SalaryCalculationType = 'MONTHLY' | 'DAILY' | 'HOURLY' | 'MISSION';

export type PayrollPeriodStatus = 'OPEN' | 'PROCESSING' | 'CLOSED' | 'LOCKED';
export type PayrollPeriodType   = 'MONTHLY' | 'WEEKLY' | 'CUSTOM';
export type PayrollRunStatus    = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

// Correction 11 : PayrollItemType étendu
export type PayrollItemType =
  | 'BASE_SALARY'
  | 'ALLOWANCE'
  | 'BONUS'
  | 'OVERTIME'
  | 'DEDUCTION'
  | 'ADVANCE'
  | 'TAX'
  | 'CNSS'
  | 'AMO'
  | 'OTHER';

// Types variable métier (aligné Prisma backend)
export type VariableItemType =
  | 'COMMISSION'
  | 'FRAIS'
  | 'AVANCE'
  | 'RETENUE'
  | 'PRIME';

// Correction 13 : labels centralisés — plus de hardcoding dans les templates
export const VARIABLE_ITEM_TYPE_LABELS: Record<VariableItemType, string> = {
  COMMISSION: 'Commission',
  FRAIS:      'Frais',
  AVANCE:     'Avance',
  RETENUE:    'Retenue',
  PRIME:      'Prime',
};

// Correction 13 : mapping isGain (duplicated from backend for UI logic)
export const VARIABLE_ITEM_IS_GAIN: Record<VariableItemType, boolean> = {
  COMMISSION: true,
  FRAIS:      true,
  PRIME:      true,
  AVANCE:     false,  // n'augmente pas le brut
  RETENUE:    false,  // n'augmente pas le brut
};

export type VariableValueType  = 'FIXED' | 'PERCENTAGE' | 'HOURS' | 'DAYS';
export type VariableItemStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'CANCELLED';

export type RecurringItemType =
  | 'TRANSPORT'
  | 'ANCIENNETE'
  | 'INDEMNITE'
  | 'REPRESENTATION'
  | 'LOGEMENT'
  | 'TELEPHONE'
  | 'PANIER'
  | 'OTHER';

export type RecurringValueType = 'FIXED' | 'PERCENTAGE' | 'SENIORITY_SCALE';
export type AttendanceStatus   = 'PRESENT' | 'ABSENT' | 'SICK_LEAVE' | 'PAID_LEAVE' | 'UNPAID_LEAVE' | 'HOLIDAY' | 'OTHER';
export type PayslipStatus      = 'DRAFT' | 'GENERATED' | 'SENT' | 'CANCELLED';
export type LicensePlanCode    = 'BASIC' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
export type LicenseStatus      = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
export type BillingCycle       = 'MONTHLY' | 'YEARLY' | 'LIFETIME';
export type PayrollRegime      = 'MOROCCO_STANDARD' | 'MAROC_TRANSPORT' | 'MOROCCO_OFFSHORE' | 'MOROCCO_AGRICULTURAL';

// Correction 1 : type pour les taux légaux
export type ContributionCode =
  | 'CNSS_EMPLOYEE' | 'CNSS_EMPLOYER'
  | 'AMO_EMPLOYEE'  | 'AMO_EMPLOYER'
  | 'TRAINING_TAX'  | 'FAMILY_ALLOWANCE' | 'SOCIAL_BENEFITS'
  | 'DAMANCOM'      | 'CIMR_EMPLOYEE'    | 'CIMR_EMPLOYER';

// ─── Options dropdown ─────────────────────────────────────────────────────────

export const COMPANY_STATUS_OPTIONS:         CompanyStatus[]          = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
export const USER_STATUS_OPTIONS:            UserStatus[]             = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
export const EMPLOYEE_STATUS_OPTIONS:        EmployeeStatus[]         = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LEFT'];
export const GENDER_OPTIONS:                 Gender[]                 = ['MALE', 'FEMALE'];
export const CONTRACT_TYPE_OPTIONS:          ContractType[]           = ['CDI', 'CDD', 'STAGE', 'INTERIM', 'FREELANCE', 'OTHER'];
export const CONTRACT_STATUS_OPTIONS:        ContractStatus[]         = ['DRAFT', 'ACTIVE', 'ENDED', 'SUSPENDED', 'TERMINATED'];
export const SALARY_CALCULATION_TYPE_OPTIONS: SalaryCalculationType[] = ['MONTHLY', 'DAILY', 'HOURLY', 'MISSION'];
export const PAYROLL_PERIOD_TYPE_OPTIONS:    PayrollPeriodType[]      = ['MONTHLY', 'WEEKLY', 'CUSTOM'];
export const PAYROLL_PERIOD_STATUS_OPTIONS:  PayrollPeriodStatus[]    = ['OPEN', 'PROCESSING', 'CLOSED', 'LOCKED'];
export const PAYROLL_RUN_STATUS_OPTIONS:     PayrollRunStatus[]       = ['DRAFT', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
export const PAYROLL_ITEM_TYPE_OPTIONS:      PayrollItemType[]        = ['BASE_SALARY', 'ALLOWANCE', 'BONUS', 'OVERTIME', 'DEDUCTION', 'ADVANCE', 'TAX', 'CNSS', 'AMO', 'OTHER'];
export const VARIABLE_ITEM_TYPE_OPTIONS:     VariableItemType[]       = ['COMMISSION', 'FRAIS', 'AVANCE', 'RETENUE', 'PRIME'];
export const VARIABLE_VALUE_TYPE_OPTIONS:    VariableValueType[]      = ['FIXED', 'PERCENTAGE', 'HOURS', 'DAYS'];
export const VARIABLE_ITEM_STATUS_OPTIONS:   VariableItemStatus[]     = ['PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED'];
export const RECURRING_ITEM_TYPE_OPTIONS:    RecurringItemType[]      = ['TRANSPORT', 'ANCIENNETE', 'INDEMNITE', 'REPRESENTATION', 'LOGEMENT', 'TELEPHONE', 'PANIER', 'OTHER'];
export const ATTENDANCE_STATUS_OPTIONS:      AttendanceStatus[]       = ['PRESENT', 'ABSENT', 'SICK_LEAVE', 'PAID_LEAVE', 'UNPAID_LEAVE', 'HOLIDAY', 'OTHER'];
export const PAYSLIP_STATUS_OPTIONS:         PayslipStatus[]          = ['DRAFT', 'GENERATED', 'SENT', 'CANCELLED'];
export const LICENSE_PLAN_OPTIONS:           LicensePlanCode[]        = ['BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE'];
export const LICENSE_STATUS_OPTIONS:         LicenseStatus[]          = ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'];
export const BILLING_CYCLE_OPTIONS:          BillingCycle[]           = ['MONTHLY', 'YEARLY', 'LIFETIME'];
export const PAYROLL_REGIME_OPTIONS:         PayrollRegime[]          = ['MOROCCO_STANDARD', 'MAROC_TRANSPORT', 'MOROCCO_OFFSHORE', 'MOROCCO_AGRICULTURAL'];
export const CURRENCY_OPTIONS:               string[]                 = ['MAD', 'EUR', 'USD', 'GBP'];

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  legalName?: string | null;
  taxIdentifier?: string | null;
  rcNumber?: string | null;
  iceNumber?: string | null;
  cnssNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
  currency?: string | null;
  status: CompanyStatus;
  createdAt: string;
  updatedAt: string;
}
export interface CreateCompanyPayload {
  name: string;
  legalName?: string;
  taxIdentifier?: string;
  rcNumber?: string;
  iceNumber?: string;
  cnssNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  status?: CompanyStatus;
}
export type UpdateCompanyPayload = Partial<CreateCompanyPayload>;

export interface CreateCompanyWithLicenseAndUsersPayload {
  company: CreateCompanyPayload;
  license: Omit<CreateLicensePayload, 'companyId'>;
  users: Array<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
    status?: string;
    permissions?: string[];
  }>;
}

export interface User {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  firstName: string;
  lastName: string;
  fullName?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  status: UserStatus;
  permissions?: string[];
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateUserPayload {
  companyId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
  status?: UserStatus;
}
export interface UpdateUserPayload extends Partial<Omit<CreateUserPayload, 'password'>> {
  password?: string;
}

export interface Department {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateDepartmentPayload {
  companyId: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}
export type UpdateDepartmentPayload = Partial<Omit<CreateDepartmentPayload, 'companyId'>>;

export interface Position {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  departmentId?: string | null;
  department?: Pick<Department, 'id' | 'name'> | null;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePositionPayload {
  companyId: string;
  name: string;
  departmentId?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}
export type UpdatePositionPayload = Partial<Omit<CreatePositionPayload, 'companyId'>>;

export interface Employee {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeCode?: string | null;
  firstName: string;
  lastName: string;
  fullName?: string | null;
  cin?: string | null;
  cnssNumber?: string | null;
  matricule?: string | null;
  gender?: Gender | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  hireDate: string;
  terminationDate?: string | null;
  status: EmployeeStatus;
  departmentId?: string | null;
  department?: Pick<Department, 'id' | 'name'> | null;
  positionId?: string | null;
  position?: Pick<Position, 'id' | 'name'> | null;
  baseSalary?: number | null;
  paymentMode?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateEmployeePayload {
  companyId: string;
  firstName: string;
  lastName: string;
  hireDate: string;
  employeeCode?: string;
  fullName?: string;
  cin?: string;
  cnssNumber?: string;
  matricule?: string;
  gender?: Gender;
  birthDate?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  terminationDate?: string;
  status?: EmployeeStatus;
  departmentId?: string;
  positionId?: string;
  baseSalary?: number;
  paymentMode?: string;
  bankName?: string;
  bankAccountNumber?: string;
}
export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'companyId'>>;

export interface EmployeeContract {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  contractType: ContractType;
  status: ContractStatus;
  salaryCalculationType?: SalaryCalculationType | null; // Correction 9
  startDate: string;
  endDate?: string | null;
  baseSalary: number;
  baseRate?: number | null; // Correction 9
  hoursPerMonth?: number | null;
  workingDaysPerMonth?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateContractPayload {
  companyId: string;
  employeeId: string;
  contractType: ContractType;
  startDate: string;
  baseSalary: number;
  baseRate?: number;
  salaryCalculationType?: SalaryCalculationType;
  status?: ContractStatus;
  endDate?: string;
  hoursPerMonth?: number;
  workingDaysPerMonth?: number;
  notes?: string;
}
export type UpdateContractPayload = Partial<Omit<CreateContractPayload, 'companyId' | 'employeeId'>>;

export interface PayrollConfig {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name' | 'status'>;
  regime: PayrollRegime;
  currency: string;
  weeklyHours: number | null;
  monthlyHours: number | null;
  overtimeHoursForRate?: number | null;
  workingDaysPerMonth: number | null;
  cnssEnabled: boolean;
  amoEnabled: boolean;
  irEnabled: boolean;
  cimrEnabled: boolean;
  damancomEnabled?: boolean;
  defaultCnssDeclaredDays: number | null;
  payslipTemplate?: string | null;
  notes?: string | null;
  dateEffet: string;
  isActive: boolean;
  version: number;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayrollConfigPayload {
  companyId: string;
  regime?: PayrollRegime;
  currency?: string;
  weeklyHours?: number;
  monthlyHours?: number;
  overtimeHoursForRate?: number | null;
  workingDaysPerMonth?: number;
  cnssEnabled?: boolean;
  amoEnabled?: boolean;
  irEnabled?: boolean;
  cimrEnabled?: boolean;
  damancomEnabled?: boolean;
  defaultCnssDeclaredDays?: number;
  payslipTemplate?: string;
  notes?: string;
  dateEffet: string;
  isActive?: boolean;
  version?: number;
  createdById?: string;
}
export type UpdatePayrollConfigPayload = Partial<Omit<CreatePayrollConfigPayload, 'companyId'>>;

// ─── Correction 1 : StatutoryRate ─────────────────────────────────────────────
export interface StatutoryRate {
  id: string;
  companyId?: string | null;
  code: ContributionCode;
  label: string;
  rate: number;
  ceilingAmount?: number | null;
  floorAmount?: number | null;
  appliesToTaxable: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateStatutoryRatePayload {
  companyId?: string;
  code: ContributionCode;
  label: string;
  rate: number;
  ceilingAmount?: number;
  floorAmount?: number;
  appliesToTaxable?: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
}
export type UpdateStatutoryRatePayload = Partial<Omit<CreateStatutoryRatePayload, 'companyId'>>;

// ─── Correction 2 : TaxBracket ────────────────────────────────────────────────
export interface TaxBracket {
  id: string;
  companyId?: string | null;
  taxCode: string;
  annualFrom: number;
  annualTo?: number | null;
  rate: number;
  deductionAmount: number;
  // Champs calculés (mensuels) — renvoyés par le service
  min?: number;
  max?: number | null;
  deduction?: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface CreateTaxBracketPayload {
  companyId?: string;
  taxCode?: string;
  annualFrom: number;
  annualTo?: number;
  rate: number;
  deductionAmount?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
}
export type UpdateTaxBracketPayload = Partial<Omit<CreateTaxBracketPayload, 'companyId'>>;

// ─── Payroll Run ──────────────────────────────────────────────────────────────
export interface PayrollRun {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  payrollPeriodId: string;
  payrollPeriod?: Pick<PayrollPeriod, 'id' | 'year' | 'month'>;
  runNumber: number;
  status: PayrollRunStatus;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployerCharges?: number;
  totalEmployeeCharges?: number;
  totalTax?: number;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  approvedById?: string | null;
  approvedBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  approvedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayrollRunPayload {
  companyId: string;
  payrollPeriodId: string;
  runNumber?: number;
  status?: PayrollRunStatus;
  notes?: string;
  createdById?: string;
}
export type UpdatePayrollRunPayload = Partial<Omit<CreatePayrollRunPayload, 'companyId' | 'payrollPeriodId'>>;

// Résultat du calcul moteur (POST /payroll-calculation/run/:id)
export interface PayrollRunResult {
  runId: string;
  totalEmployees: number;
  processed: number;
  errors: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  totalErCharges: number;
  results: PayrollEmployeeResult[];
}
export interface PayrollEmployeeResult {
  employeeId: string;
  employeeName: string;
  baseSalary?: number;
  grossSalary?: number;
  cnssGross?: number;
  amoGross?: number;
  taxableGross?: number;
  cnssBase?: number;
  cnssEmpAmount?: number;
  amoEmpAmount?: number;
  irAmount?: number;
  totalEmpCharges?: number;
  totalDeductions?: number;
  netSalary?: number;
  totalErCharges?: number;
  payslipId?: string;
  error?: string;
}

export interface PayrollPeriod {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  type: PayrollPeriodType;
  status: PayrollPeriodStatus;
  isLocked: boolean;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayrollPeriodPayload {
  companyId: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  type?: PayrollPeriodType;
  status?: PayrollPeriodStatus;
  isLocked?: boolean;
  notes?: string;
  createdById?: string;
}
export type UpdatePayrollPeriodPayload = Partial<Omit<CreatePayrollPeriodPayload, 'companyId'>>;

// ─── Correction 11 & 12 : PayrollItem nouvelle structure ─────────────────────
export interface PayrollItem {
  id: string;
  companyId: string;
  payrollRunId: string;
  payrollRun?: Pick<PayrollRun, 'id' | 'runNumber' | 'status'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  itemType: PayrollItemType;
  code?: string | null;    // Correction 11 : code lisible machine
  label: string;           // Correction 11 : label lisible humain
  quantity?: number | null;
  rate?: number | null;
  amount: number;
  taxable: boolean;
  cnssApplicable: boolean;
  amoApplicable?: boolean; // Correction 6
  sortOrder: number;
  metadata?: Record<string, unknown> | null; // contient source: BASE|RECURRING|VARIABLE|STATUTORY
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayrollItemPayload {
  companyId: string;
  payrollRunId: string;
  employeeId: string;
  itemType: PayrollItemType;
  label: string;
  amount: number;
  code?: string;
  quantity?: number;
  rate?: number;
  taxable?: boolean;
  cnssApplicable?: boolean;
  amoApplicable?: boolean;
  sortOrder?: number;
}
export type UpdatePayrollItemPayload = Partial<Omit<CreatePayrollItemPayload, 'companyId' | 'payrollRunId' | 'employeeId'>>;

export interface VariableItem {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  type: VariableItemType;
  valueType: VariableValueType;
  code?: string | null;
  label: string;
  quantity?: number | null;
  unitValue?: number | null;
  percentageValue?: number | null;
  amount: number;
  effectiveDate: string;
  payrollPeriodId?: string | null;
  status: VariableItemStatus;
  notes?: string | null;
  isTaxable?: boolean;
  isCnssApplicable?: boolean;
  isAmoApplicable?: boolean; // Correction 6
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateVariableItemPayload {
  companyId: string;
  employeeId: string;
  type: VariableItemType;
  label: string;
  amount: number;
  effectiveDate: string;
  valueType?: VariableValueType;
  code?: string;
  quantity?: number;
  unitValue?: number;
  percentageValue?: number;
  payrollPeriodId?: string;
  status?: VariableItemStatus;
  notes?: string;
  isTaxable?: boolean;
  isCnssApplicable?: boolean;
  isAmoApplicable?: boolean;
  createdById?: string;
}
export type UpdateVariableItemPayload = Partial<Omit<CreateVariableItemPayload, 'companyId' | 'employeeId'>>;

export interface EmployeeRecurringItem {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  type: RecurringItemType;
  valueType: RecurringValueType;
  code?: string | null;
  label: string;
  amount?: number | null;
  percentageValue?: number | null;
  seniorityRules?: Record<string, unknown> | null;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  isCnssApplicable: boolean;
  isAmoApplicable?: boolean; // Correction 6
  isTaxable: boolean;
  notes?: string | null;
  createdById?: string | null;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateEmployeeRecurringItemPayload {
  companyId: string;
  employeeId: string;
  type: RecurringItemType;
  label: string;
  valueType?: RecurringValueType;
  amount?: number;
  percentageValue?: number;
  seniorityRules?: Record<string, unknown>;
  isTaxable?: boolean;
  isCnssApplicable?: boolean;
  isAmoApplicable?: boolean;
  isActive?: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
  createdById?: string;
}
export type UpdateEmployeeRecurringItemPayload = Partial<Omit<CreateEmployeeRecurringItemPayload, 'companyId' | 'employeeId'>>;

export interface AttendanceRecord {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  date: string;
  status: AttendanceStatus;
  workedHours?: number | null;
  overtimeHours?: number | null;
  lateMinutes?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateAttendancePayload {
  companyId: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  workedHours?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  notes?: string;
}
export type UpdateAttendancePayload = Partial<Omit<CreateAttendancePayload, 'companyId' | 'employeeId' | 'date'>>;

// ─── Correction 12 : Payslip avec bases distinctes ───────────────────────────
export interface Payslip {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  employeeId: string;
  employee?: Pick<Employee, 'id' | 'firstName' | 'lastName'>;
  payrollPeriodId: string;
  payrollPeriod?: Pick<PayrollPeriod, 'id' | 'year' | 'month'>;
  payrollRunId?: string | null;
  payrollRun?: Pick<PayrollRun, 'id' | 'runNumber'> | null;
  status: PayslipStatus;
  grossSalary: number;       // Correction 12 : Total gains
  taxableGross: number;      // Correction 5  : Soumis IR
  cnssGross?: number;        // Correction 4  : Soumis CNSS (avant plafond)
  amoGross?: number;         // Correction 6  : Soumis AMO
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalAdvances: number;
  totalTax: number;
  totalCnss: number;
  netSalary: number;
  cnssBase?: number;
  cnssCeilingApplied?: number | null;
  amoBase?: number;
  employerChargesTotal?: number;
  employeeChargesTotal?: number;
  incomeTaxBase?: number;
  incomeTaxAmount?: number;
  declaredDays?: number | null;
  currency?: string | null;
  pdfPath?: string | null;
  pdfGeneratedAt?: string | null;
  sentAt?: string | null;
  snapshotData?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayslipPayload {
  companyId: string;
  employeeId: string;
  payrollPeriodId: string;
  payrollRunId?: string;
  status?: PayslipStatus;
  grossSalary?: number;
  taxableGross?: number;
  cnssGross?: number;
  amoGross?: number;
  totalAllowances?: number;
  totalBonuses?: number;
  totalDeductions?: number;
  totalAdvances?: number;
  totalTax?: number;
  totalCnss?: number;
  netSalary?: number;
  currency?: string;
}
export type UpdatePayslipPayload = Partial<Omit<CreatePayslipPayload, 'companyId' | 'employeeId' | 'payrollPeriodId'>>;

export interface License {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  planCode: LicensePlanCode;
  status: LicenseStatus;
  billingCycle: BillingCycle;
  maxUsers?: number | null;
  maxEmployees?: number | null;
  maxStorageMb?: number | null;
  payrollEnabled: boolean;
  rhEnabled: boolean;
  cnssEnabled: boolean;
  taxEnabled: boolean;
  damancomEnabled: boolean;
  cimrEnabled?: boolean;
  availableRegimes?: string[];
  startsAt: string;
  endsAt?: string | null;
  lastRenewedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CreateLicensePayload {
  companyId: string;
  planCode: LicensePlanCode;
  startsAt: string;
  status?: LicenseStatus;
  billingCycle?: BillingCycle;
  maxUsers?: number;
  maxEmployees?: number;
  maxStorageMb?: number;
  payrollEnabled?: boolean;
  rhEnabled?: boolean;
  cnssEnabled?: boolean;
  taxEnabled?: boolean;
  damancomEnabled?: boolean;
  endsAt?: string;
  notes?: string;
}
export type UpdateLicensePayload = Partial<Omit<CreateLicensePayload, 'companyId'>>;

export interface AuditLog {
  id: string;
  companyId: string;
  company?: Pick<Company, 'id' | 'name'>;
  userId?: string | null;
  user?: Pick<User, 'id' | 'firstName' | 'lastName'> | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiError { error: string; }
export type ApiResponse<T> = T | ApiError;
export interface FormErrors { [key: string]: string; }

export function validateRequired(form: Record<string, unknown>, fields: string[]): FormErrors {
  const errors: FormErrors = {};
  for (const field of fields) {
    const val = form[field];
    if (val === null || val === undefined || String(val).trim() === '') {
      errors[field] = 'Ce champ est obligatoire';
    }
  }
  return errors;
}

// Alias rétrocompatibilité
export type Attendance = AttendanceRecord;